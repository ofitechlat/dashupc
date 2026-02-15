import json
import os
path = "backend/sandbox_data.json"
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        print(f"File: {path}")
        print(f"Count: {len(data.get('students', []))}")
        for s in data.get('students', []):
            print(f"- {s.get('name')} ({s.get('level')})")
else:
    print(f"File {path} not found")
