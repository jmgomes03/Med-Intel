import os

from app.auth import hash_password
from app.database import get_connection


USERS = [
    {
        "username": "admin",
        "full_name": "System Administrator",
        "password": os.getenv("MEDINTEL_ADMIN_PASSWORD"),
        "role": "admin",
    },
    {
        "username": "staff",
        "full_name": "Operations Staff",
        "password": os.getenv("MEDINTEL_STAFF_PASSWORD"),
        "role": "staff",
    },
]
 

def seed_users():
    with get_connection() as conn:
        with conn.cursor() as cur:
            for user in USERS:
                password_hash = hash_password(user["password"])

                cur.execute(
                    """
                    INSERT INTO users (
                        username,
                        full_name,
                        password_hash,
                        role
                    )
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (username) DO NOTHING
                    """,
                    (
                        user["username"],
                        user["full_name"],
                        password_hash,
                        user["role"],
                    ),
                )

        conn.commit()

    print("Demo users created or already exist.")


if __name__ == "__main__":
    seed_users()