import re

with open('app.js', 'r') as f:
    content = f.read()

# 1. edit-building-form
#    if (buildingIndex !== -1) {
#        allBuildings[buildingIndex].name = document.getElementById('edit-b-name').value;
#        allBuildings[buildingIndex].address = document.getElementById('edit-b-address').value;
#        allBuildings[buildingIndex].companyId = document.getElementById('edit-b-company').value;
#        allBuildings[buildingIndex].area = parseFloat(document.getElementById('edit-b-area').value) || 1000;
#
#        logAudit(`Edited building: ${allBuildings[buildingIndex].name}`);
#    }
#        saveToLocalStorage();
edit_building_search = """        if (buildingIndex !== -1) {
            allBuildings[buildingIndex].name = document.getElementById('edit-b-name').value;
            allBuildings[buildingIndex].address = document.getElementById('edit-b-address').value;
            allBuildings[buildingIndex].companyId = document.getElementById('edit-b-company').value;
            allBuildings[buildingIndex].area = parseFloat(document.getElementById('edit-b-area').value) || 1000;

            logAudit(`Edited building: ${allBuildings[buildingIndex].name}`);
        }
            saveToLocalStorage();"""

edit_building_replace = """        if (buildingIndex !== -1) {
            const updatedFields = {
                name: document.getElementById('edit-b-name').value,
                address: document.getElementById('edit-b-address').value,
                companyId: document.getElementById('edit-b-company').value,
                area: parseFloat(document.getElementById('edit-b-area').value) || 1000
            };
            allBuildings = allBuildings.map(b => b.id === id ? { ...b, ...updatedFields } : b);

            logAudit(`Edited building: ${updatedFields.name}`);
        }
        saveToLocalStorage();"""

content = content.replace(edit_building_search, edit_building_replace)

# 2. edit-account-form
#        if (building && building.accounts) {
#            const accIndex = building.accounts.findIndex(a => a.id_number === origId);
#            if (accIndex !== -1) {
#                building.accounts[accIndex].id_number = document.getElementById('edit-acc-id').value;
#                building.accounts[accIndex].provider = document.getElementById('edit-acc-provider').value;
#                building.accounts[accIndex].account_address = document.getElementById('edit-acc-address').value;
#                building.accounts[accIndex].contractEndDate = document.getElementById('edit-acc-enddate').value;
#                logAudit(`Edited ${building.accounts[accIndex].type} account on ${building.name}`);
#            }
#                saveToLocalStorage();
#        }
edit_account_search = """        if (building && building.accounts) {
            const accIndex = building.accounts.findIndex(a => a.id_number === origId);
            if (accIndex !== -1) {
                building.accounts[accIndex].id_number = document.getElementById('edit-acc-id').value;
                building.accounts[accIndex].provider = document.getElementById('edit-acc-provider').value;
                building.accounts[accIndex].account_address = document.getElementById('edit-acc-address').value;
                building.accounts[accIndex].contractEndDate = document.getElementById('edit-acc-enddate').value;
                logAudit(`Edited ${building.accounts[accIndex].type} account on ${building.name}`);
            }
                saveToLocalStorage();
        }"""

edit_account_replace = """        if (building && building.accounts) {
            const accIndex = building.accounts.findIndex(a => a.id_number === origId);
            if (accIndex !== -1) {
                const updatedAcc = {
                    id_number: document.getElementById('edit-acc-id').value,
                    provider: document.getElementById('edit-acc-provider').value,
                    account_address: document.getElementById('edit-acc-address').value,
                    contractEndDate: document.getElementById('edit-acc-enddate').value
                };

                allBuildings = allBuildings.map(b => b.id === bId ? {
                    ...b,
                    accounts: b.accounts.map(a => a.id_number === origId ? { ...a, ...updatedAcc } : a)
                } : b);

                logAudit(`Edited ${building.accounts[accIndex].type} account on ${building.name}`);
            }
            saveToLocalStorage();
        }"""

content = content.replace(edit_account_search, edit_account_replace)

# 3. tracker-form
#    const building = allBuildings.find(b => b.id === bId);
#    if (building && building.accounts) {
#        const accIndex = building.accounts.findIndex(a => a.id_number === oldAccNum);
#        if (accIndex !== -1) {
#            let edited = false;
#            if (building.accounts[accIndex].id_number !== newAccNum) {
#                building.accounts[accIndex].id_number = newAccNum;
#                edited = true;
#            }
#            if (building.accounts[accIndex].contractEndDate !== newEndDate) {
#                building.accounts[accIndex].contractEndDate = newEndDate;
#                edited = true;
#            }
#            if (edited) {
#                logAudit(`Edited ${accType} account details during reading entry for ${building.name}`);
#                updateFilters(); // Refresh the building table in case accordion is open
#            }
#                saveToLocalStorage();
#        }
#    }
tracker_search = """    const building = allBuildings.find(b => b.id === bId);
    if (building && building.accounts) {
        const accIndex = building.accounts.findIndex(a => a.id_number === oldAccNum);
        if (accIndex !== -1) {
            let edited = false;
            if (building.accounts[accIndex].id_number !== newAccNum) {
                building.accounts[accIndex].id_number = newAccNum;
                edited = true;
            }
            if (building.accounts[accIndex].contractEndDate !== newEndDate) {
                building.accounts[accIndex].contractEndDate = newEndDate;
                edited = true;
            }
            if (edited) {
                logAudit(`Edited ${accType} account details during reading entry for ${building.name}`);
                updateFilters(); // Refresh the building table in case accordion is open
            }
                saveToLocalStorage();
        }
    }"""

tracker_replace = """    const building = allBuildings.find(b => b.id === bId);
    if (building && building.accounts) {
        const accIndex = building.accounts.findIndex(a => a.id_number === oldAccNum);
        if (accIndex !== -1) {
            let edited = false;
            if (building.accounts[accIndex].id_number !== newAccNum || building.accounts[accIndex].contractEndDate !== newEndDate) {
                edited = true;

                allBuildings = allBuildings.map(b => b.id === bId ? {
                    ...b,
                    accounts: b.accounts.map(a => a.id_number === oldAccNum ? { ...a, id_number: newAccNum, contractEndDate: newEndDate } : a)
                } : b);
            }
            if (edited) {
                logAudit(`Edited ${accType} account details during reading entry for ${building.name}`);
                updateFilters(); // Refresh the building table in case accordion is open
            }
            saveToLocalStorage();
        }
    }"""

content = content.replace(tracker_search, tracker_replace)

with open('app.js', 'w') as f:
    f.write(content)
