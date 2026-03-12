let utilityChartInstance = null;
let activeBuildingId = null;
let allBuildings = [];
let sortEndDateAscending = true; // Track sorting state globally

const companies = [
    { id: 'oracle', name: 'Oracle', industry: 'Technology' },
    { id: 'google', name: 'Google', industry: 'Technology' },
    { id: 'amazon', name: 'Amazon', industry: 'E-commerce' },
    { id: 'meta', name: 'Meta', industry: 'Technology' },
    { id: 'apple', name: 'Apple', industry: 'Technology' },
    { id: 'microsoft', name: 'Microsoft', industry: 'Technology' }
];

async function loadBuildings() {
    try {
        const response = await fetch('buildings.json');
        const rawBuildings = await response.json();
        allBuildings = rawBuildings.map(building => {
            // Relational Data Upgrade (Multi-Account)
            const accounts = [];
            if (building.mprn) {
                accounts.push({
                    type: 'Electricity',
                    id_number: building.mprn,
                    provider: 'Utility Co',
                    contractEndDate: building.contractEndDate
                });
            }
            if (building.gprn) {
                accounts.push({
                    type: 'Gas',
                    id_number: building.gprn,
                    provider: 'Utility Co',
                    contractEndDate: building.contractEndDate
                });
            }

            // Delete old flat fields and add accounts array
            delete building.mprn;
            delete building.gprn;
            building.accounts = accounts;

            return building;
        });

        renderBuildings(allBuildings);
    } catch (error) {
        console.error('Error loading buildings:', error);
    }
}

function renderBuildings(buildings) {
    const list = document.getElementById('buildings-list');
    list.innerHTML = '';

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.textAlign = 'left';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr style="background: var(--card-bg); position: sticky; top: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); z-index: 10;">
            <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Building Name/Address</th>
            <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Company Badge</th>
            <th id="sort-end-date" style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 0.9em; text-transform: uppercase; cursor: pointer;">Contract End Date &#x21C5;</th>
            <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Last Updated</th>
            <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Total Cost</th>
        </tr>
    `;
    table.appendChild(thead);

    // Sort End Date Logic
    setTimeout(() => {
        const sortHeader = document.getElementById('sort-end-date');
        if (sortHeader) {
            // Remove previous event listeners if rendering again
            sortHeader.replaceWith(sortHeader.cloneNode(true));
            document.getElementById('sort-end-date').addEventListener('click', () => {
                sortEndDateAscending = !sortEndDateAscending;
                const sorted = [...buildings].sort((a, b) => {
                    const dateA = new Date(a.contractEndDate).getTime();
                    const dateB = new Date(b.contractEndDate).getTime();
                    return sortEndDateAscending ? dateA - dateB : dateB - dateA;
                });
                renderBuildings(sorted);
            });
        }
    }, 0);

    const tbody = document.createElement('tbody');

    buildings.forEach((building, index) => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.style.borderBottom = '1px solid #e2e8f0';
        row.style.transition = 'background-color 0.2s';

        // Zebra striping
        if (index % 2 === 0) {
            row.style.backgroundColor = 'rgba(0,0,0,0.02)';
        } else {
            row.style.backgroundColor = 'transparent';
        }

        // Active selection styling
        if (building.id === activeBuildingId) {
            row.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
            row.style.borderLeft = '4px solid var(--primary)';
        } else {
            row.style.borderLeft = '4px solid transparent';
        }

        row.addEventListener('mouseover', () => {
            if (building.id !== activeBuildingId) {
                row.style.backgroundColor = 'rgba(0,0,0,0.05)';
            }
        });
        row.addEventListener('mouseout', () => {
            if (building.id !== activeBuildingId) {
                row.style.backgroundColor = index % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';
            }
        });

        const companyObj = companies.find(c => c.id === building.companyId);
        const companyName = companyObj ? companyObj.name : 'Unknown';

        // Helper to format date as DD/MM/YYYY
        const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            const d = new Date(dateStr);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        const today = new Date('2026-03-12T00:00:00');

        // Contract End Date logic
        const end = new Date(building.contractEndDate);
        const diffEndDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        const endStyle = diffEndDays < 30 ? 'color: #ef4444; font-weight: bold;' : 'color: #334155;';

        // Last Updated (Staleness logic)
        let lastUpdatedText = 'No bills';
        let stalenessStyle = 'color: #334155;';
        let buildingTotalCost = 0;

        if (building.billHistory && building.billHistory.length > 0) {
            const maxDate = new Date(Math.max(...building.billHistory.map(b => new Date(b.date).getTime())));
            const diffStaleDays = Math.ceil((today - maxDate) / (1000 * 60 * 60 * 24));

            if (diffStaleDays > 60) {
                lastUpdatedText = `<span style="color: #ef4444; font-weight: bold;">STALE</span> (${diffStaleDays} days ago)`;
            } else {
                lastUpdatedText = `${diffStaleDays} days ago`;
            }

            // Building Level Aggregation
            buildingTotalCost = building.billHistory.reduce((sum, bill) => sum + (parseFloat(bill.cost) || 0), 0);
        }

        row.innerHTML = `
            <td style="padding: 15px;">
                <div style="font-weight: 500; font-size: 1.05em; color: #1e293b;">${building.name}</div>
                <div style="color: #64748b; font-size: 0.85em; margin-top: 4px;">${building.address}</div>
            </td>
            <td style="padding: 15px;">
                <span style="background: #e2e8f0; color: #334155; padding: 6px 10px; border-radius: 6px; font-size: 0.85em; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
                    <span style="display:inline-block; width:8px; height:8px; background:var(--primary); border-radius:50%;"></span>
                    ${companyName}
                </span>
            </td>
            <td style="padding: 15px; font-size: 0.95em; ${endStyle}">
                ${formatDate(building.contractEndDate)}
            </td>
            <td style="padding: 15px; font-size: 0.95em; ${stalenessStyle}">
                ${lastUpdatedText}
            </td>
            <td style="padding: 15px; font-size: 0.95em; font-weight: bold; color: var(--primary);">
                €${buildingTotalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </td>
        `;

        // Create Expandable Accordion Row for Accounts
        const accordionRow = document.createElement('tr');
        accordionRow.style.display = 'none';
        accordionRow.style.backgroundColor = '#f1f5f9';

        let accountsHtml = '<div style="padding: 15px; display: flex; flex-direction: column; gap: 10px;">';
        accountsHtml += '<h4 style="margin:0; color: #334155;">Accounts</h4>';
        accountsHtml += '<ul style="list-style-type: none; padding: 0; margin: 0;">';

        if (building.accounts && building.accounts.length > 0) {
            building.accounts.forEach(acc => {
                accountsHtml += `<li style="padding: 8px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 5px; display: flex; justify-content: space-between;">
                    <span style="font-weight: 600; color: #1e293b;">${acc.type}</span>
                    <span style="font-family: monospace; color: #475569;">ID: ${acc.id_number || 'N/A'}</span>
                </li>`;
            });
        } else {
            accountsHtml += `<li style="color: #64748b;">No accounts found.</li>`;
        }

        accountsHtml += '</ul>';
        accountsHtml += '<button class="btn-primary" style="align-self: flex-start; padding: 8px 12px; font-size: 0.85em; margin-top: 10px;">+ Add Account</button>';
        accountsHtml += '</div>';

        accordionRow.innerHTML = `<td colspan="5">${accountsHtml}</td>`;

        row.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'button') return;

            // Toggle Accordion
            if (accordionRow.style.display === 'none') {
                accordionRow.style.display = 'table-row';
            } else {
                accordionRow.style.display = 'none';
            }

            selectBuilding(building);
        });

        tbody.appendChild(row);
        tbody.appendChild(accordionRow);
    });

    table.appendChild(tbody);
    list.appendChild(table);
}

function selectBuilding(building) {
    const viewBillHistoryBtn = document.getElementById('view-bill-history');
    if (activeBuildingId === building.id) {
        // Deselect
        activeBuildingId = null;
        document.getElementById('selected-building-name').textContent = 'All Buildings Dashboard';
        document.getElementById('building-id').value = '';
        if (viewBillHistoryBtn) viewBillHistoryBtn.style.display = 'none';
    } else {
        activeBuildingId = building.id;
        document.getElementById('selected-building-name').textContent = `${building.name} Dashboard`;
        document.getElementById('building-id').value = building.id;
        if (viewBillHistoryBtn) viewBillHistoryBtn.style.display = 'block';
    }

    updateDashboard();
    renderChart();
}

function updateDashboard() {
    let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const searchBar = document.getElementById('search-bar')?.value;
    const companyFilter = document.getElementById('company-filter')?.value;
    const startDateFilter = document.getElementById('start-date-filter')?.value;
    const endDateFilter = document.getElementById('end-date-filter')?.value;

    let totalElectricity = 0;
    let totalWater = 0;
    let totalGas = 0;
    let totalCost = 0;

    let targetBuildings = allBuildings;
    if (activeBuildingId) {
        targetBuildings = targetBuildings.filter(b => b.id === activeBuildingId);
    } else {
        if (companyFilter) {
            targetBuildings = targetBuildings.filter(b => b.companyId === companyFilter);
        }
        if (searchBar) {
            const searchTerm = searchBar.toLowerCase();
            targetBuildings = targetBuildings.filter(building =>
                building.name.toLowerCase().includes(searchTerm) ||
                building.address.toLowerCase().includes(searchTerm)
            );
        }
    }

    targetBuildings.forEach(building => {
        if (building.billHistory) {
            building.billHistory.forEach(bill => {
                const billDate = new Date(bill.date);
                let withinDateRange = false;

                if (startDateFilter && endDateFilter) {
                    const start = new Date(startDateFilter);
                    const end = new Date(endDateFilter);
                    withinDateRange = billDate >= start && billDate <= end;
                } else {
                    withinDateRange = billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
                }

                if (withinDateRange) {
                    totalElectricity += parseFloat(bill.usage_kwh) || 0;
                    totalWater += parseFloat(bill.usage_m3) || 0;
                    totalCost += parseFloat(bill.cost) || 0;
                }
            });
        }
    });

    readings.forEach(reading => {
        const building = allBuildings.find(b => b.id === reading.building_id);
        if (!building) return;

        if (activeBuildingId && reading.building_id !== activeBuildingId) return;
        if (!activeBuildingId && companyFilter && building.companyId !== companyFilter) return;

        const readingDate = new Date(reading.date);
        let withinDateRange = false;

        if (startDateFilter && endDateFilter) {
            const start = new Date(startDateFilter);
            const end = new Date(endDateFilter);
            withinDateRange = readingDate >= start && readingDate <= end;
        } else {
            withinDateRange = readingDate.getMonth() === currentMonth && readingDate.getFullYear() === currentYear;
        }

        if (withinDateRange) {
            const val = parseFloat(reading.value) || 0;
            const cost = parseFloat(reading.cost) || 0;

            if (reading.type === 'electricity') {
                totalElectricity += val;
            } else if (reading.type === 'water') {
                totalWater += val;
            } else if (reading.type === 'gas') {
                totalGas += val;
            }

            totalCost += cost;
        }
    });

    document.getElementById('stat-electricity').textContent = totalElectricity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' kWh';
    document.getElementById('stat-water').textContent = totalWater.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' m³';
    document.getElementById('stat-gas').textContent = totalGas.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' units';

    // Total for entire filtered view over ALL time, per prompt: "Company Level: Create a header stat that sums the costs for the entire filtered view."
    let grandTotal = 0;
    targetBuildings.forEach(building => {
        if (building.billHistory) {
            grandTotal += building.billHistory.reduce((s, bill) => s + (parseFloat(bill.cost) || 0), 0);
        }
    });

    document.getElementById('stat-cost').textContent = '€' + grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function renderChart() {
    let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];

    if (activeBuildingId) {
        readings = readings.filter(r => r.building_id === activeBuildingId);
    }

    // Sort readings by date
    readings.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get unique dates for x-axis
    const dates = [...new Set(readings.map(r => r.date))];

    const electricityData = dates.map(date => {
        const matching = readings.filter(r => r.date === date && r.type === 'electricity');
        return matching.reduce((sum, r) => sum + parseFloat(r.value || 0), 0);
    });

    const waterData = dates.map(date => {
        const matching = readings.filter(r => r.date === date && r.type === 'water');
        return matching.reduce((sum, r) => sum + parseFloat(r.value || 0), 0);
    });

    const gasData = dates.map(date => {
        const matching = readings.filter(r => r.date === date && r.type === 'gas');
        return matching.reduce((sum, r) => sum + parseFloat(r.value || 0), 0);
    });

    const ctx = document.getElementById('utilityChart').getContext('2d');

    if (utilityChartInstance) {
        utilityChartInstance.destroy();
    }

    utilityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Electricity (kWh)',
                    data: electricityData,
                    borderColor: '#f59e0b',
                    backgroundColor: '#f59e0b',
                    tension: 0.1
                },
                {
                    label: 'Water (m³)',
                    data: waterData,
                    borderColor: '#3b82f6',
                    backgroundColor: '#3b82f6',
                    tension: 0.1
                },
                {
                    label: 'Gas (units)',
                    data: gasData,
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Utility Readings Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Make globally accessible
function updateFilters() {
    const searchBar = document.getElementById('search-bar');
    const companyFilter = document.getElementById('company-filter');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');

    let filteredBuildings = allBuildings;

    if (searchBar && searchBar.value) {
        const searchTerm = searchBar.value.toLowerCase();
        filteredBuildings = filteredBuildings.filter(building =>
            building.name.toLowerCase().includes(searchTerm) ||
            building.address.toLowerCase().includes(searchTerm)
        );
    }

    if (companyFilter && companyFilter.value) {
        filteredBuildings = filteredBuildings.filter(b => b.companyId === companyFilter.value);
    }

    // Advanced Date Filter for Buildings
    if (startDateFilter && endDateFilter && startDateFilter.value && endDateFilter.value) {
        const start = new Date(startDateFilter.value);
        const end = new Date(endDateFilter.value);

        filteredBuildings = filteredBuildings.filter(building => {
            if (!building.billHistory || building.billHistory.length === 0) return false;

            // Check if any bill is within the range
            return building.billHistory.some(bill => {
                const billDate = new Date(bill.date);
                return billDate >= start && billDate <= end;
            });
        });
    }

    renderBuildings(filteredBuildings);
    updateDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadBuildings();
    updateDashboard();
    renderChart();

    const searchBar = document.getElementById('search-bar');
    const companyFilter = document.getElementById('company-filter');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');
    const viewBillHistoryBtn = document.getElementById('view-bill-history');
    const billHistoryModal = document.getElementById('bill-history-modal');
    const closeHistoryModal = document.getElementById('close-history-modal');

    if (searchBar) searchBar.addEventListener('input', updateFilters);
    if (companyFilter) companyFilter.addEventListener('change', updateFilters);
    if (startDateFilter) startDateFilter.addEventListener('change', updateFilters);
    if (endDateFilter) endDateFilter.addEventListener('change', updateFilters);

    if (viewBillHistoryBtn) {
        viewBillHistoryBtn.addEventListener('click', () => {
            if (!activeBuildingId) return;
            const building = allBuildings.find(b => b.id === activeBuildingId);
            if (!building) return;

            const listContainer = document.getElementById('bill-history-list');
            listContainer.innerHTML = '';

            let allBills = [];
            if (building.billHistory) {
                allBills = [...building.billHistory];
            }

            let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
            readings.filter(r => r.building_id === activeBuildingId).forEach(r => {
                allBills.push({
                    date: r.date,
                    cost: r.cost,
                    usage_kwh: r.type === 'electricity' ? r.value : '0',
                    usage_m3: r.type === 'water' ? r.value : '0'
                });
            });

            allBills.sort((a, b) => new Date(b.date) - new Date(a.date));

            allBills.forEach(bill => {
                const item = document.createElement('div');
                item.style.padding = '10px';
                item.style.borderBottom = '1px solid #e2e8f0';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>${bill.date}</span>
                        <span style="color: var(--primary);">$${parseFloat(bill.cost).toFixed(2)}</span>
                    </div>
                    <div style="font-size: 0.9em; color: #64748b; margin-top: 5px;">
                        <span>Electricity: ${parseFloat(bill.usage_kwh).toFixed(2)} kWh</span> |
                        <span>Water: ${parseFloat(bill.usage_m3).toFixed(2)} m³</span>
                    </div>
                `;
                listContainer.appendChild(item);
            });

            billHistoryModal.style.display = 'block';
        });
    }

    if (closeHistoryModal) {
        closeHistoryModal.addEventListener('click', () => {
            billHistoryModal.style.display = 'none';
        });
    }

    // Add Building Modal
    const addBuildingBtn = document.getElementById('add-building');
    const addBuildingModal = document.getElementById('add-building-modal');
    const closeAddBuildingModal = document.getElementById('close-add-building-modal');

    if (addBuildingBtn) {
        addBuildingBtn.addEventListener('click', () => {
            addBuildingModal.style.display = 'block';
        });
    }

    if (closeAddBuildingModal) {
        closeAddBuildingModal.addEventListener('click', () => {
            addBuildingModal.style.display = 'none';
        });
    }

    document.getElementById('add-building-form')?.addEventListener('submit', (e) => {
        e.preventDefault();

        // Generate pseudo ID (e.g. B051)
        const idNum = allBuildings.length + 1;
        const newId = 'B' + String(idNum).padStart(3, '0');

        const newBuilding = {
            id: newId,
            name: document.getElementById('add-b-name').value,
            address: document.getElementById('add-b-address').value,
            companyId: document.getElementById('add-b-company').value,
            mprn: document.getElementById('add-b-mprn').value,
            gprn: document.getElementById('add-b-gprn').value,
            contractEndDate: document.getElementById('add-b-enddate').value,
            current_usage: "0.00 kWh",
            billHistory: []
        };

        allBuildings.push(newBuilding);
        addBuildingModal.style.display = 'none';
        document.getElementById('add-building-form').reset();

        updateFilters();
    });

    // Edit Building Modal logic (the function is called from the table buttons)
    const editBuildingModal = document.getElementById('edit-building-modal');
    const closeEditBuildingModal = document.getElementById('close-edit-building-modal');

    if (closeEditBuildingModal) {
        closeEditBuildingModal.addEventListener('click', () => {
            editBuildingModal.style.display = 'none';
        });
    }

    document.getElementById('edit-building-form')?.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-b-id').value;
        const buildingIndex = allBuildings.findIndex(b => b.id === id);

        if (buildingIndex !== -1) {
            allBuildings[buildingIndex].name = document.getElementById('edit-b-name').value;
            allBuildings[buildingIndex].address = document.getElementById('edit-b-address').value;
            allBuildings[buildingIndex].companyId = document.getElementById('edit-b-company').value;
            allBuildings[buildingIndex].mprn = document.getElementById('edit-b-mprn').value;
            allBuildings[buildingIndex].gprn = document.getElementById('edit-b-gprn').value;
            allBuildings[buildingIndex].contractEndDate = document.getElementById('edit-b-enddate').value;
        }

        editBuildingModal.style.display = 'none';
        updateFilters();
        updateDashboard();
    });

    // Auth Login Logic
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            if (username === 'Oracle_Admin') {
                localStorage.setItem('auth_user', 'oracle');
                checkAuth();
            } else if (username === 'Super_Admin') {
                localStorage.setItem('auth_user', 'all');
                checkAuth();
            } else {
                alert('Invalid user. Try Oracle_Admin or Super_Admin');
            }
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target == billHistoryModal) {
            billHistoryModal.style.display = 'none';
        }
        if (event.target == addBuildingModal) {
            addBuildingModal.style.display = 'none';
        }
        if (event.target == editBuildingModal) {
            editBuildingModal.style.display = 'none';
        }
    });
});

window.openEditModal = function(id) {
    const building = allBuildings.find(b => b.id === id);
    if (building) {
        document.getElementById('edit-b-id').value = building.id;
        document.getElementById('edit-b-name').value = building.name || '';
        document.getElementById('edit-b-address').value = building.address || '';
        document.getElementById('edit-b-company').value = building.companyId || '';
        document.getElementById('edit-b-mprn').value = building.mprn || '';
        document.getElementById('edit-b-gprn').value = building.gprn || '';
        document.getElementById('edit-b-enddate').value = building.contractEndDate || '';

        document.getElementById('edit-building-modal').style.display = 'block';
    }
};

function checkAuth() {
    const authUser = localStorage.getItem('auth_user');
    const authModal = document.getElementById('auth-modal');
    const appContent = document.getElementById('app-content');
    const companyFilter = document.getElementById('company-filter');

    if (!authUser) {
        authModal.style.display = 'flex';
        appContent.style.display = 'none';
    } else {
        authModal.style.display = 'none';
        appContent.style.display = 'block';

        if (authUser === 'oracle') {
            if (companyFilter) {
                companyFilter.value = 'oracle';
                companyFilter.disabled = true;
            }
        } else if (authUser === 'all') {
            if (companyFilter) {
                companyFilter.disabled = false;
            }
        }

        // Trigger filter update with the applied roles
        setTimeout(() => updateFilters(), 100);
    }
}

document.getElementById('tracker-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const buildingId = document.getElementById('building-id').value;
    if (!buildingId) {
        alert('Please select a building before adding a reading.');
        return;
    }

    const data = {
        building_id: buildingId,
        type: document.getElementById('utility-type').value,
        value: document.getElementById('reading-value').value,
        cost: document.getElementById('reading-cost').value,
        date: document.getElementById('reading-date').value
    };

    // Save to LocalStorage (2026 simple storage)
    let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
    readings.push(data);
    localStorage.setItem('utility_readings', JSON.stringify(readings));

    alert('Reading Saved!');
    this.reset();

    updateDashboard();
    renderChart();
});
