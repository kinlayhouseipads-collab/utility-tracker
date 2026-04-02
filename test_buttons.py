import re

files = ['app.js', 'index.html', 'insurance.html']

for file in files:
    with open(file, 'r') as f:
        content = f.read()
        buttons = re.findall(r'<button[^>]*>.*?</button>', content, re.DOTALL | re.IGNORECASE)
        for b in buttons:
            if 'save' in b.lower() or 'add' in b.lower() or 'edit' in b.lower() or 'delete' in b.lower() or 'update' in b.lower():
                print(f"{file}: {b.strip()}")
