#!/usr/bin/env python3
"""
Database Initialization Script

Creates database tables and runs initial migrations.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.database import init_db, init_mongodb, init_redis
from shared.events.store import EventStore
from shared.security.audit import AuditLogger
from shared.database.mongodb import get_mongodb
import structlog

logger = structlog.get_logger(__name__)


async def main() -> None:
    """Initialize all databases and required infrastructure."""
    logger.info("Starting database initialization")

    try:
        # Initialize PostgreSQL
        logger.info("Initializing PostgreSQL...")
        await init_db()
        logger.info("PostgreSQL initialized successfully")

        # Initialize MongoDB
        logger.info("Initializing MongoDB...")
        await init_mongodb()
        mongodb = await get_mongodb()

        # Initialize Event Store
        logger.info("Initializing Event Store...")
        from motor.motor_asyncio import AsyncIOMotorClient
        from shared.config import settings

        mongo_client = AsyncIOMotorClient(settings.mongodb_url)
        event_store = EventStore(mongo_client)
        await event_store.initialize()
        logger.info("Event Store initialized successfully")

        # Initialize Audit Logger
        logger.info("Initializing Audit Logger...")
        audit_collection = mongodb["audit_logs"]
        audit_logger = AuditLogger(audit_collection)
        await audit_logger.initialize()
        logger.info("Audit Logger initialized successfully")

        # Initialize Redis
        logger.info("Initializing Redis...")
        await init_redis()
        logger.info("Redis initialized successfully")

        logger.info("All databases initialized successfully!")

    except Exception as e:
        logger.error("Database initialization failed", error=str(e))
        raise


if __name__ == "__main__":
    # Fix for Windows - psycopg requires SelectorEventLoop
    import platform
    if platform.system() == "Windows":
        import selectors
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())

