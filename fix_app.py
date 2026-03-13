import re

with open('app.js', 'r') as f:
    content = f.read()

# Fix the duplicate saveToLocalStorage issues / formatting if needed

with open('app.js', 'w') as f:
    f.write(content)
