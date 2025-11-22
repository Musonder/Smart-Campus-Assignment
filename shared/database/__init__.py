"""
Database Connection and Utilities

Manages connections to PostgreSQL, MongoDB, and Redis.
"""

from shared.database.postgres import get_db, init_db, close_db, Base
from shared.database.mongodb import get_mongodb, init_mongodb, close_mongodb
from shared.database.redis import get_redis, init_redis, close_redis

__all__ = [
    "get_db",
    "init_db",
    "close_db",
    "Base",
    "get_mongodb",
    "init_mongodb",
    "close_mongodb",
    "get_redis",
    "init_redis",
    "close_redis",
]

