import re

files = ['index.html', 'insurance.html']

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Wrap the entire main content in a container instead of having nested containers
    # Currently:
    # <div id="main-dashboard" class="container" style="display: none;">
    # <div style="width: 100%;">
    # <header class="app-header">
    #     <div class="container">
    # ...
    # <main class="container" style="flex: 1;">

    # We want max-width: 1200px; margin: 0 auto; on the outermost wrapper if it's not already correct.
    # The current setup has `#main-dashboard.container` which applies max-width: 1200px.
    # But then `<header class="app-header"> <div class="container">` might restrict width inside a restricted width.
    # Wait, if `#main-dashboard` is the container, its max width is 1200px. The `.app-header` inside it will span 100% of 1200px.
    # Then `<div class="container">` inside `.app-header` will apply padding and max-width AGAIN, which is redundant.

    # Let's just remove `class="container"` from inner elements to prevent double-padding/double-centering.
    content = content.replace('<div class="container">', '<div>')
    # Restore the outer container
    content = content.replace('<div id="main-dashboard" class="container" style="display: none;">', '<div id="main-dashboard" class="container" style="display: none;">')

    # Wait, the string replace might catch <main class="container">
    content = content.replace('<main class="container"', '<main ')

    # Tables overflow-x: auto
    # Let's add overflow-x: auto wrapper for tables if they are not already wrapped.
    # The prompt says: "For tables inside, set overflow-x: auto on the table wrapper."
    # The tables inside app.js are dynamically generated. I need to update app.js for that.

    with open(file, 'w') as f:
        f.write(content)
