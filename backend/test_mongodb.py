from mongodb import get_database

db = get_database()

print("Connected to database:", db.name)
print("Collections:", db.list_collection_names())