import re

with open('index.html', 'r') as f:
    content = f.read()

# Add a toast container right before </body>
toast_html = """
    <div id="toast-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;"></div>
"""

content = content.replace("</body>", toast_html + "\n</body>")

with open('index.html', 'w') as f:
    f.write(content)
