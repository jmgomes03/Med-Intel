import os

import psycopg


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not configured.")


def get_connection():
    return psycopg.connect(DATABASE_URL)