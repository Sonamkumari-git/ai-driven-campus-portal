"""
Async MongoDB connector.
Reuses the SAME database as the existing Node.js ERP so we can read
students / marks / attendance / finance collections directly.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

logger = logging.getLogger("zhi-ai.db")


class MongoManager:
    """Single holder for the async client + db handle."""
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


mongo = MongoManager()


async def connect_to_mongo() -> None:
    uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/zhi_college")
    db_name = os.getenv("MONGO_DB_NAME", "zhi_college")
    try:
        mongo.client = AsyncIOMotorClient(
            uri,
            serverSelectionTimeoutMS=5000,
            appname="zhi-ai-service",
        )
        await mongo.client.admin.command("ping")
        mongo.db = mongo.client[db_name]
        logger.info("MongoDB connected (db=%s)", db_name)
    except PyMongoError as exc:
        logger.error("MongoDB connection failed: %s", exc)
        raise


async def close_mongo_connection() -> None:
    if mongo.client is not None:
        mongo.client.close()
        logger.info("MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    if mongo.db is None:
        raise RuntimeError("Mongo not initialised (startup event missed?)")
    return mongo.db
