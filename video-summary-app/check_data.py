import os
from pathlib import Path
import json

base = Path(r"f:\videos\editor ia\video-summary-app")
files = list(base.rglob("sandbox_data.json"))

print(f"Found {len(files)} sandbox_data.json files:")
for f in files:
    try:
        with open(f, "r", encoding="utf-8") as file:
            data = json.load(file)
            print(f"- {f}: {len(data.get('students', []))} students")
            if data.get('students'):
                print(f"  First student level: {data['students'][0].get('level')}")
    except Exception as e:
        print(f"- {f}: Error {e}")

main_py = base / "backend" / "main.py"
if main_py.exists():
    print(f"\nBackend main.py exists at {main_py}")
