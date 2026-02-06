
import sys
import os
sys.path.append('backend')
from app.api import builder

print("Dir of builder:")
print(dir(builder))

if hasattr(builder, 'find_similar_centre'):
    print("SUCCESS: find_similar_centre is in builder module")
else:
    print("FAILURE: find_similar_centre is NOT in builder module")
