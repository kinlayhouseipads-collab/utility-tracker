import re

with open('app.js', 'r') as f:
    content = f.read()

# Add saveToLocalStorage
save_func = """
// Function to save companies
function saveCompanies() {
    localStorage.setItem('utility_companies', JSON.stringify(companies));
    saveToLocalStorage(); // Ensure it also triggers the main save
}

// Global Storage Strategy
function saveToLocalStorage() {
    const data = {
        buildings: allBuildings,
        companies: companies
    };
    localStorage.setItem('VestaLogic_Storage', JSON.stringify(data));
}
"""

content = re.sub(r'// Function to save companies.*?\}', save_func, content, flags=re.DOTALL)

# Add saveToLocalStorage() calls
replacements = {
    r"(logAudit\(`Deleted building: \$\{buildingName\}`\);\s*\})": r"\1\n            saveToLocalStorage();",
    r"(logAudit\(`Deleted account \$\{deleteTarget.accountId\} from building \$\{building.name\}`\);\s*\})": r"\1\n                saveToLocalStorage();",
    r"(logAudit\(`Deleted company: \$\{companyName\} and \$\{buildingsToDelete.length\} associated buildings.`\);\s*renderClientManager\(\);\s*populateCompanyDropdowns\(\);\s*\})": r"\1\n            saveToLocalStorage();",

    r"(logAudit\(`Added new company: \$\{nameInput\}`\);\s*\})": r"\1\n        saveToLocalStorage();",
    r"(logAudit\(`Edited company: \$\{nameInput\}`\);\s*\})": r"\1\n                saveToLocalStorage();",

    r"(logAudit\(`Created building: \$\{newBuilding.name\}`\);\s*addBuildingModal.style.display = 'none';\s*document.getElementById\('add-building-form'\).reset\(\);\s*updateFilters\(\);\s*\})": r"\1\n        saveToLocalStorage();",

    r"(logAudit\(`Edited building: \$\{allBuildings\[buildingIndex\].name\}`\);\s*\})": r"\1\n            saveToLocalStorage();",

    r"(logAudit\(`Added \$\{newAcc.type\} MPRN for \$\{newAcc.account_address\} at Building \$\{building.name\}`\);\s*\})": r"\1\n            saveToLocalStorage();",

    r"(logAudit\(`Edited \$\{building.accounts\[accIndex\].type\} account on \$\{building.name\}`\);\s*\})": r"\1\n                saveToLocalStorage();",

    r"(logAudit\(`Edited \$\{accType\} account details during reading entry for \$\{building.name\}`\);\s*updateFilters\(\); // Refresh the building table in case accordion is open\s*\})": r"\1\n                saveToLocalStorage();"
}

for pattern, replacement in replacements.items():
    content = re.sub(pattern, replacement, content)

with open('app.js', 'w') as f:
    f.write(content)
