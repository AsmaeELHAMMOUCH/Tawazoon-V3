import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from app.api.builder import router
    print("SUCCESS: Imported router from app.api.builder")
    print(f"Router Prefix: {router.prefix}")
    print(f"Router Tags: {router.tags}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
