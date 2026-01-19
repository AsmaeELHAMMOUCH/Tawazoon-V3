
import os

file_path = r"c:\Users\Aelhammouch\simulateur-rh-V2\backend\app\services\simulation_data_driven.py"
new_function = """def calculer_volume_applique(tache: Any, context: VolumeContext) -> tuple:
    # 1. Obtenir la stratégie via la Factory
    strategy = StrategyFactory.get_strategy(context.centre_id, context.categorie_id)
    
    # 2. Exécuter le calcul via la stratégie
    return strategy.calculate_volume(tache, context)
"""

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find start line (0-indexed)
start_idx = -1
for i, line in enumerate(lines):
    if line.strip().startswith("def calculer_volume_applique"):
        start_idx = i
        break

if start_idx == -1:
    print("Could not find calculer_volume_applique start")
    exit(1)

# Find end line (start of next function get_co_volume_generic)
end_idx = -1
for i in range(start_idx, len(lines)):
    if line.strip().startswith("def get_co_volume_generic"): # This was invalid in valid python loop
        pass

# Re-loop correctly
for i in range(start_idx, len(lines)):
    if lines[i].strip().startswith("def get_co_volume_generic"):
        end_idx = i
        break

if end_idx == -1:
    print("Could not find get_co_volume_generic start")
    exit(1)

# Keep lines before start_idx
# Insert new function
# Keep lines from end_idx onwards

final_lines = lines[:start_idx] + [new_function + "\n\n"] + lines[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print(f"Successfully replaced function. Deleted {end_idx - start_idx} lines.")
