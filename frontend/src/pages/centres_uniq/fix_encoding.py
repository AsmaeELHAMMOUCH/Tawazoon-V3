import sys

file_path = "c:\\Users\\sagourram\\Projects\\Tawazoon-V3\\frontend\\src\\pages\\centres_uniq\\BandoengSimulation.jsx"

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Try strict fix first
    try:
        fixed_content = content.encode('windows-1252').decode('utf-8')
        print("Successfully decoded using windows-1252 -> utf-8 strategy.")
    except UnicodeEncodeError:
        print("Strict usage of windows-1252 failed (some chars not in 1252). Falling back to replacements.")
        fixed_content = content
        replacements = {
            'Ã©': 'é', 'Ã¨': 'è', 'Ã ': 'à', 'Ãª': 'ê', 'Ã¢': 'â', 
            'Ã´': 'ô', 'Ã»': 'û', 'Ã®': 'î', 'Ã¯': 'ï', 
            'Ã§': 'ç', "Ã'": "'", 'Â ': ' '
        }
        for bad, good in replacements.items():
            fixed_content = fixed_content.replace(bad, good)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    print("File saved.")

except Exception as e:
    print(f"Error: {e}")
