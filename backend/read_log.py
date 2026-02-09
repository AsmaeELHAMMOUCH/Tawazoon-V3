import sys

def read_log(path):
    try:
        with open(path, 'rb') as f:
            content = f.read()
        
        # Try different encodings
        for enc in ['utf-8', 'utf-16', 'utf-16-le', 'latin-1']:
            try:
                decoded = content.decode(enc)
                print(f"--- Decoded with {enc} ---")
                # Get last 1000 characters
                print(decoded[-2000:])
                return
            except:
                continue
        print("Failed to decode with common encodings.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    read_log("output.log")
