import sys
import os

# Ensure backend dir is in path
sys.path.append(os.getcwd())

from app.main import app

print("INSPECTING APP ROUTES:")
found = False
for route in app.routes:
    if hasattr(route, "path") and "builder" in route.path:
        print(f"FOUND: {route.path}")
        found = True

if not found:
    print("NO BUILDER ROUTES FOUND.")
