with open('app.js', 'r') as f:
    content = f.read()

search_str = """    renderBuildings(filteredBuildings);
    updateDashboard();
}"""

replace_str = """    renderBuildings(filteredBuildings);
    updateDashboard();
    renderChart();
}"""

content = content.replace(search_str, replace_str)

with open('app.js', 'w') as f:
    f.write(content)
