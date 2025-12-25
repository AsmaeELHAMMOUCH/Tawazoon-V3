
import sys
import os
import traceback

# Add backend to sys.path
sys.path.append(os.getcwd())

print("Attempting to import app.main...")
try:
    from app.main import app
    print("SUCCESS: app.main imported correctly.")
except Exception:
    print("FAILURE: Could not import app.main")
    traceback.print_exc()
