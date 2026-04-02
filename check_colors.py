with open("index.html") as f:
    html = f.read()
with open("app.js") as f:
    js = f.read()

import re

def check_html(pattern):
    matches = re.findall(pattern, html)
    for m in matches:
        print(m)

def check_js(pattern):
    matches = re.findall(pattern, js)
    for m in matches:
        print(m)

print("--- Edit in HTML ---")
check_html(r'<button[^>]*Update[^>]*>')
check_html(r'<button[^>]*Edit[^>]*>')
print("--- Edit in JS ---")
check_js(r'<button[^>]*Edit[^>]*>')

print("--- Delete in HTML ---")
check_html(r'<button[^>]*Delete[^>]*>')
check_html(r'<button[^>]*Logout[^>]*>')
print("--- Delete in JS ---")
check_js(r'<button[^>]*Delete[^>]*>')
