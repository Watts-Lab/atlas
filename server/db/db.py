import os
import certifi
import logging
from dotenv import load_dotenv
from db_logger import BColors
import datetime

# Database interface
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId

load_dotenv()


class DatabaseInterface:
    def __init__(self):
        uri = os.getenv("DB_URI")
        self.client = MongoClient(
            uri, server_api=ServerApi("1"), tlsCAFile=certifi.where()
        )
        self.db = self.client.get_database("atlas_main")
        self.logger = logging.getLogger(__name__)
        print(f"{BColors.OKGREEN}Database interface initialized{BColors.ENDC}")

    def get_collection_names(self):
        return self.db.list_collection_names()

    def create_collection(self, collection_name):
        return self.db.create_collection(collection_name)

    def drop_collection(self, collection_name):
        return self.db.drop_collection(collection_name)

    def insert_one(self, collection_name, data):
        collection = self.db[collection_name]
        return collection.insert_one(data)

    def insert_many(self, collection_name, data):
        collection = self.db[collection_name]
        return collection.insert_many(data)


if __name__ == "__main__":
    db_interface = DatabaseInterface()

    document_parent = {
        "prompt_id": ObjectId(),
        "feature_path": "experiments.conditions.name",
        "github_url": "server/features/experiments/conditions/name.py",
        "versions": [
            {
                "performace": 0.2,
                "average_cost": 0.3,
                "commit_SHA": "1234567890",
                "created_at": datetime.datetime.now(),
            }
        ],
    }
