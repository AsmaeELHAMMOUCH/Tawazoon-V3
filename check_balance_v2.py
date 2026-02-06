
import re

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    
    # We want to ignore comments?
    # Simple parser: ignore // and /* */
    
    for i, line in enumerate(lines):
        # clean line of single line comments
        code = line.split('//')[0]
        # (Handling multi-line comments is harder, simplified assumption for now)
        
        for j, char in enumerate(code):
            if char in '({[':
                stack.append((char, i + 1, j + 1))
            elif char in ')}]':
                if not stack:
                    print(f"Excess '{char}' at {i+1}:{j+1}")
                    continue
                last, li, lj = stack.pop()
                expected = {'(':')', '{':'}', '[':']'}[last]
                if char != expected:
                    print(f"Mismatch! Opened '{last}' at {li}:{lj}, closed with '{char}' at {i+1}:{j+1}")
                    return

    if stack:
        print("Unclosed elements:")
        for char, li, lj in stack[-5:]: # Show last 5
            print(f"'{char}' at {li}:{lj}")

check_balance('frontend/src/components/views/VueCentre.jsx')
