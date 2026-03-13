with open('app.js', 'r') as f:
    content = f.read()

search_str = """    // Gather all historical bills and normalize them for charting
    let targetBuildings = allBuildings;
    if (activeBuildingId) {
        targetBuildings = targetBuildings.filter(b => b.id === activeBuildingId);
    }"""

replace_str = """    // Gather all historical bills and normalize them for charting
    let targetBuildings = allBuildings;
    if (activeBuildingId) {
        targetBuildings = targetBuildings.filter(b => b.id === activeBuildingId);
    } else {
        const companyFilter = document.getElementById('company-filter')?.value;
        if (companyFilter) {
            targetBuildings = targetBuildings.filter(b => b.companyId === companyFilter);
        }
    }"""

content = content.replace(search_str, replace_str)

with open('app.js', 'w') as f:
    f.write(content)
