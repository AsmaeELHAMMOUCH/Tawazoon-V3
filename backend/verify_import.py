
import sys
import os

# Add backend to sys.path
sys.path.append(os.getcwd())

try:
    print("Attempting to import app.api.simulation...")
    import app.api.simulation
    print("SUCCESS: app.api.simulation imported correctly.")
except ImportError as e:
    print(f"FAILURE: {e}")
except Exception as e:
    print(f"FAILURE (Other): {e}")
