from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.repositories.base import BaseRepository
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserUpdate


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    def __init__(self):
        super().__init__(User)

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Fetch a user globally by normalized lowercase email."""
        stmt = select(self.model).where(self.model.email == email)
        return db.scalars(stmt).first()


user_repository = UserRepository()
