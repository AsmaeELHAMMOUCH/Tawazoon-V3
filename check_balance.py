
import re

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.splitlines()
    
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in '({[':
                stack.append((char, i + 1, j + 1))
            elif char in ')}]':
                if not stack:
                    print(f"Excess closing '{char}' at line {i+1} col {j+1}")
                    return
                last, li, lj = stack.pop()
                if (last == '(' and char != ')') or \
                   (last == '{' and char != '}') or \
                   (last == '[' and char != ']'):
                    print(f"Mismatch: '{last}' at {li}:{lj} matches '{char}' at {i+1}:{j+1}")
                    return

    if stack:
        print("Unclosed elements:")
        for char, li, lj in stack:
            print(f"'{char}' at {li}:{lj}")

check_balance('frontend/src/components/views/VueCentre.jsx')
