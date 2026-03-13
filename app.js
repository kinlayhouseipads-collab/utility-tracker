let utilityChartInstance = null;
let activeBuildingId = null;
let allBuildings = [];
let sortEndDateAscending = true; // Track sorting state globally
let currentUserRole = null;
let currentUserId = null;

let companies = JSON.parse(localStorage.getItem('utility_companies')) || [
    { id: 'oracle', name: 'Oracle', industry: 'Technology' },
    { id: 'google', name: 'Google', industry: 'Technology' },
    { id: 'amazon', name: 'Amazon', industry: 'E-commerce' },
    { id: 'meta', name: 'Meta', industry: 'Technology' },
    { id: 'apple', name: 'Apple', industry: 'Technology' },
    { id: 'microsoft', name: 'Microsoft', industry: 'Technology' }
];

// Function to save companies
function saveCompanies() {
    localStorage.setItem('utility_companies', JSON.stringify(companies));
}

// Audit Logging Function
function logAudit(action) {
    if (!currentUserId) return;
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

    const logEntry = {
        userId: currentUserId,
        action: action,
        timestamp: timestamp
    };

    let logs = JSON.parse(localStorage.getItem('utility_audit_logs')) || [];
    logs.unshift(logEntry); // Add to beginning
    localStorage.setItem('utility_audit_logs', JSON.stringify(logs));

    renderAuditLogs();
}

function renderAuditLogs() {
    const container = document.getElementById('audit-log-container');
    if (!container) return;
    container.innerHTML = '';

    const logs = JSON.parse(localStorage.getItem('utility_audit_logs')) || [];
    logs.forEach(log => {
        const el = document.createElement('div');
        el.style.fontSize = '0.85em';
        el.style.padding = '10px';
        el.style.background = '#f8fafc';
        el.style.border = '1px solid #e2e8f0';
        el.style.borderRadius = '6px';

        el.innerHTML = `
            <div style="color: #64748b; font-size: 0.9em; margin-bottom: 4px;">${log.timestamp}</div>
            <div style="font-weight: 600; color: #1e293b;">${log.userId}</div>
            <div style="color: #334155; margin-top: 2px;">${log.action}</div>
        `;
        container.appendChild(el);
    });
}

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

            // Set default area if missing
            if (!building.area) {
                building.area = 1000;
            }

            return building;
        });

        renderBuildings(allBuildings);
    } catch (error) {
        console.error('Error loading buildings:', error);
    }
}

// Helper to format date as DD/MM/YYYY
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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
            <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Days Since Last Bill</th>
            <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Total Cost</th>
            <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 0.9em; text-transform: uppercase; text-align: center;">Actions</th>
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


        const today = new Date('2026-03-12T00:00:00');

        // Contract End Date logic
        const end = new Date(building.contractEndDate);
        const diffEndDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        const endStyle = diffEndDays < 30 ? 'color: #ef4444; font-weight: bold;' : 'color: #334155;';

        // Last Updated (Staleness logic)
        let lastUpdatedText = 'No bills';
        let stalenessStyle = 'color: #334155;';
        let buildingTotalCost = 0;
        let diffStaleDays = -1;

        if (building.billHistory && building.billHistory.length > 0) {
            const maxDate = new Date(Math.max(...building.billHistory.map(b => new Date(b.date).getTime())));
            diffStaleDays = Math.ceil((today - maxDate) / (1000 * 60 * 60 * 24));

            if (diffStaleDays > 60) {
                lastUpdatedText = `<span style="color: #ef4444; font-weight: bold;">STALE</span> (${diffStaleDays} days)`;
                row.style.backgroundColor = '#fee2e2'; // Highlight red if stale
            } else {
                lastUpdatedText = `${diffStaleDays} days`;
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
            <td style="padding: 15px; text-align: center;">
                <button onclick="openEditModal('${building.id}')" style="background: transparent; border: none; cursor: pointer; color: #64748b; margin-right: 10px;" title="Edit Building">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="requestDeleteBuilding('${building.id}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444;" title="Delete Building">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        // Create Expandable Accordion Row for Accounts
        const accordionRow = document.createElement('tr');
        accordionRow.style.display = 'none';
        accordionRow.style.backgroundColor = '#f8fafc';

        let accountsHtml = '<div style="padding: 15px 40px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #e2e8f0;">';
        accountsHtml += '<div style="display: flex; justify-content: space-between; align-items: center;"><h4 style="margin:0; color: #334155;">Linked Accounts</h4>';
        accountsHtml += `<button class="btn-primary" onclick="openAddAccountModal('${building.id}')" style="padding: 6px 12px; font-size: 0.85em;">+ Add Account</button></div>`;

        accountsHtml += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
        accountsHtml += '<thead><tr style="border-bottom: 1px solid #cbd5e1;"><th style="text-align: left; padding: 8px; color: #64748b; font-size: 0.85em;">Type</th><th style="text-align: left; padding: 8px; color: #64748b; font-size: 0.85em;">Provider</th><th style="text-align: left; padding: 8px; color: #64748b; font-size: 0.85em;">Address/Location</th><th style="text-align: left; padding: 8px; color: #64748b; font-size: 0.85em;">Account # (MPRN/GPRN)</th><th style="text-align: left; padding: 8px; color: #64748b; font-size: 0.85em;">End Date</th><th style="text-align: center; padding: 8px; color: #64748b; font-size: 0.85em;">Actions</th></tr></thead>';
        accountsHtml += '<tbody>';

        if (building.accounts && building.accounts.length > 0) {
            building.accounts.forEach(acc => {
                accountsHtml += `<tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                    <td style="padding: 8px; font-weight: 600; color: #1e293b;">${acc.type}</td>
                    <td style="padding: 8px; color: #475569;">${acc.provider || 'N/A'}</td>
                    <td style="padding: 8px;">${acc.account_address || 'N/A'}</td>
                    <td style="padding: 8px;" class="monospace">${acc.id_number || 'N/A'}</td>
                    <td style="padding: 8px; color: #475569;">${formatDate(acc.contractEndDate)}</td>
                    <td style="padding: 8px; text-align: center;">
                        <button onclick="openEditAccountModal('${building.id}', '${acc.id_number}')" style="background: transparent; border: none; cursor: pointer; color: #64748b; margin-right: 5px;"><i class="fas fa-edit"></i></button>
                        <button onclick="requestDeleteAccount('${building.id}', '${acc.id_number}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            });
        } else {
            accountsHtml += `<tr><td colspan="5" style="padding: 15px; text-align: center; color: #64748b;">No accounts linked to this building.</td></tr>`;
        }

        accountsHtml += '</tbody></table>';
        accountsHtml += '</div>';

        accordionRow.innerHTML = `<td colspan="6" style="padding: 0;">${accountsHtml}</td>`;

        row.addEventListener('click', (e) => {
            // Do not toggle accordion if clicking on actions column
            if (e.target.closest('td') === row.lastElementChild || e.target.closest('button') || e.target.closest('i')) return;

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

// Global modal state for confirmations
let deleteTarget = null; // { type: 'building' | 'account', buildingId, accountId }

window.requestDeleteBuilding = function(id) {
    const building = allBuildings.find(b => b.id === id);
    if (!building) return;
    deleteTarget = { type: 'building', buildingId: id };
    document.getElementById('confirm-title').innerText = 'Delete Building';
    document.getElementById('confirm-message').innerText = `Are you sure you want to delete "${building.name}"? All associated accounts and readings will be lost.`;

    document.getElementById('double-confirm-container').style.display = 'block';
    document.getElementById('double-confirm-input').value = '';

    document.getElementById('confirm-modal').style.display = 'block';
};

window.requestDeleteAccount = function(buildingId, accountId) {
    const building = allBuildings.find(b => b.id === buildingId);
    if (!building) return;
    const account = building.accounts.find(a => a.id_number === accountId);
    if (!account) return;

    deleteTarget = { type: 'account', buildingId: buildingId, accountId: accountId };
    document.getElementById('confirm-title').innerText = 'Delete Account';
    document.getElementById('confirm-message').innerText = `Are you sure you want to delete ${account.type} Account (${accountId}) from "${building.name}"?`;

    document.getElementById('double-confirm-container').style.display = 'block';
    document.getElementById('double-confirm-input').value = '';

    document.getElementById('confirm-modal').style.display = 'block';
};

window.requestDeleteCompany = function(companyId) {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    deleteTarget = { type: 'company', companyId: companyId };
    document.getElementById('confirm-title').innerText = 'Delete Company';
    document.getElementById('confirm-message').innerText = `Are you sure you want to delete the company "${company.name}"? This will archive/delete all associated buildings.`;

    document.getElementById('double-confirm-container').style.display = 'block';
    document.getElementById('double-confirm-input').value = '';

    document.getElementById('confirm-modal').style.display = 'block';
};

document.getElementById('confirm-cancel')?.addEventListener('click', () => {
    deleteTarget = null;
    document.getElementById('double-confirm-container').style.display = 'none';
    document.getElementById('confirm-modal').style.display = 'none';
});

document.getElementById('confirm-yes')?.addEventListener('click', () => {
    if (!deleteTarget) return;

    // Double confirmation check
    const doubleConfirmInput = document.getElementById('double-confirm-input');
    if (document.getElementById('double-confirm-container').style.display !== 'none') {
        if (doubleConfirmInput.value !== 'DELETE') {
            alert('Please type DELETE to confirm this action.');
            return;
        }
    }

    if (deleteTarget.type === 'building') {
        const buildingIndex = allBuildings.findIndex(b => b.id === deleteTarget.buildingId);
        if (buildingIndex !== -1) {
            const buildingName = allBuildings[buildingIndex].name;
            allBuildings.splice(buildingIndex, 1);
            logAudit(`Deleted building: ${buildingName}`);
        }
    } else if (deleteTarget.type === 'account') {
        const building = allBuildings.find(b => b.id === deleteTarget.buildingId);
        if (building) {
            const accountIndex = building.accounts.findIndex(a => a.id_number === deleteTarget.accountId);
            if (accountIndex !== -1) {
                building.accounts.splice(accountIndex, 1);
                logAudit(`Deleted account ${deleteTarget.accountId} from building ${building.name}`);
            }
        }
    } else if (deleteTarget.type === 'company') {
        const companyIndex = companies.findIndex(c => c.id === deleteTarget.companyId);
        if (companyIndex !== -1) {
            const companyName = companies[companyIndex].name;
            companies.splice(companyIndex, 1);
            saveCompanies();
            // Archive/Delete associated buildings
            const buildingsToDelete = allBuildings.filter(b => b.companyId === deleteTarget.companyId);
            buildingsToDelete.forEach(b => {
                const bIndex = allBuildings.findIndex(bx => bx.id === b.id);
                if (bIndex !== -1) allBuildings.splice(bIndex, 1);
            });
            logAudit(`Deleted company: ${companyName} and ${buildingsToDelete.length} associated buildings.`);
            renderClientManager();
            populateCompanyDropdowns();
        }
    }

    deleteTarget = null;
    document.getElementById('double-confirm-container').style.display = 'none';
    document.getElementById('confirm-modal').style.display = 'none';
    updateFilters();
    updateDashboard();
});

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
    let totalArea = 0;
    targetBuildings.forEach(building => {
        if (building.billHistory) {
            grandTotal += building.billHistory.reduce((s, bill) => s + (parseFloat(bill.cost) || 0), 0);
        }
        totalArea += parseFloat(building.area) || 1000;
    });

    document.getElementById('stat-cost').textContent = '€' + grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function renderChart() {
    let readings = [];

    // Gather all historical bills and normalize them for charting
    let targetBuildings = allBuildings;
    if (activeBuildingId) {
        targetBuildings = targetBuildings.filter(b => b.id === activeBuildingId);
    }

    targetBuildings.forEach(b => {
        if (b.billHistory) {
            b.billHistory.forEach(bill => {
                readings.push({
                    date: bill.date,
                    cost: parseFloat(bill.cost) || 0
                });
            });
        }
    });

    // Group costs by month-year
    const monthlyCosts = {};
    readings.forEach(r => {
        const d = new Date(r.date);
        const y = d.getFullYear();
        const m = d.getMonth(); // 0-11
        if (!monthlyCosts[y]) monthlyCosts[y] = Array(12).fill(0);
        monthlyCosts[y][m] += r.cost;
    });

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const currentYearData = monthlyCosts[currentYear] || Array(12).fill(0);
    const lastYearData = monthlyCosts[lastYear] || Array(12).fill(0);

    // Calculate simple forecast (e.g. 5% inflation/increase on last year for future months if current year has no data)
    const forecastData = Array(12).fill(0);
    const currentMonth = new Date().getMonth();
    for (let i = 0; i < 12; i++) {
        if (i <= currentMonth && currentYearData[i] > 0) {
            forecastData[i] = currentYearData[i];
        } else {
            // Future months based on last year * 1.05
            forecastData[i] = lastYearData[i] > 0 ? lastYearData[i] * 1.05 : 0;
        }
    }

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const ctx = document.getElementById('utilityChart').getContext('2d');

    if (utilityChartInstance) {
        utilityChartInstance.destroy();
    }

    utilityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Total Cost ${currentYear} (€)`,
                    data: currentYearData,
                    borderColor: '#2563eb',
                    backgroundColor: '#2563eb',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: `Forecasted Cost (€)`,
                    data: forecastData,
                    borderColor: '#10b981',
                    backgroundColor: 'transparent',
                    borderDash: [2, 2],
                    tension: 0.4,
                    fill: false
                },
                {
                    label: `Total Cost ${lastYear} (€)`,
                    data: lastYearData,
                    borderColor: '#94a3b8',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5], // Dashed line for comparative chart
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Total Portfolio Cost: Current vs Previous Year'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + value;
                        }
                    }
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

function populateCompanyDropdowns() {
    const dropdowns = ['company-filter', 'add-b-company', 'edit-b-company', 'wizard-company'];

    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        // Keep the first default option if it exists
        const firstOption = select.options.length > 0 && select.options[0].value === "" ? select.options[0].outerHTML : '<option value="" disabled selected>Select Company</option>';
        if (id === 'company-filter') {
            select.innerHTML = '<option value="">All Companies</option>';
        } else {
            select.innerHTML = firstOption;
        }

        companies.forEach(company => {
            const opt = document.createElement('option');
            opt.value = company.id;
            opt.textContent = company.name;
            select.appendChild(opt);
        });
    });
}

function renderClientManager() {
    const list = document.getElementById('client-manager-list');
    if (!list) return;
    list.innerHTML = '';

    companies.forEach((company, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';
        if (index % 2 === 0) tr.style.backgroundColor = 'rgba(0,0,0,0.02)';

        tr.innerHTML = `
            <td style="padding: 12px 15px; font-weight: 500;">${company.id}</td>
            <td style="padding: 12px 15px;">${company.name}</td>
            <td style="padding: 12px 15px;">${company.industry}</td>
            <td style="padding: 12px 15px; text-align: center;">
                <button onclick="openEditCompanyModal('${company.id}')" style="background: transparent; border: none; cursor: pointer; color: #64748b; margin-right: 10px;" title="Edit Company">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="requestDeleteCompany('${company.id}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444;" title="Delete Company">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        list.appendChild(tr);
    });
}

window.openEditCompanyModal = function(id) {
    const company = companies.find(c => c.id === id);
    if (!company) return;

    document.getElementById('company-modal-title').innerText = 'Edit Company';
    document.getElementById('company-edit-id').value = company.id;

    const idInput = document.getElementById('company-id-input');
    idInput.value = company.id;
    idInput.disabled = true; // Don't allow changing ID of existing company easily

    document.getElementById('company-name-input').value = company.name;
    document.getElementById('company-industry-input').value = company.industry;

    document.getElementById('company-modal').style.display = 'block';
};


function checkAlerts() {
    const notifications = [];
    const today = new Date('2026-03-12T00:00:00'); // Static today per context

    // Only check buildings visible to user
    let targetBuildings = allBuildings;
    if (currentUserRole === 'Company-Admin') {
        const authCompany = sessionStorage.getItem('auth_company');
        targetBuildings = allBuildings.filter(b => b.companyId === authCompany);
    }

    targetBuildings.forEach(building => {
        // Expiring Contracts
        if (building.accounts && building.accounts.length > 0) {
            building.accounts.forEach(acc => {
                if (acc.contractEndDate) {
                    const end = new Date(acc.contractEndDate);
                    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 0 && diffDays < 30) {
                        notifications.push({
                            type: 'Expiring Contract',
                            message: `${acc.type} Account (${acc.id_number}) expires in ${diffDays} days`,
                            buildingId: building.id,
                            accountId: acc.id_number
                        });
                    } else if (diffDays < 0) {
                        notifications.push({
                            type: 'Expired Contract',
                            message: `${acc.type} Account (${acc.id_number}) expired ${Math.abs(diffDays)} days ago`,
                            buildingId: building.id,
                            accountId: acc.id_number
                        });
                    }
                }
            });
        }

        // Stale Readings
        let maxDate = 0;
        if (building.billHistory && building.billHistory.length > 0) {
            maxDate = Math.max(...building.billHistory.map(b => new Date(b.date).getTime()));
        }
        // Check localStorage readings too
        let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
        const localReadings = readings.filter(r => r.building_id === building.id);
        if (localReadings.length > 0) {
            const localMax = Math.max(...localReadings.map(r => new Date(r.date).getTime()));
            maxDate = Math.max(maxDate, localMax);
        }

        if (maxDate > 0) {
            const diffStaleDays = Math.ceil((today - maxDate) / (1000 * 60 * 60 * 24));
            if (diffStaleDays > 60) {
                notifications.push({
                    type: 'Stale Reading',
                    message: `${building.name} hasn't been updated in ${diffStaleDays} days`,
                    buildingId: building.id
                });
            }
        } else {
             notifications.push({
                type: 'No Data',
                message: `${building.name} has no readings`,
                buildingId: building.id
            });
        }
    });

    // Render Notifications
    const badge = document.getElementById('notification-badge');
    const notifList = document.getElementById('notification-list');

    if (badge && notifList) {
        if (notifications.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = notifications.length;

            notifList.innerHTML = '';
            notifications.forEach(n => {
                const el = document.createElement('div');
                el.style.padding = '15px';
                el.style.borderBottom = '1px solid #e2e8f0';
                el.style.cursor = 'pointer';
                el.style.transition = 'background-color 0.2s';

                let iconColor = n.type.includes('Contract') ? '#f59e0b' : '#ef4444';

                el.innerHTML = `
                    <div style="font-weight: 600; color: ${iconColor}; font-size: 0.9em; margin-bottom: 5px;">${n.type}</div>
                    <div style="color: #334155; font-size: 0.95em;">${n.message}</div>
                `;

                el.addEventListener('mouseover', () => el.style.backgroundColor = '#f8fafc');
                el.addEventListener('mouseout', () => el.style.backgroundColor = '#ffffff');

                el.addEventListener('click', () => {
                    document.getElementById('notification-dropdown').style.display = 'none';
                    // Navigation logic
                    const building = allBuildings.find(b => b.id === n.buildingId);
                    if (building) {
                        selectBuilding(building);
                        // Optional: if it's an account, you could auto-expand the accordion here
                    }
                });

                notifList.appendChild(el);
            });
        } else {
            badge.style.display = 'none';
            notifList.innerHTML = '<div style="padding: 15px; color: #64748b; text-align: center;">No alerts at this time.</div>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    populateCompanyDropdowns();
    checkAuth();
    loadBuildings();
    updateDashboard();
    renderChart();
    renderClientManager();

    // Setup Export CSV
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            // Get currently filtered buildings
            const searchBar = document.getElementById('search-bar');
            const companyFilter = document.getElementById('company-filter');
            const startDateFilter = document.getElementById('start-date-filter');
            const endDateFilter = document.getElementById('end-date-filter');

            let filteredBuildings = allBuildings;

            // Apply Auth filters
            if (currentUserRole === 'Company-Admin') {
                const authCompany = sessionStorage.getItem('auth_company');
                filteredBuildings = filteredBuildings.filter(b => b.companyId === authCompany);
            } else if (companyFilter && companyFilter.value) {
                filteredBuildings = filteredBuildings.filter(b => b.companyId === companyFilter.value);
            }

            if (searchBar && searchBar.value) {
                const searchTerm = searchBar.value.toLowerCase();
                filteredBuildings = filteredBuildings.filter(building =>
                    building.name.toLowerCase().includes(searchTerm) ||
                    building.address.toLowerCase().includes(searchTerm)
                );
            }

            if (startDateFilter && endDateFilter && startDateFilter.value && endDateFilter.value) {
                const start = new Date(startDateFilter.value);
                const end = new Date(endDateFilter.value);

                filteredBuildings = filteredBuildings.filter(building => {
                    if (!building.billHistory || building.billHistory.length === 0) return false;
                    return building.billHistory.some(bill => {
                        const billDate = new Date(bill.date);
                        return billDate >= start && billDate <= end;
                    });
                });
            }

            // Generate CSV
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Building Name,Address,Company,MPRN,GPRN,Status\n";

            const today = new Date('2026-03-12T00:00:00');

            filteredBuildings.forEach(building => {
                const companyObj = companies.find(c => c.id === building.companyId);
                const companyName = companyObj ? companyObj.name : 'Unknown';

                let mprn = 'N/A';
                let gprn = 'N/A';
                if (building.accounts) {
                    const elec = building.accounts.find(a => a.type === 'Electricity');
                    if (elec) mprn = elec.id_number;
                    const gas = building.accounts.find(a => a.type === 'Gas');
                    if (gas) gprn = gas.id_number;
                }

                // Determine Status
                let status = 'Active';
                let maxDate = 0;
                if (building.billHistory && building.billHistory.length > 0) {
                    maxDate = Math.max(...building.billHistory.map(b => new Date(b.date).getTime()));
                }
                let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
                const localReadings = readings.filter(r => r.building_id === building.id);
                if (localReadings.length > 0) {
                    const localMax = Math.max(...localReadings.map(r => new Date(r.date).getTime()));
                    maxDate = Math.max(maxDate, localMax);
                }
                if (maxDate > 0) {
                    const diffStaleDays = Math.ceil((today - maxDate) / (1000 * 60 * 60 * 24));
                    if (diffStaleDays > 60) status = 'Stale';
                } else {
                    status = 'No Data';
                }

                // Escape CSV fields
                const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;

                csvContent += `${escapeCSV(building.name)},${escapeCSV(building.address)},${escapeCSV(companyName)},${escapeCSV(mprn)},${escapeCSV(gprn)},${escapeCSV(status)}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "Executive_Report.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            logAudit('Exported CSV Report');
        });
    }

    // Setup Notification Bell
    const bell = document.getElementById('notification-bell');
    const notifDropdown = document.getElementById('notification-dropdown');

    if (bell && notifDropdown) {
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            if (notifDropdown.style.display === 'none') {
                checkAlerts(); // refresh before opening
                notifDropdown.style.display = 'block';
            } else {
                notifDropdown.style.display = 'none';
            }
        });
    }

    // Client Manager toggle
    const clientManagerBtn = document.getElementById('client-manager-btn');
    const clientManagerSection = document.getElementById('client-manager-section');
    if (clientManagerBtn) {
        clientManagerBtn.addEventListener('click', () => {
            if (clientManagerSection.style.display === 'none') {
                clientManagerSection.style.display = 'block';
                clientManagerBtn.style.background = '#4f46e5';
            } else {
                clientManagerSection.style.display = 'none';
                clientManagerBtn.style.background = '#6366f1';
            }
        });
    }

    // Company Modal logic
    const companyModal = document.getElementById('company-modal');
    document.getElementById('add-company-btn')?.addEventListener('click', () => {
        document.getElementById('company-form').reset();
        document.getElementById('company-edit-id').value = '';
        document.getElementById('company-id-input').disabled = false;
        document.getElementById('company-modal-title').innerText = 'Add Company';
        companyModal.style.display = 'block';
    });

    document.getElementById('close-company-modal')?.addEventListener('click', () => {
        companyModal.style.display = 'none';
    });

    document.getElementById('company-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('company-edit-id').value;
        const idInput = document.getElementById('company-id-input').value.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameInput = document.getElementById('company-name-input').value;
        const indInput = document.getElementById('company-industry-input').value;

        if (editId) {
            // Edit existing
            const companyIndex = companies.findIndex(c => c.id === editId);
            if (companyIndex !== -1) {
                companies[companyIndex].name = nameInput;
                companies[companyIndex].industry = indInput;
                logAudit(`Edited company: ${nameInput}`);
            }
        } else {
            // Add new
            if (companies.find(c => c.id === idInput)) {
                alert('A company with this ID already exists!');
                return;
            }
            companies.push({ id: idInput, name: nameInput, industry: indInput });
            logAudit(`Added new company: ${nameInput}`);
        }

        saveCompanies();
        populateCompanyDropdowns();
        renderClientManager();
        companyModal.style.display = 'none';
    });

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

                const formattedDate = formatDate(bill.date);

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>${formattedDate}</span>
                        <span style="color: var(--primary);">€${parseFloat(bill.cost).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
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
            accounts: [],
            area: parseFloat(document.getElementById('add-b-area').value) || 1000,
            current_usage: "0.00 kWh",
            billHistory: []
        };

        allBuildings.push(newBuilding);
        logAudit(`Created building: ${newBuilding.name}`);
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
            allBuildings[buildingIndex].area = parseFloat(document.getElementById('edit-b-area').value) || 1000;

            logAudit(`Edited building: ${allBuildings[buildingIndex].name}`);
        }

        editBuildingModal.style.display = 'none';
        updateFilters();
        updateDashboard();
    });

    const addAccountModal = document.getElementById('add-account-modal');
    document.getElementById('close-add-account-modal')?.addEventListener('click', () => { addAccountModal.style.display = 'none'; });

    document.getElementById('add-account-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const bId = document.getElementById('add-acc-building-id').value;
        const building = allBuildings.find(b => b.id === bId);
        if (building) {
            const newAcc = {
                type: document.getElementById('add-acc-type').value,
                id_number: document.getElementById('add-acc-id').value,
                provider: document.getElementById('add-acc-provider').value,
                account_address: document.getElementById('add-acc-address').value,
                contractEndDate: document.getElementById('add-acc-enddate').value
            };
            if (!building.accounts) building.accounts = [];
            building.accounts.push(newAcc);
            logAudit(`Added ${newAcc.type} MPRN for ${newAcc.account_address} at Building ${building.name}`);
        }
        addAccountModal.style.display = 'none';
        updateFilters();
    });

    const editAccountModal = document.getElementById('edit-account-modal');
    document.getElementById('close-edit-account-modal')?.addEventListener('click', () => { editAccountModal.style.display = 'none'; });

    document.getElementById('edit-account-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const bId = document.getElementById('edit-acc-building-id').value;
        const origId = document.getElementById('edit-acc-original-id').value;
        const building = allBuildings.find(b => b.id === bId);
        if (building && building.accounts) {
            const accIndex = building.accounts.findIndex(a => a.id_number === origId);
            if (accIndex !== -1) {
                building.accounts[accIndex].id_number = document.getElementById('edit-acc-id').value;
                building.accounts[accIndex].provider = document.getElementById('edit-acc-provider').value;
                building.accounts[accIndex].account_address = document.getElementById('edit-acc-address').value;
                building.accounts[accIndex].contractEndDate = document.getElementById('edit-acc-enddate').value;
                logAudit(`Edited ${building.accounts[accIndex].type} account on ${building.name}`);
            }
        }
        editAccountModal.style.display = 'none';
        updateFilters();
    });

    // Auth Login Logic
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();

            if (username === 'Super_Admin') {
                sessionStorage.setItem('auth_role', 'Super-Admin');
                sessionStorage.setItem('auth_user_id', username);
                logAudit(`Logged in as Super-Admin`);
                checkAuth();
            } else if (username.endsWith('_Admin')) {
                const companyName = username.split('_')[0].toLowerCase();
                const validCompany = companies.find(c => c.id === companyName);
                if (validCompany) {
                    sessionStorage.setItem('auth_role', 'Company-Admin');
                    sessionStorage.setItem('auth_company', companyName);
                    sessionStorage.setItem('auth_user_id', username);
                    logAudit(`Logged in as Company-Admin for ${companyName}`);
                    checkAuth();
                } else {
                    alert('Company not found in registry.');
                }
            } else {
                alert('Invalid username format. Try Super_Admin or [Company]_Admin');
            }
        });
    }

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        logAudit('Logged out');
        sessionStorage.clear();
        checkAuth();
    });

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
    const notifDropdown = document.getElementById('notification-dropdown');
    if (notifDropdown && event.target !== notifDropdown && !notifDropdown.contains(event.target)) {
        const bell = document.getElementById('notification-bell');
        if (bell && event.target !== bell && !bell.contains(event.target)) {
            notifDropdown.style.display = 'none';
        }
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
        document.getElementById('edit-b-area').value = building.area || '';

        document.getElementById('edit-building-modal').style.display = 'block';
    }
};

window.openAddAccountModal = function(buildingId) {
    document.getElementById('add-account-form').reset();
    document.getElementById('add-acc-building-id').value = buildingId;
    document.getElementById('add-account-modal').style.display = 'block';
};

window.openEditAccountModal = function(buildingId, accountId) {
    const building = allBuildings.find(b => b.id === buildingId);
    if (building && building.accounts) {
        const account = building.accounts.find(a => a.id_number === accountId);
        if (account) {
            document.getElementById('edit-account-form').reset();
            document.getElementById('edit-acc-building-id').value = buildingId;
            document.getElementById('edit-acc-original-id').value = accountId;
            document.getElementById('edit-acc-id').value = account.id_number || '';
            document.getElementById('edit-acc-provider').value = account.provider || '';
            document.getElementById('edit-acc-address').value = account.account_address || '';
            document.getElementById('edit-acc-enddate').value = account.contractEndDate || '';
            document.getElementById('edit-account-modal').style.display = 'block';
        }
    }
};

function checkAuth() {
    const authRole = sessionStorage.getItem('auth_role');
    currentUserId = sessionStorage.getItem('auth_user_id');
    currentUserRole = authRole;

    const authModal = document.getElementById('auth-modal');
    const appContent = document.getElementById('app-content');
    const companyFilter = document.getElementById('company-filter');
    const clientManagerBtn = document.getElementById('client-manager-btn');

    if (!authRole) {
        authModal.style.display = 'flex';
        appContent.style.display = 'none';
    } else {
        authModal.style.display = 'none';
        appContent.style.display = 'block';

        renderAuditLogs();

        if (authRole === 'Company-Admin') {
            const authCompany = sessionStorage.getItem('auth_company');
            if (companyFilter) {
                companyFilter.value = authCompany;
                companyFilter.disabled = true;
            }
            if (clientManagerBtn) {
                clientManagerBtn.style.display = 'none';
            }
        } else if (authRole === 'Super-Admin') {
            if (companyFilter) {
                companyFilter.disabled = false;
            }
            if (clientManagerBtn) {
                clientManagerBtn.style.display = 'inline-block';
            }
        }

        // Trigger filter update with the applied roles
        setTimeout(() => {
            updateFilters();
            checkAlerts();
        }, 100);
    }
}

// 3-Step Guided Entry Wizard Logic
const entryModal = document.getElementById('entry-modal');
const addEntryBtn = document.getElementById('add-entry');
const closeEntryModal = document.getElementById('close-entry-modal');

const wStep1 = document.getElementById('wizard-step-1');
const wStep2 = document.getElementById('wizard-step-2');
const wStep3 = document.getElementById('wizard-step-3');

const wCompany = document.getElementById('wizard-company');
const wBuilding = document.getElementById('wizard-building');
const wAccount = document.getElementById('wizard-account');

const wNext1 = document.getElementById('wizard-next-1');
const wBack2 = document.getElementById('wizard-back-2');
const wNext2 = document.getElementById('wizard-next-2');
const wBack3 = document.getElementById('wizard-back-3');

const wEditAccNum = document.getElementById('wizard-edit-acc-num');
const wEditEndDate = document.getElementById('wizard-edit-enddate');

if (addEntryBtn) {
    addEntryBtn.addEventListener('click', () => {
        // Reset wizard
        wStep1.style.display = 'block';
        wStep2.style.display = 'none';
        wStep3.style.display = 'none';

        // Auto-select company if company admin
        if (currentUserRole === 'Company-Admin') {
            wCompany.value = sessionStorage.getItem('auth_company');
            wCompany.disabled = true;
        } else {
            wCompany.value = '';
            wCompany.disabled = false;
        }

        entryModal.style.display = 'block';
    });
}

if (closeEntryModal) {
    closeEntryModal.addEventListener('click', () => {
        entryModal.style.display = 'none';
    });
}

window.addEventListener('click', (event) => {
    if (event.target == entryModal) {
        entryModal.style.display = 'none';
    }
});

// Step 1 -> 2
if (wNext1) {
    wNext1.addEventListener('click', () => {
        if (!wCompany.value) {
            alert('Please select a company first.');
            return;
        }

        // Populate buildings
        wBuilding.innerHTML = '<option value="" disabled selected>Select Building</option>';
        const filtered = allBuildings.filter(b => b.companyId === wCompany.value);
        filtered.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.name;
            wBuilding.appendChild(opt);
        });

        wStep1.style.display = 'none';
        wStep2.style.display = 'block';
    });
}

// Step 2 Back
if (wBack2) {
    wBack2.addEventListener('click', () => {
        wStep2.style.display = 'none';
        wStep1.style.display = 'block';
    });
}

// Step 2 -> 3
if (wNext2) {
    wNext2.addEventListener('click', () => {
        if (!wBuilding.value) {
            alert('Please select a building.');
            return;
        }

        const b = allBuildings.find(x => x.id === wBuilding.value);
        if (!b) return;

        // Populate accounts
        wAccount.innerHTML = '<option value="" disabled selected>Select Account</option>';
        if (b.accounts) {
            b.accounts.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id_number;
                opt.textContent = `${a.type} - ${a.id_number}`;
                opt.dataset.type = a.type;
                opt.dataset.enddate = a.contractEndDate;
                wAccount.appendChild(opt);
            });
        }

        wStep2.style.display = 'none';
        wStep3.style.display = 'block';
    });
}

// Step 3 Back
if (wBack3) {
    wBack3.addEventListener('click', () => {
        wStep3.style.display = 'none';
        wStep2.style.display = 'block';
    });
}

// Auto-fill editable fields on account selection
if (wAccount) {
    wAccount.addEventListener('change', () => {
        const selected = wAccount.options[wAccount.selectedIndex];
        wEditAccNum.value = selected.value;
        wEditEndDate.value = selected.dataset.enddate || '';
    });
}

document.getElementById('tracker-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!wBuilding.value || !wAccount.value) {
        alert('Please complete the wizard properly.');
        return;
    }

    // Handle potential inline edits
    const bId = wBuilding.value;
    const oldAccNum = wAccount.value; // The original one selected
    const newAccNum = wEditAccNum.value;
    const newEndDate = wEditEndDate.value;

    const selectedOpt = wAccount.options[wAccount.selectedIndex];
    const accType = selectedOpt.dataset.type;

    const building = allBuildings.find(b => b.id === bId);
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
        }
    }

    const data = {
        building_id: bId,
        type: accType.toLowerCase(),
        account_number: newAccNum,
        value: document.getElementById('reading-value').value,
        cost: document.getElementById('reading-cost').value,
        date: document.getElementById('reading-date').value
    };

    // Save to LocalStorage (2026 simple storage)
    let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
    readings.push(data);
    localStorage.setItem('utility_readings', JSON.stringify(readings));

    logAudit(`Added new ${accType} reading for account ${newAccNum}`);

    alert('Reading Saved!');
    this.reset();
    entryModal.style.display = 'none';

    updateDashboard();
    renderChart();
});
