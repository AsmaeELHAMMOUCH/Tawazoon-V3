
import sys
import traceback

sys.path.append(r"c:\Users\Aelhammouch\simulateur-rh-V2\backend")

output_file = r"c:\Users\Aelhammouch\simulateur-rh-V2\backend\app\services\verify_log.txt"

with open(output_file, 'w', encoding='utf-8') as f:
    try:
        f.write("Attempting to import legacy_logic...\n")
        from app.services.strategies.legacy_logic import calculer_volume_standard_logic
        f.write("✅ SUCCESS: legacy_logic imported successfully.\n")
    except Exception as e:
        f.write(f"❌ ERROR: Failed to import legacy_logic: {e}\n")
        traceback.print_exc(file=f)
