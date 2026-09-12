from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Generic base repository defining standard data access operations.
    
    Provides CRUD methods with centralized support for tenant isolation filtering.
    """

    def __init__(self, model: Type[ModelType]):
        self.model = model

    def _apply_tenant_filter(self, statement: Any, tenant_id: Optional[str] = None) -> Any:
        """Centrally enforces tenant scoping if the model has a tenant_id column."""
        if tenant_id and hasattr(self.model, "tenant_id"):
            return statement.where(getattr(self.model, "tenant_id") == tenant_id)
        return statement

    def get(self, db: Session, id: Any, tenant_id: Optional[str] = None) -> Optional[ModelType]:
        stmt = select(self.model).where(getattr(self.model, "id") == id)
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        return db.scalars(stmt).first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100, tenant_id: Optional[str] = None
    ) -> List[ModelType]:
        stmt = select(self.model).offset(skip).limit(limit)
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        return list(db.scalars(stmt).all())

    def create(
        self, db: Session, *, obj_in: Union[CreateSchemaType, Dict[str, Any]], tenant_id: Optional[str] = None
    ) -> ModelType:
        if isinstance(obj_in, dict):
            create_data = obj_in.copy()
        else:
            create_data = obj_in.model_dump(exclude_unset=True)

        if tenant_id and hasattr(self.model, "tenant_id"):
            create_data["tenant_id"] = tenant_id

        db_obj = self.model(**create_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: Any, tenant_id: Optional[str] = None) -> Optional[ModelType]:
        obj = self.get(db, id=id, tenant_id=tenant_id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj
