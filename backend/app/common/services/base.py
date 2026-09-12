from typing import Any, Generic, List, Optional, TypeVar
from sqlalchemy.orm import Session

from app.common.models.base import Base
from app.common.repositories.base import BaseRepository

ModelType = TypeVar("ModelType", bound=Base)
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)


class BaseService(Generic[ModelType, RepositoryType]):
    """Generic base service orchestrating business rules and repository data access.
    
    Routes interact with services, keeping database access out of API endpoints.
    """

    def __init__(self, repository: RepositoryType):
        self.repository = repository

    def get(self, db: Session, id: Any, tenant_id: Optional[str] = None) -> Optional[ModelType]:
        return self.repository.get(db, id=id, tenant_id=tenant_id)

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100, tenant_id: Optional[str] = None
    ) -> List[ModelType]:
        return self.repository.get_multi(db, skip=skip, limit=limit, tenant_id=tenant_id)

    def create(self, db: Session, *, obj_in: Any, tenant_id: Optional[str] = None) -> ModelType:
        # Pre-creation business validations can be added in domain service subclasses
        return self.repository.create(db, obj_in=obj_in, tenant_id=tenant_id)

    def update(
        self, db: Session, *, id: Any, obj_in: Any, tenant_id: Optional[str] = None
    ) -> Optional[ModelType]:
        db_obj = self.get(db, id=id, tenant_id=tenant_id)
        if not db_obj:
            return None
        return self.repository.update(db, db_obj=db_obj, obj_in=obj_in)

    def remove(self, db: Session, *, id: Any, tenant_id: Optional[str] = None) -> Optional[ModelType]:
        return self.repository.remove(db, id=id, tenant_id=tenant_id)
