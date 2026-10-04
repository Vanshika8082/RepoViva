from mongodb import get_database


db = get_database()

print("MongoDB connection successful!")
print("Database:", db.name)