import getpass

from sqlalchemy import select

from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.user import User

EMAIL = "admin@sunline.tn"

db = next(get_db())
print("Database used by the app:", db.get_bind().url)   # SQLAlchemy hides the password

user = db.execute(select(User).where(User.email == EMAIL)).scalar_one_or_none()
if user is None:
    raise SystemExit(f"No user {EMAIL} in this database")

print("is_admin:", user.is_admin, "| is_active:", user.is_active)

pw = getpass.getpass("New password (min 8 characters, hidden): ")
if len(pw) < 8:
    raise SystemExit("Too short, nothing changed")

user.hashed_password = hash_password(pw)
db.commit()
db.refresh(user)
print("Check with the app's own function:", verify_password(pw, user.hashed_password))
