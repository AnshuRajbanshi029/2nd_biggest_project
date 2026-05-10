import json
import re

with open('viewer.js', 'r', encoding='utf-8') as f:
    js = f.read()

# I want to log which meshes get attached to the rearPivot.
# Let's just modify viewer.js to console.log them!
