import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")


def get_database():
    client = MongoClient(MONGODB_URI)

    client.admin.command("ping")

    return client["repoviva"]