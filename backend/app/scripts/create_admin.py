import sys
import uuid

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


def create_admin(email: str, password: str, full_name: str) -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.is_admin = True
            existing.hashed_password = hash_password(password)
            db.commit()
            print(f"Existing user {email} promoted to admin and password reset.")
            return

        admin = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            is_active=True,
            is_admin=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin user created: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python -m app.scripts.create_admin <email> <password> <full_name>")
        sys.exit(1)

    create_admin(sys.argv[1], sys.argv[2], sys.argv[3])