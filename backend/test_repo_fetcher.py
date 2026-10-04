from repo_fetching import fetch_repo

url = "https://github.com/username/repository"  # Replace with the actual repo url
result = fetch_repo(url)

print("Result type:", type(result))
print("Number of files:", len(result))
print()

for file in result:
    print("File:", file["filename"])
    print("Content type:", type(file["content"]))
    print("Content length:", len(file["content"]))
    print("-" * 50)