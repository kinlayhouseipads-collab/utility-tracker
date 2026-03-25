const supabaseClient = typeof window !== 'undefined' && window.supabase ? window.supabase.createClient(((typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL) ? process.env.SUPABASE_URL : 'https://jzzbbttgvkdqwkjynuxi.supabase.co'), ((typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY) ? process.env.SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6emJidHRndmtkcXdranludXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDI3NTIsImV4cCI6MjA4OTQxODc1Mn0.00ezfkTV8zMG8_5BU-WTWzRfA6tj1JV37m2O1fbD7kY')) : null;

let utilityChartInstance = null;
let activeBuildingId = null;

let allBuildings = [];
let sortEndDateAscending = true; // Track sorting state globally
let currentUserRole = null;
let currentUserId = null;
let energyAccountsSubscription = null;

let companies = [];


// Function to save companies
function saveCompanies() {
    localStorage.setItem('utility_companies', JSON.stringify(companies));
    saveToLocalStorage(); // Ensure it also triggers the main save
}


function showToast(message, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.style.background = type === 'success' ? '#10b981' : '#3b82f6';
    toast.style.color = '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.fontSize = '0.9em';
    toast.style.fontWeight = '600';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';

    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-spinner fa-spin';
    toast.appendChild(icon);

    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (toast.parentElement) toast.parentElement.removeChild(toast);
        }, 300);
    }, 3000);
}


// Global Storage Strategy
function saveToLocalStorage() {
    const authRole = sessionStorage.getItem('auth_role');
    if (authRole) {
        return; // Disable fallback save if logged in
    }

    showToast('Saving...', 'info');
    const data = {
        buildings: allBuildings,
        companies: companies
    };
    localStorage.setItem('VestaLogic_Storage', JSON.stringify(data));
    setTimeout(() => {
        showToast('VestaLogic ledger updated', 'success');
    }, 500); // slight delay to show the sequence
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
            <div style="color: #cbd5e1; margin-top: 2px;">${log.action}</div>
        `;
        container.appendChild(el);
    });
}


async function loadBuildings() {
    try {
        const buildingsListContainer = document.getElementById('buildings-list');
        if (buildingsListContainer) {
            buildingsListContainer.innerHTML = '<div style="padding: 20px;"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
        }

        // Force fetch from cloud to ensure True Cloud-Only state
        allBuildings = [];
        companies = [];
        localStorage.removeItem('VestaLogic_Storage');
        fetchDataFromSupabase();
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
            <th style="padding: 20px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Property Name/Address</th>
            <th style="padding: 20px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Company Badge</th>
            <th id="sort-end-date" style="padding: 20px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-weight: 600; font-size: 0.9em; text-transform: uppercase; cursor: pointer;">Contract End Date &#x21C5;</th>
            <th style="padding: 20px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Days Since Last Bill</th>
            <th style="padding: 20px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-weight: 600; font-size: 0.9em; text-transform: uppercase;">Total Cost</th>
            <th style="padding: 20px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-weight: 600; font-size: 0.9em; text-transform: uppercase; text-align: center;">Actions</th>
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
    const formatCurrency = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

    buildings.forEach((building, index) => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        row.style.transition = 'background-color 0.2s';

        // Active selection styling
        if (building.id === activeBuildingId) {
            row.style.backgroundColor = 'rgba(0, 229, 229, 0.1)';
        }

        row.addEventListener('mouseover', () => {
            if (building.id !== activeBuildingId) {
                row.style.backgroundColor = 'rgba(255,255,255,0.05)';
            }
        });
        row.addEventListener('mouseout', () => {
            if (building.id !== activeBuildingId) {
                row.style.backgroundColor = 'transparent';
            }
        });

        const companyObj = companies.find(c => c.id === building.companyId);
        const companyName = companyObj ? companyObj.name : 'Unknown';


        const today = new Date('2026-03-12T00:00:00');

        // Contract End Date logic
        const end = new Date(building.contractEndDate);
        const diffEndDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        const endStyle = diffEndDays < 30 ? 'color: #ef4444; font-weight: bold;' : 'color: #cbd5e1;';

        // Last Updated (Staleness logic)
        let lastUpdatedText = 'No bills';
        let stalenessStyle = 'color: #cbd5e1;';
        let buildingTotalCost = 0;
        let diffStaleDays = -1;

        const startDateFilter = document.getElementById('start-date-filter')?.value;
        const endDateFilter = document.getElementById('end-date-filter')?.value;

        if (building.billHistory && building.billHistory.length > 0) {
            const maxDate = new Date(Math.max(...building.billHistory.map(b => new Date(b.date).getTime())));
            diffStaleDays = Math.ceil((today - maxDate) / (1000 * 60 * 60 * 24));

            lastUpdatedText = `${diffStaleDays} days`;

            // Building Level Aggregation
            buildingTotalCost = building.billHistory.reduce((sum, bill) => {
                let withinDateRange = true;
                if (startDateFilter && endDateFilter) {
                    const bDate = new Date(bill.date);
                    const sDate = new Date(startDateFilter);
                    const eDate = new Date(endDateFilter);
                    if (bDate < sDate || bDate > eDate) {
                        withinDateRange = false;
                    }
                }
                return sum + (withinDateRange ? (parseFloat(bill.cost) || 0) : 0);
            }, 0);
        }

        row.innerHTML = `
            <td style="padding: 20px 15px;">
                <div style="font-weight: 500; font-size: 1.05em; color: #f8fafc;">${building.name}</div>
                <div style="color: #cbd5e1; font-size: 0.85em; margin-top: 4px;">${building.address}</div>
            </td>
            <td style="padding: 20px 15px;">
                <span style="background: rgba(255,255,255,0.1); color: #f8fafc; padding: 6px 10px; border-radius: 6px; font-size: 0.85em; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
                    <span style="display:inline-block; width:8px; height:8px; background:var(--primary); border-radius:50%;"></span>
                    ${companyName}
                </span>
            </td>
            <td style="padding: 20px 15px; font-size: 0.95em; ${endStyle}">
                ${formatDate(building.contractEndDate)}
            </td>
            <td style="padding: 20px 15px; font-size: 0.95em; ${stalenessStyle}">
                ${lastUpdatedText}
            </td>
            <td style="padding: 20px 15px; font-size: 0.95em; font-weight: bold; color: var(--primary);" class="monospace">
                ${formatCurrency.format(buildingTotalCost)}
            </td>
            <td style="padding: 20px 15px; text-align: center;">
                <button onclick="openEditModal('${building.id}')" style="background: transparent; border: none; cursor: pointer; color: #cbd5e1; margin-right: 10px;" title="Edit Property">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="requestDeleteBuilding('${building.id}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444;" title="Delete Property">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        // Create Expandable Accordion Row for Accounts
        const accordionRow = document.createElement('tr');
        accordionRow.style.display = 'none';
        accordionRow.style.backgroundColor = 'rgba(255,255,255,0.02)';

        let accountsHtml = '<div style="padding: 15px 40px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(255,255,255,0.1);">';

        // --- Linked Metered Accounts Table ---
        accountsHtml += '<div style="display: flex; justify-content: space-between; align-items: center;"><h4 style="margin:0; color: #f8fafc;">Linked Metered Accounts</h4>';
        accountsHtml += `<button class="btn-primary" onclick="openAddAccountModal('${building.id}')" style="padding: 6px 12px; font-size: 0.85em;">+ Add Metered Account</button></div>`;

        accountsHtml += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;">';
        accountsHtml += '<thead><tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Type</th><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Provider</th><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Address/Location</th><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Account # (MPRN/GPRN)</th><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">End Date</th><th style="text-align: center; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Actions</th></tr></thead>';
        accountsHtml += '<tbody>';

        if (building.accounts && building.accounts.length > 0) {
            building.accounts.forEach(acc => {
                accountsHtml += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: transparent;">
                    <td style="padding: 8px; font-weight: 600; color: #f8fafc;">${acc.type}</td>
                    <td style="padding: 8px; color: #cbd5e1;">${acc.provider || 'N/A'}</td>
                    <td style="padding: 8px; color: #cbd5e1;">${acc.account_address || 'N/A'}</td>
                    <td style="padding: 8px; color: #cbd5e1;" class="monospace">${acc.id_number || 'N/A'}</td>
                    <td style="padding: 8px; color: #cbd5e1;">${formatDate(acc.contractEndDate)}</td>
                    <td style="padding: 8px; text-align: center;">
                        <button onclick="openEditAccountModal('${building.id}', '${acc.id_number}')" style="background: transparent; border: none; cursor: pointer; color: #cbd5e1; margin-right: 5px;"><i class="fas fa-edit"></i></button>
                        <button onclick="requestDeleteAccount('${building.id}', '${acc.id_number}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            });
        } else {
            accountsHtml += `<tr><td colspan="6" style="padding: 15px; text-align: center; color: #cbd5e1;">No accounts linked to this building.</td></tr>`;
        }
        accountsHtml += '</tbody></table>';

        // --- Bill History Table ---
        accountsHtml += '<div style="display: flex; justify-content: space-between; align-items: center;"><h4 style="margin:0; color: #f8fafc;">Bill History</h4></div>';
        accountsHtml += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
        accountsHtml += '<thead><tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Date</th><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Account Address</th><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Type</th><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Reading</th><th style="text-align: left; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Cost</th><th style="text-align: center; padding: 8px; color: #cbd5e1; font-size: 0.85em;">Actions</th></tr></thead>';
        accountsHtml += '<tbody>';

        let allBills = [];
        if (building.billHistory) {
            building.billHistory.forEach(bill => {
                if (new Date(bill.date) < new Date('2026-01-01')) return;

                if (bill.utility_type === 'Gas' || parseFloat(bill.usage_m3) > 0) {
                    const usage = bill.utility_type === 'Gas' ? (parseFloat(bill.usage_kwh) || parseFloat(bill.usage_m3) || 0) : (parseFloat(bill.usage_m3) || 0);
                    if (usage > 0) {
                        allBills.push({
                            date: bill.date,
                            account_address: building.accounts?.find(a => a.type === 'Gas')?.account_address || building.address,
                            type: 'Gas',
                            reading: `${usage.toFixed(2)} kWh`,
                            cost: parseFloat(bill.cost),
                            id: bill.id,
                            mprn_number: building.accounts?.find(a => a.type === 'Gas')?.id_number || 'N/A'
                        });
                    }
                } else if (parseFloat(bill.usage_kwh) > 0) {
                    allBills.push({
                        date: bill.date,
                        account_address: building.accounts?.find(a => a.type === 'Electricity')?.account_address || building.address,
                        type: 'Electricity',
                        reading: `${parseFloat(bill.usage_kwh).toFixed(2)} kWh`,
                        cost: parseFloat(bill.cost),
                        id: bill.id,
                        mprn_number: building.accounts?.find(a => a.type === 'Electricity')?.id_number || 'N/A'
                    });
                }
            });
        }
        allBills.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allBills.length > 0) {
            allBills.forEach(bill => {
                accountsHtml += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: transparent;">
                    <td style="padding: 8px; color: #cbd5e1;">${formatDate(bill.date)}</td>
                    <td style="padding: 8px; color: #cbd5e1;">${bill.account_address}</td>
                    <td style="padding: 8px; font-weight: 600; color: #f8fafc;">${bill.type}</td>
                    <td style="padding: 8px; color: #cbd5e1;">${bill.reading}</td>
                    <td style="padding: 8px; font-weight: bold; color: var(--primary);" class="monospace">${formatCurrency.format(bill.cost)}</td>
                    <td style="padding: 8px; text-align: center;">
                        <button onclick="requestDeleteBill('${bill.id}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444;" title="Delete Bill">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            });
        } else {
            accountsHtml += `<tr><td colspan="6" style="padding: 15px; text-align: center; color: #cbd5e1;">No bills found for this building.</td></tr>`;
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
    document.getElementById('confirm-title').innerText = 'Delete Property';
    document.getElementById('confirm-message').innerText = `Are you sure you want to delete "${building.name}"? All associated accounts and readings will be lost.`;

    document.getElementById('double-confirm-container').style.display = 'block';
    document.getElementById('double-confirm-input').value = '';

    document.getElementById('confirm-modal').style.display = 'block';
};

window.requestDeleteInsurance = async function(insuranceId) {
    if (!confirm("Are you sure you want to delete this insurance policy?")) {
        return;
    }

    if (supabaseClient) {
        try {
            const response = await supabaseClient
                .from('insurance_vault')
                .delete()
                .eq('id', String(insuranceId).trim());

            if (response.error) {
                console.error('Error deleting insurance from Supabase:', response.error);
                window.alert(response.error.message);
            } else {
                showToast('Insurance Deleted', 'success');
                logAudit(`Deleted insurance policy associated with ID ${insuranceId}`);
                fetchDataFromSupabase();
            }
        } catch (err) {
            console.error('Exception during Supabase insurance delete:', err);
            window.alert(err.message);
        }
    }
};

window.requestDeleteBill = async function(billId) {
    if (!confirm("Are you sure you want to delete this bill? This will remove this specific bill's data.")) {
        return;
    }

    console.log('Deleting ID:', billId);

    if (supabaseClient) {
        try {
            const response = await supabaseClient
                .from('energy_accounts')
                .delete()
                .eq('id', String(billId).trim());

            if (response.error) {
                console.error('Error deleting bill from Supabase:', response.error);
                window.alert(response.error.message);
            } else {
                showToast('Bill Deleted', 'success');
                logAudit(`Deleted bill associated with ID ${billId}`);

                // Update local state instead of wiping/rebuilding entire list immediately
                if (window.cloudEnergyData) {
                    const billData = window.cloudEnergyData.find(ed => ed.id === billId);
                    if (billData) {
                        const mprn = billData.mprn_number;
                        const remaining = window.cloudEnergyData.filter(ed => ed.mprn_number === mprn && ed.id !== billId);
                        console.log('Remaining Bills for this MPRN:', remaining.length);
                    } else {
                        console.log('Remaining Bills for this MPRN:', 0); // fallback if not found
                    }
                    window.cloudEnergyData = window.cloudEnergyData.filter(ed => ed.id !== billId);
                } else {
                    console.log('Remaining Bills for this MPRN:', 0);
                }


                allBuildings.forEach(building => {
                    if (building.billHistory) {
                        building.billHistory = building.billHistory.filter(b => b.id !== billId);
                    }
                });

                updateFilters();
            }
        } catch (err) {
            console.error('Exception during Supabase bill delete:', err);
            window.alert(err.message);
        }
    }
};

window.requestDeleteAccount = function(buildingId, accountId) {
    const building = allBuildings.find(b => b.id === buildingId);
    if (!building) return;
    const account = building.accounts.find(a => a.id_number === accountId);
    if (!account) return;

    deleteTarget = { type: 'account', buildingId: buildingId, accountId: accountId };
    document.getElementById('confirm-title').innerText = 'Delete Metered Account';
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
    document.getElementById('confirm-message').innerText = `Are you sure you want to delete the company "${company.name}"? This will archive/delete all associated properties.`;

    document.getElementById('double-confirm-container').style.display = 'block';
    document.getElementById('double-confirm-input').value = '';

    document.getElementById('confirm-modal').style.display = 'block';
};

document.getElementById('confirm-cancel')?.addEventListener('click', () => {
    deleteTarget = null;
    document.getElementById('double-confirm-container').style.display = 'none';
    document.getElementById('confirm-modal').style.display = 'none';
});

window.syncNow = async function() {
    console.log('Starting syncNow process (fetch only)...');
    try {
        await fetchDataFromSupabase();
        showToast('Cloud Data Synced', 'success');
        console.log('syncNow process finished.');
    } catch (err) {
        console.error('Exception during syncNow:', err);
        showToast(err.message, 'error');
    }
};

document.getElementById('confirm-yes')?.addEventListener('click', async () => {
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
            const building = allBuildings[buildingIndex];
            const buildingName = building.name;

            // Delete all associated rows using unique id
            let hasError = false;
            const companyObj = companies.find(c => c.id === building.companyId);
            const companyName = companyObj ? companyObj.name : '';
            let toDelete = window.cloudEnergyData.filter(ed => ed.property_name === buildingName && ed.company_name === companyName);

            if (supabaseClient && toDelete.length > 0) {
                for (const row of toDelete) {
                    try {
                        const response = await supabaseClient
                            .from('energy_accounts')
                            .delete()
                            .eq('id', String(row.id).trim());

                        if (response.error) {
                            console.error('Error deleting from Supabase:', response.error);
                            window.alert(response.error.message);
                            hasError = true;
                        }
                    } catch (err) {
                        console.error('Exception during Supabase delete:', err);
                        window.alert(err.message);
                        hasError = true;
                    }
                }
            }

            if (!hasError) {
                if (supabaseClient) {
                    try {
                        await supabaseClient.from('insurance_vault').delete().eq('account_address', building.address);
                    } catch (e) {
                        console.error('Error deleting related insurance', e);
                    }
                }
                showToast('Property Deleted', 'success');
                logAudit(`Deleted property: ${buildingName}`);
                fetchDataFromSupabase(); // Relying on realtime subscription but insurance vault needs explicit fetch
            }
        }
    } else if (deleteTarget.type === 'account') {
        const building = allBuildings.find(b => b.id === deleteTarget.buildingId);
        if (building) {
            const accountIndex = building.accounts.findIndex(a => a.id_number === deleteTarget.accountId);
            if (accountIndex !== -1) {
                let hasError = false;
                const companyObj = companies.find(c => c.id === building.companyId);
                const companyName = companyObj ? companyObj.name : '';
                let toDelete = window.cloudEnergyData.filter(ed => ed.mprn_number === deleteTarget.accountId && ed.property_name === building.name && ed.company_name === companyName);

                if (supabaseClient && toDelete.length > 0) {
                    for (const row of toDelete) {
                        try {
                            const response = await supabaseClient
                                .from('energy_accounts')
                                .delete()
                                .eq('id', String(row.id).trim());

                            if (response.error) {
                                console.error('Error deleting from Supabase:', response.error);
                                window.alert(response.error.message);
                                hasError = true;
                            }
                        } catch (err) {
                            console.error('Exception during Supabase delete:', err);
                            window.alert(err.message);
                            hasError = true;
                        }
                    }
                }

                if (!hasError) {
                    showToast('Account Deleted', 'success');
                    logAudit(`Deleted account ${deleteTarget.accountId} from building ${building.name}`);
                    // Relying on realtime subscription
                }
            }
        }
    } else if (deleteTarget.type === 'company') {
        const companyIndex = companies.findIndex(c => c.id === deleteTarget.companyId);
        if (companyIndex !== -1) {
            const companyName = companies[companyIndex].name;

            // Delete Company using unique ids
            let hasError = false;
            let toDelete = window.cloudEnergyData.filter(ed => ed.company_name === companyName);

            if (supabaseClient && toDelete.length > 0) {
                for (const row of toDelete) {
                    try {
                        const response = await supabaseClient
                            .from('energy_accounts')
                            .delete()
                            .eq('id', String(row.id).trim());

                        if (response.error) {
                            console.error('Error deleting from Supabase:', response.error);
                            window.alert(response.error.message);
                            hasError = true;
                        }
                    } catch (err) {
                        console.error('Exception during Supabase delete:', err);
                        window.alert(err.message);
                        hasError = true;
                    }
                }
            }

            if (!hasError) {
                // Also clean up insurance policies for buildings owned by this company
                const companyBuildings = allBuildings.filter(b => b.companyId === deleteTarget.companyId);
                if (supabaseClient && companyBuildings.length > 0) {
                    for (const cb of companyBuildings) {
                        try {
                            await supabaseClient.from('insurance_vault').delete().eq('account_address', cb.address);
                        } catch (e) {
                            console.error('Error deleting related insurance for company building', e);
                        }
                    }
                }

                showToast('Company Deleted', 'success');
                logAudit(`Deleted company: ${companyName} and associated properties.`);
                fetchDataFromSupabase();
            }
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
        document.getElementById('selected-building-name').textContent = 'All Properties Dashboard';
    } else {
        activeBuildingId = building.id;
        document.getElementById('selected-building-name').textContent = `${building.name} Dashboard`;
    }

    updateDashboard();
    renderChart();
}

function updateDashboard() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const searchBar = document.getElementById('search-bar')?.value;
    const companyFilter = document.getElementById('company-filter')?.value;
    const startDateFilter = document.getElementById('start-date-filter')?.value;
    const endDateFilter = document.getElementById('end-date-filter')?.value;

    let totalElectricity = 0;
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
                if (billDate < new Date('2026-01-01') || billDate > new Date('2026-12-31T23:59:59')) return;

                let withinDateRange = false;

                if (startDateFilter && endDateFilter) {
                    const start = new Date(startDateFilter);
                    const end = new Date(endDateFilter);
                    withinDateRange = billDate >= start && billDate <= end;
                } else {
                    withinDateRange = true;
                }

                if (withinDateRange) {
                    if (bill.utility_type === 'Gas') {
                        totalGas += parseFloat(bill.usage_kwh) || parseFloat(bill.usage_m3) || 0;
                    } else if (bill.utility_type === 'Electricity') {
                        totalElectricity += parseFloat(bill.usage_kwh) || 0;
                    } else {
                        // Fallback logic
                        if (parseFloat(bill.usage_m3) > 0) {
                            totalGas += parseFloat(bill.usage_m3) || 0;
                        } else {
                            totalElectricity += parseFloat(bill.usage_kwh) || 0;
                        }
                    }
                    totalCost += parseFloat(bill.cost) || 0;
                }
            });
        }
    });


    document.getElementById('stat-electricity').textContent = totalElectricity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' kWh';
    if (document.getElementById('stat-gas')) {
        document.getElementById('stat-gas').textContent = totalGas.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' kWh';
    }

    // Total for entire filtered view based on Date Filter
    let grandTotal = 0;
    let totalArea = 0;
    targetBuildings.forEach(building => {
        if (building.billHistory) {
            grandTotal += building.billHistory.reduce((s, bill) => {
                const billDate = new Date(bill.date);
                if (billDate < new Date('2026-01-01') || billDate > new Date('2026-12-31T23:59:59')) return s;

                let withinDateRange = false;

                if (startDateFilter && endDateFilter) {
                    const start = new Date(startDateFilter);
                    const end = new Date(endDateFilter);
                    withinDateRange = billDate >= start && billDate <= end;
                } else {
                    withinDateRange = true;
                }
                return s + (withinDateRange ? (parseFloat(bill.cost) || 0) : 0);
            }, 0);
        }
        totalArea += Number(building.area) || 1000;
    });


    const formatCurrency = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
    document.getElementById('stat-cost').textContent = formatCurrency.format(grandTotal);
}

function renderChart() {
    let electricReadings = [];
    let gasReadings = [];

    // Gather all historical bills and normalize them for charting
    let targetBuildings = allBuildings;
    if (activeBuildingId) {
        targetBuildings = targetBuildings.filter(b => b.id === activeBuildingId);
    } else {
        const companyFilter = document.getElementById('company-filter')?.value;
        const searchBar = document.getElementById('search-bar')?.value;

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

    const startDateFilter = document.getElementById('start-date-filter')?.value;
    const endDateFilter = document.getElementById('end-date-filter')?.value;

    targetBuildings.forEach(b => {
        if (b.billHistory) {
            b.billHistory.forEach(bill => {
                if (new Date(bill.date) < new Date('2026-01-01')) return;
                let withinDateRange = true;
                if (startDateFilter && endDateFilter) {
                    const billDate = new Date(bill.date);
                    const start = new Date(startDateFilter);
                    const end = new Date(endDateFilter);
                    if (billDate < start || billDate > end) withinDateRange = false;
                }
                if (withinDateRange) {
                    const billCost = parseFloat(bill.cost) || 0;

                    if (bill.utility_type === 'Gas') {
                        gasReadings.push({ date: bill.date, cost: billCost });
                    } else if (bill.utility_type === 'Electricity') {
                        electricReadings.push({ date: bill.date, cost: billCost });
                    } else {
                        if (parseFloat(bill.usage_m3) > 0) {
                            gasReadings.push({ date: bill.date, cost: billCost });
                        } else {
                            electricReadings.push({ date: bill.date, cost: billCost });
                        }
                    }
                }
            });
        }

    });

    // Group costs by month
    const electricMonthlyCosts = Array(12).fill(0);
    const gasMonthlyCosts = Array(12).fill(0);

    electricReadings.forEach(r => {
        const d = new Date(r.date);
        const m = d.getMonth(); // 0-11
        electricMonthlyCosts[m] += r.cost;
    });

    gasReadings.forEach(r => {
        const d = new Date(r.date);
        const m = d.getMonth(); // 0-11
        gasMonthlyCosts[m] += r.cost;
    });

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const ctx = document.getElementById('utilityChart').getContext('2d');

    if (utilityChartInstance) {
        utilityChartInstance.destroy();
    }

    let chartTitle = 'Total Portfolio Cost by Utility';
    if (activeBuildingId) {
        const activeBuilding = allBuildings.find(b => b.id === activeBuildingId);
        if (activeBuilding) {
            chartTitle = `${activeBuilding.name} Cost by Utility`;
        }
    } else {
        const companyFilter = document.getElementById('company-filter')?.value;
        if (companyFilter) {
            const comp = companies.find(c => c.id === companyFilter);
            if (comp) {
                chartTitle = `${comp.name} Portfolio Cost by Utility`;
            }
        }
    }

    if (electricReadings.length === 0 && gasReadings.length === 0) {
        chartTitle = 'Ready for Data';
    }

    utilityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Electric Cost (€)`,
                    data: electricMonthlyCosts,
                    borderColor: '#635BFF',
                    backgroundColor: '#635BFF',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: `Gas Cost (€)`,
                    data: gasMonthlyCosts,
                    borderColor: '#f97316',
                    backgroundColor: '#f97316',
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
                    text: chartTitle,
                    color: '#f8fafc'
                },
                legend: {
                    labels: {
                        color: '#f8fafc'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#f8fafc'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#f8fafc',
                        callback: function(value) {
                            return '€' + value;
                        }
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
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

    renderBuildings(filteredBuildings);
    updateDashboard();
    renderChart();
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
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.1)';

        tr.innerHTML = `
            <td style="padding: 20px 15px; font-weight: 500;">${company.id}</td>
            <td style="padding: 20px 15px;">${company.name}</td>
            <td style="padding: 20px 15px;">${company.industry}</td>
            <td style="padding: 20px 15px; text-align: center;">
                <button onclick="openEditCompanyModal('${company.id}')" style="background: transparent; border: none; cursor: pointer; color: #cbd5e1; margin-right: 10px;" title="Edit Company">
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

        // Stale Readings per Account

        if (building.accounts && building.accounts.length > 0) {
            building.accounts.forEach(acc => {
                let maxDate = 0;

                // check billHistory for this account's usage
                if (building.billHistory && building.billHistory.length > 0) {
                    building.billHistory.forEach(b => {
                        if (acc.type === 'Electricity' && b.utility_type !== 'Gas' && parseFloat(b.usage_kwh) > 0) {
                            maxDate = Math.max(maxDate, new Date(b.date).getTime());
                        } else if (acc.type === 'Gas' && (b.utility_type === 'Gas' || parseFloat(b.usage_m3) > 0)) {
                            maxDate = Math.max(maxDate, new Date(b.date).getTime());
                        }
                    });
                }



                if (maxDate > 0) {
                    const diffStaleDays = Math.ceil((today - maxDate) / (1000 * 60 * 60 * 24));
                    if (diffStaleDays > 60) {
                        notifications.push({
                            type: 'Stale Reading',
                            message: `${acc.type} Account (${acc.id_number}) at ${building.name} hasn't been updated in ${diffStaleDays} days`,
                            buildingId: building.id
                        });
                    }
                } else {
                    notifications.push({
                        type: 'No Data',
                        message: `${acc.type} Account (${acc.id_number}) at ${building.name} has no readings`,
                        buildingId: building.id
                    });
                }
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
                    <div style="color: #cbd5e1; font-size: 0.95em;">${n.message}</div>
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

async function fetchDataFromSupabase() {

    console.log('Fetching data from Supabase for Grids...');
    const formatCurrency = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

    if (supabaseClient) {
        if (!energyAccountsSubscription) {
            energyAccountsSubscription = supabaseClient
                .channel('schema-db-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'energy_accounts' }, payload => {
                    console.log('Realtime change received!', payload);

                    if (payload.eventType === 'INSERT') {
                        // Prevent "Echo" effect: don't fetch if we already have it locally
                        const newId = payload.new.id;
                        let existsLocally = false;
                        for (const b of allBuildings) {
                            if (b.billHistory && b.billHistory.find(bill => bill.id === newId)) {
                                existsLocally = true;
                                break;
                            }
                        }
                        if (!existsLocally) {
                            fetchDataFromSupabase();
                        } else {
                            console.log('Realtime INSERT ignored: already exists locally');
                        }
                    } else {
                        // UPDATE or DELETE
                        fetchDataFromSupabase();
                    }
                })
                .subscribe();
        }

        try {
            // Fetch Energy Accounts
            const { data: energyData, error: energyError } = await supabaseClient.from('energy_accounts').select('*');
            if (energyError) {
                console.error('Error fetching energy_accounts from Supabase', energyError);
                const energyGrid = document.getElementById('energy-list-grid');
                if (energyGrid) energyGrid.innerHTML = '';
                window.alert(energyError.message);
            } else {
                console.log('Supabase energy_accounts fetch result:', energyData);

                // State Management: Update the global state and call render functions
                window.cloudEnergyData = energyData;

                // Do not wipe `allBuildings` and `companies` to prevent zero-bill properties from vanishing.
                // Clear the `buildings-list` inner HTML as it will be re-rendered via `updateFilters`.
                document.getElementById('buildings-list').innerHTML = '';

                // Keep existing companies, only add new ones from data
                // Keep existing properties, only add new ones from data

                // Clear billHistory from all existing buildings so we can repopulate from cloud
                allBuildings.forEach(b => {
                    b.billHistory = [];
                    // Keep accounts intact if possible, but they are tied to properties.
                    // To handle dynamically built accounts properly without wiping existing manual entries:
                    // we'll leave b.accounts alone, but ensure they aren't duplicated.
                });

                let bCount = allBuildings.length + 1;

                energyData.forEach(ed => {
                    const propName = ed.property_name || 'Unknown Property';
                    const compName = ed.company_name || 'Unknown Company';
                    const compId = compName.toLowerCase().replace(/[^a-z0-9]/g, '');

                    // Add company if not present
                    if (!companies.find(c => c.id === compId)) {
                        companies.push({ id: compId, name: compName, industry: 'Unknown' });
                    }

                    // Find existing building or create new
                    let existingBuilding = allBuildings.find(b => b.name === propName && b.companyId === compId);

                    if (!existingBuilding) {
                        const newId = 'B' + String(bCount++).padStart(3, '0');
                        existingBuilding = {
                            id: newId,
                            name: propName,
                            address: propName + ' Address',
                            companyId: compId,
                            area: 1000,
                            accounts: [],
                            billHistory: []
                        };
                        allBuildings.push(existingBuilding);
                    }

                    // Add account if not present in this building
                    if (ed.mprn_number) {
                        if (!existingBuilding.accounts) existingBuilding.accounts = [];
                        if (!existingBuilding.accounts.find(a => a.id_number === ed.mprn_number)) {
                            existingBuilding.accounts.push({
                                type: ed.utility_type === 'Gas' ? 'Gas' : 'Electricity',
                                id_number: ed.mprn_number,
                                provider: 'Utility Co',
                                contractEndDate: '2026-12-31'
                            });
                        }
                    }

                    // Always add the bill
                    existingBuilding.billHistory.push({
                        id: ed.id,
                        date: ed.bill_date || ed.last_updated || new Date().toISOString(),
                        usage_kwh: ed.usage_kwh || ed.current_kwh || 0,
                        cost: ed.total_cost || 0,
                        utility_type: ed.utility_type || (ed.usage_m3 > 0 ? 'Gas' : 'Electricity')
                    });
                });

                populateCompanyDropdowns();
                renderClientManager();


                updateFilters(); // call render functions

                const energyGrid = document.getElementById('energy-list-grid');
                if (energyGrid) {
                    energyGrid.innerHTML = '';
                }
                if (energyGrid && energyData && energyData.length > 0) {
                    energyData.forEach(account => {
                        const card = document.createElement('div');
                        card.className = 'card';
                        card.style.textAlign = 'left';
                        card.style.cursor = 'pointer';

                        // Action: Open the new reading wizard when clicked
                        card.onclick = () => {
                            const addEntryBtn = document.getElementById('add-entry');
                            if (addEntryBtn) addEntryBtn.click();
                        };

                        card.innerHTML = `
                            <h3 style="margin-top: 0; margin-bottom: 5px; color: var(--text);">${account.property_name || 'Unknown Property'}</h3>
                            <div class="monospace" style="color: #cbd5e1; font-size: 0.9em; margin-bottom: 15px;">${account.mprn_number || account.mprn || 'N/A'}</div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto;">
                                <div>
                                    <div style="font-size: 0.8em; color: #94a3b8; text-transform: uppercase;">Usage</div>
                                    <div style="font-weight: 600; color: #f8fafc;">${(account.current_kwh || account.usage_kwh) ? Number(account.current_kwh || account.usage_kwh).toLocaleString() + ' kWh' : '0 kWh'}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 0.8em; color: #94a3b8; text-transform: uppercase;">Total Cost</div>
                                    <div class="monospace" style="font-weight: bold; color: var(--primary);">${formatCurrency.format(Number(account.total_cost || 0))}</div>
                                </div>
                            </div>
                        `;
                        energyGrid.appendChild(card);
                    });
                }
            }

            // Fetch Insurance Vault
            const { data: insuranceData, error: insuranceError } = await supabaseClient.from('insurance_vault').select('*');
            if (insuranceError) {
                console.error('Error fetching insurance_vault from Supabase', insuranceError);
                const insuranceGrid = document.getElementById('insurance-vault-grid');
                if (insuranceGrid) insuranceGrid.innerHTML = '';
                window.alert(insuranceError.message);
            } else {
                console.log('Supabase insurance_vault fetch result:', insuranceData);
                const insuranceGrid = document.getElementById('insurance-vault-grid');
                if (insuranceGrid && insuranceData) {
                    insuranceGrid.innerHTML = '';
                    // Sort by renewal_date descending
                    const sortedInsurance = [...insuranceData].sort((a, b) => new Date(b.renewal_date) - new Date(a.renewal_date));

                    sortedInsurance.forEach(policy => {
                        const card = document.createElement('div');
                        card.className = 'card';
                        card.style.textAlign = 'left';

                        card.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h3 style="margin-top: 0; margin-bottom: 5px; color: var(--text);">${policy.broker_name || policy.provider_name || 'Unknown Provider'}</h3>
                                    <div style="color: #cbd5e1; font-size: 0.9em; margin-bottom: 5px;">${policy.account_address || 'Unknown Property'}</div>
                                    <div class="monospace" style="color: #cbd5e1; font-size: 0.9em; margin-bottom: 15px;">${policy.policy_type || policy.insurance_type || 'N/A'} - ${policy.policy_number || 'N/A'}</div>
                                </div>
                                <button onclick="requestDeleteInsurance('${policy.id}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444;" title="Delete Insurance">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto;">
                                <div>
                                    <div style="font-size: 0.8em; color: #94a3b8; text-transform: uppercase;">Renewal Date</div>
                                    <div style="font-weight: 600; color: #f8fafc;">${policy.renewal_date ? formatDate(policy.renewal_date) : 'N/A'}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 0.8em; color: #94a3b8; text-transform: uppercase;">Premium</div>
                                    <div class="monospace" style="font-weight: bold; color: #eab308;">${formatCurrency.format(Number(policy.premium_cost || 0))}</div>
                                </div>
                            </div>
                        `;
                        insuranceGrid.appendChild(card);
                    });
                }
            }

        } catch(err) {
            console.error('Exception fetching from supabase:', err);
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

    // Setup Backup Data
    const backupBtn = document.getElementById('backup-data-btn');
    if (backupBtn) {
        backupBtn.addEventListener('click', () => {
            const dataStr = localStorage.getItem('VestaLogic_Storage');
            if (dataStr) {
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vestalogic_backup.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                logAudit('Exported Data Backup');
            } else {
                alert('No data to backup.');
            }
        });
    }

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
                        return billDate >= start && billDate <= end && billDate >= new Date('2026-01-01');
                    });
                });
            }

            // Generate CSV
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Property Name,Address,Company,MPRN,GPRN,Status\n";

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
                    const validBills = building.billHistory.filter(b => new Date(b.date) >= new Date('2026-01-01'));
                    if (validBills.length > 0) {
                        maxDate = Math.max(...validBills.map(b => new Date(b.date).getTime()));
                    }
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

    // View Contracts Logic
    const viewContractsBtn = document.getElementById('view-contracts');
    const contractDatesSection = document.getElementById('contract-dates-section');
    const buildingsListSec = document.getElementById('buildings-list');
    const dashboardGridSec = document.querySelector('.dashboard-grid');
    const chartSectionSec = document.querySelector('.chart-section');
    const searchSectionSec = document.querySelector('.search-section');
    const energyListGridSec = document.getElementById('energy-list-grid');
    const energyGridHeader = energyListGridSec ? energyListGridSec.previousElementSibling : null;
    const insuranceVaultGridSec = document.getElementById('insurance-vault-grid');
    const insuranceGridHeader = insuranceVaultGridSec ? insuranceVaultGridSec.previousElementSibling : null;

    if (viewContractsBtn) {
        viewContractsBtn.addEventListener('click', () => {
            if (contractDatesSection.style.display === 'none') {
                // Show contract dates
                contractDatesSection.style.display = 'block';
                buildingsListSec.style.display = 'none';
                if(dashboardGridSec) dashboardGridSec.style.display = 'none';
                if(chartSectionSec) chartSectionSec.style.display = 'none';
                if(searchSectionSec) searchSectionSec.style.display = 'none';
                if(clientManagerSection) clientManagerSection.style.display = 'none';
                if(energyListGridSec) { energyListGridSec.style.display = 'none'; if (energyGridHeader) energyGridHeader.style.display = 'none'; }
                if(insuranceVaultGridSec) { insuranceVaultGridSec.style.display = 'none'; if (insuranceGridHeader) insuranceGridHeader.style.display = 'none'; }
                viewContractsBtn.textContent = 'Back to Dashboard';
                renderContractDates();
            } else {
                // Hide contract dates
                contractDatesSection.style.display = 'none';
                buildingsListSec.style.display = 'block';
                if(dashboardGridSec) dashboardGridSec.style.display = 'grid';
                if(chartSectionSec) chartSectionSec.style.display = 'block';
                if(searchSectionSec) searchSectionSec.style.display = 'block';
                if(energyListGridSec) { energyListGridSec.style.display = 'grid'; if (energyGridHeader) energyGridHeader.style.display = 'flex'; }
                if(insuranceGridHeader) insuranceGridHeader.style.display = 'flex'; // Vault content toggles via button
                viewContractsBtn.textContent = 'Contract Dates';
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
                buildingsListSec.style.display = 'none';
                if(dashboardGridSec) dashboardGridSec.style.display = 'none';
                if(chartSectionSec) chartSectionSec.style.display = 'none';
                if(searchSectionSec) searchSectionSec.style.display = 'none';
                if(contractDatesSection) contractDatesSection.style.display = 'none';
                if(energyListGridSec) { energyListGridSec.style.display = 'none'; if (energyGridHeader) energyGridHeader.style.display = 'none'; }
                if(insuranceVaultGridSec) { insuranceVaultGridSec.style.display = 'none'; if (insuranceGridHeader) insuranceGridHeader.style.display = 'none'; }
                clientManagerBtn.textContent = 'Back to Dashboard';
                if(viewContractsBtn) viewContractsBtn.textContent = 'Contract Dates';
            } else {
                clientManagerSection.style.display = 'none';
                buildingsListSec.style.display = 'block';
                if(dashboardGridSec) dashboardGridSec.style.display = 'grid';
                if(chartSectionSec) chartSectionSec.style.display = 'block';
                if(searchSectionSec) searchSectionSec.style.display = 'block';
                if(energyListGridSec) { energyListGridSec.style.display = 'grid'; if (energyGridHeader) energyGridHeader.style.display = 'flex'; }
                if(insuranceGridHeader) insuranceGridHeader.style.display = 'flex';
                clientManagerBtn.textContent = 'Client Manager';
            }
        });
    }

    // Toggle Insurance Vault
    const toggleInsuranceBtn = document.getElementById('toggle-insurance-btn');
    const addInsuranceBtn = document.getElementById('add-insurance-btn');
    if (toggleInsuranceBtn && insuranceVaultGridSec) {
        toggleInsuranceBtn.addEventListener('click', () => {
            if (insuranceVaultGridSec.style.display === 'none') {
                insuranceVaultGridSec.style.display = 'grid';
                toggleInsuranceBtn.textContent = 'Hide Insurance';
                if (addInsuranceBtn) addInsuranceBtn.style.display = 'block';
            } else {
                insuranceVaultGridSec.style.display = 'none';
                toggleInsuranceBtn.textContent = 'Show Insurance';
                if (addInsuranceBtn) addInsuranceBtn.style.display = 'none';
            }
        });
    }

    // Add Insurance Modal Logic
    const addInsuranceModal = document.getElementById('add-insurance-modal');
    const addInsuranceBtnElement = document.getElementById('add-insurance-btn');
    const closeAddInsuranceModal = document.getElementById('close-add-insurance-modal');

    if (addInsuranceBtnElement) {
        addInsuranceBtnElement.addEventListener('click', () => {
            // Populate property dropdown
            const insBuildingSelect = document.getElementById('ins-building');
            if (insBuildingSelect) {
                insBuildingSelect.innerHTML = '<option value="" disabled selected>Select Property</option>';

                let targetBuildings = allBuildings;
                if (currentUserRole === 'Company-Admin') {
                    const authCompany = sessionStorage.getItem('auth_company');
                    targetBuildings = allBuildings.filter(b => b.companyId === authCompany);
                }

                targetBuildings.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.address; // store address as value
                    opt.textContent = b.name;
                    insBuildingSelect.appendChild(opt);
                });
            }
            document.getElementById('add-insurance-form').reset();
            document.getElementById('ins-renewal-date').value = '2026-03-12';
            addInsuranceModal.style.display = 'block';
        });
    }

    if (closeAddInsuranceModal) {
        closeAddInsuranceModal.addEventListener('click', () => {
            addInsuranceModal.style.display = 'none';
        });
    }

    // Close modal if clicking outside
    window.addEventListener('click', (event) => {
        if (event.target == addInsuranceModal) {
            addInsuranceModal.style.display = 'none';
        }
    });


    document.getElementById('add-insurance-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.querySelector('#add-insurance-form button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const payload = {
                id: crypto.randomUUID(),
                account_address: document.getElementById('ins-building').value,
                policy_number: document.getElementById('ins-policy-number').value,
                provider_name: document.getElementById('ins-provider').value,
                insurance_type: document.getElementById('ins-type').value,
                coverage_amount: Number(document.getElementById('ins-coverage').value),
                premium_cost: Number(document.getElementById('ins-premium').value),
                renewal_date: document.getElementById('ins-renewal-date').value
            };

            if (supabaseClient) {
                const response = await supabaseClient.from('insurance_vault').insert(payload);
                if (response.error) {
                    console.error('Error saving insurance to Supabase:', response.error);
                    showToast(response.error.message, 'error');
                    window.alert(response.error.message);
                } else {
                    showToast('Insurance Added', 'success');
                    logAudit(`Added ${payload.insurance_type} insurance for ${payload.account_address}`);
                    document.getElementById('add-insurance-modal').style.display = 'none';
                    document.getElementById('add-insurance-form').reset();
                    fetchDataFromSupabase();
                }
            } else {
                alert('Supabase client not initialized');
            }
        } catch (err) {
            console.error('Exception during insurance save:', err);
            window.alert(err.message);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

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
                saveToLocalStorage();
        } else {
            // Add new
            if (companies.find(c => c.id === idInput)) {
                alert('A company with this ID already exists!');
                return;
            }
            companies.push({ id: idInput, name: nameInput, industry: indInput });
            logAudit(`Added new company: ${nameInput}`);
        }
        saveToLocalStorage();

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
        viewBillHistoryBtn.addEventListener('click', async () => {
            const listContainer = document.getElementById('bill-history-list');
            listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #cbd5e1;">Loading history...</div>';
            billHistoryModal.style.display = 'block';

            if (supabaseClient) {
                try {
                    let { data, error } = await supabaseClient.from('energy_accounts').select('*');

                    if (error) {
                        listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">Error: ${error.message}</div>`;
                        return;
                    }

                    console.log('History Data:', data);

                    if (data) {
                        data = data.filter(bill => new Date(bill.bill_date || bill.last_updated || bill.date) >= new Date('2026-01-01'));
                    }

                    listContainer.innerHTML = '';

                    if (data && data.length > 0) {
                        data.sort((a, b) => new Date(b.bill_date || b.date || b.last_updated) - new Date(a.bill_date || a.date || a.last_updated));

                        data.forEach(bill => {
                            const item = document.createElement('div');
                            item.style.padding = '10px';
                            item.style.borderBottom = '1px solid #e2e8f0';

                            const formattedDate = formatDate(bill.bill_date || bill.last_updated || bill.date);
                            const kwh = Number(bill.usage_kwh || bill.current_kwh || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            const cost = Number(bill.total_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

                            item.innerHTML = `
                                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                    <span>${formattedDate}</span>
                                    <span style="color: var(--primary);">€${cost}</span>
                                </div>
                                <div style="font-size: 0.85em; color: #475569; margin-top: 2px;">MPRN: ${bill.mprn_number || bill.mprn || 'N/A'} - ${bill.property_name || 'Unknown Property'}</div>
                                <div style="font-size: 0.9em; color: #64748b; margin-top: 5px;">
                                    <span>Usage: ${kwh} kWh</span>
                                </div>
                            `;
                            listContainer.appendChild(item);
                        });
                    } else {
                        listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #cbd5e1;">No billing history found.</div>';
                    }
                } catch (err) {
                    listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">Exception: ${err.message}</div>`;
                }
            } else {
                listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Database client not initialized.</div>';
            }
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
            area: Number(document.getElementById('add-b-area').value) || 1000,
            current_usage: "0.00 kWh",
            billHistory: []
        };

        allBuildings.push(newBuilding);
        logAudit(`Created property: ${newBuilding.name}`);
        addBuildingModal.style.display = 'none';
        document.getElementById('add-building-form').reset();

        saveToLocalStorage();

        updateFilters();
    });

    // Edit Property Modal logic (the function is called from the table buttons)
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
            const updatedFields = {
                name: document.getElementById('edit-b-name').value,
                address: document.getElementById('edit-b-address').value,
                companyId: document.getElementById('edit-b-company').value,
                area: Number(document.getElementById('edit-b-area').value) || 1000
            };
            allBuildings = allBuildings.map(b => b.id === id ? Object.assign({}, b, updatedFields) : b);

            logAudit(`Edited property: ${updatedFields.name}`);
        }
        saveToLocalStorage();

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
            saveToLocalStorage();
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
                const updatedAcc = {
                    id_number: document.getElementById('edit-acc-id').value,
                    provider: document.getElementById('edit-acc-provider').value,
                    account_address: document.getElementById('edit-acc-address').value,
                    contractEndDate: document.getElementById('edit-acc-enddate').value
                };

                allBuildings = allBuildings.map(b => b.id === bId ? Object.assign({}, b, {
                    accounts: b.accounts.map(a => a.id_number === origId ? Object.assign({}, a, updatedAcc) : a)
                }) : b);

                logAudit(`Edited ${building.accounts[accIndex].type} account on ${building.name}`);
            }
            saveToLocalStorage();
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
                fetchDataFromSupabase();
            } else if (username.endsWith('_Admin')) {
                const companyName = username.split('_')[0].toLowerCase();
                // We no longer validate against 'companies' here since companies is strictly cloud-only
                // and might be empty prior to the first fetch.
                sessionStorage.setItem('auth_role', 'Company-Admin');
                sessionStorage.setItem('auth_company', companyName);
                sessionStorage.setItem('auth_user_id', username);
                logAudit(`Logged in as Company-Admin for ${companyName}`);
                checkAuth();
                fetchDataFromSupabase();
            } else if (username === 'dobutilities') {
                sessionStorage.setItem('auth_role', 'Super-Admin');
                sessionStorage.setItem('auth_user_id', 'dobutilities');
                logAudit(`Logged in as dobutilities`);
                checkAuth();
                fetchDataFromSupabase();
            } else {
                alert('Invalid username format. Try Super_Admin or [Company]_Admin');
            }
        });
    }

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        logAudit('Logged out');
        sessionStorage.clear();
        checkAuth();
        if (energyAccountsSubscription) {
            energyAccountsSubscription.unsubscribe();
            energyAccountsSubscription = null;
        }
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

function renderContractDates() {
    const contractDatesList = document.getElementById('contract-dates-list');
    if (!contractDatesList) return;

    contractDatesList.innerHTML = '';
    let allContracts = [];
    const today = new Date();

    allBuildings.forEach(b => {
        if (!b.accounts) return;
        b.accounts.forEach(acc => {
            if (acc.contractEndDate) {
                const comp = companies.find(c => c.id === b.companyId) || { name: 'Unknown' };
                // Ensure date string is parsed correctly
                const dateParts = acc.contractEndDate.split('-');
                let endDate = new Date(acc.contractEndDate);
                if (dateParts.length === 3 && dateParts[0].length === 4) {
                    endDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                }

                const diffTime = endDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                allContracts.push({
                    buildingName: b.name,
                    companyName: comp.name,
                    accountType: acc.type,
                    accountId: acc.id_number,
                    provider: acc.provider,
                    endDateStr: acc.contractEndDate,
                    endDateObj: endDate,
                    daysLeft: diffDays
                });
            }
        });
    });

    allContracts.sort((a, b) => a.endDateObj - b.endDateObj);

    allContracts.forEach(contract => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        let daysColor = '#f8fafc';
        if (contract.daysLeft < 0) daysColor = '#ef4444'; // red
        else if (contract.daysLeft <= 30) daysColor = '#eab308'; // yellow
        else if (contract.daysLeft > 90) daysColor = '#10b981'; // green

        // Format date string to DD/MM/YYYY
        let formattedDate = contract.endDateStr;
        const p = contract.endDateStr.split('-');
        if (p.length === 3 && p[0].length === 4) {
             formattedDate = `${p[2]}/${p[1]}/${p[0]}`;
        }

        tr.innerHTML = `
            <td style="padding: 15px;">${contract.buildingName}</td>
            <td style="padding: 15px;">${contract.companyName}</td>
            <td style="padding: 15px;">${contract.accountType} <br><span class="monospace" style="font-size: 0.8em; color: #94a3b8;">${contract.accountId}</span></td>
            <td style="padding: 15px;">${contract.provider || 'N/A'}</td>
            <td style="padding: 15px;">${formattedDate}</td>
            <td style="padding: 15px; color: ${daysColor}; font-weight: bold;">${contract.daysLeft} days</td>
        `;
        contractDatesList.appendChild(tr);
    });
}

function checkAuth() {
    const authRole = sessionStorage.getItem('auth_role');
    currentUserId = sessionStorage.getItem('auth_user_id');
    currentUserRole = authRole;

    const authModal = document.getElementById('auth-gate');
    const appContent = document.getElementById('main-dashboard');
    const companyFilter = document.getElementById('company-filter');
    const clientManagerBtn = document.getElementById('client-manager-btn');

    if (!authRole) {
        authModal.style.display = 'flex';
        appContent.style.display = 'none';
    } else {
        authModal.style.display = 'none';
        appContent.style.display = 'flex';
        appContent.style.flexDirection = 'column';

        const loggedInUserEl = document.getElementById('logged-in-user');
        if (loggedInUserEl) {
            loggedInUserEl.textContent = currentUserId;
        }

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
            if (authRole) {
                // Delete Local Fallback: Completely disable the logic that loads data from VestaLogic_Storage
                localStorage.removeItem('VestaLogic_Storage');
                // Will fetch data in loadBuildings once it finishes
            }
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

        // 2026 Default Date Picker Check
        const readingDateInput = document.getElementById('reading-date');
        if (readingDateInput) {
            const dateStr = '2026-03-12'; // The explicit reference today date used elsewhere in the codebase
            readingDateInput.value = dateStr;
        }

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
        wBuilding.innerHTML = '<option value="" disabled selected>Select Property</option>';
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
        wAccount.innerHTML = '<option value="" disabled selected>Select Metered Account</option>';
        if (b.accounts) {
            b.accounts.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id_number;
                const addressText = a.account_address ? ` (${a.account_address})` : '';
                opt.textContent = `${a.type} - ${a.id_number}${addressText}`;
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

const rValueInput = document.getElementById('reading-value');
const rCostInput = document.getElementById('reading-cost');

document.getElementById('tracker-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    
    try {
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
            if (building.accounts[accIndex].id_number !== newAccNum || building.accounts[accIndex].contractEndDate !== newEndDate) {
                edited = true;

                allBuildings = allBuildings.map(b => b.id === bId ? Object.assign({}, b, {
                    accounts: b.accounts.map(a => a.id_number === oldAccNum ? Object.assign({}, a, { id_number: newAccNum, contractEndDate: newEndDate }) : a)
                }) : b);
            }
            if (edited) {
                logAudit(`Edited ${accType} account details during reading entry for ${building.name}`);
                updateFilters(); // Refresh the building table in case accordion is open
            }
            saveToLocalStorage();
        }
    }

    const data = {
        building_id: bId,
        type: accType.toLowerCase(),
        account_number: newAccNum,
        value: Number(document.getElementById('reading-value').value),
        cost: Number(document.getElementById('reading-cost').value),
        date: document.getElementById('reading-date').value
    };

    const buildingName = building ? building.name : 'Unknown Property';
    const buildingCompanyId = building ? building.companyId : wCompany.value;

    const usageVal = Number(document.getElementById('reading-value').value);
    const costVal = Number(document.getElementById('reading-cost').value);

    const companyObj = companies.find(c => c.id === buildingCompanyId);
    const companyName = companyObj ? companyObj.name : 'Unknown';

    const payload = {
        id: crypto.randomUUID(),
        mprn_number: newAccNum,
        usage_kwh: Number(usageVal),
        total_cost: Number(costVal),
        company_name: companyName,
        property_name: buildingName,
        bill_date: document.getElementById('reading-date').value,
        utility_type: accType.charAt(0).toUpperCase() + accType.slice(1)
    };

    if (window.cloudEnergyData) {
        const isDuplicate = window.cloudEnergyData.some(ed =>
            ed.property_name === payload.property_name &&
            ed.bill_date === payload.bill_date &&
            Number(ed.usage_kwh) === payload.usage_kwh &&
            Number(ed.total_cost) === payload.total_cost
        );
        if (isDuplicate) {
            alert('Duplicate Entry Detected: An exact match for Address, Date, Usage, and Cost already exists.');
            return;
        }
    }

    console.log('Attempting Supabase Save...', payload);

    // Fallback if supabase object exists (assuming it is imported elsewhere or handled)
    if (supabaseClient) {
        try {
            const response = await supabaseClient.from('energy_accounts').insert(payload);
            console.log('Supabase Save Response:', response);
            if (!response.error) {
                showToast('Cloud Synced', 'success');
            } else {
                console.error('Error saving to Supabase', response.error);
                showToast(response.error.message, 'error');
                window.alert(response.error.message);
            }
        } catch(err) {
            console.error('Exception during Supabase save:', err);
            showToast(err.message, 'error');
            window.alert(err.message);
        }
    }

    // Also save directly to building.billHistory to persist properly if logic expects it there, but utility_readings array is primary mechanism to keep track across reloads.
    // Wait, let's explicitly invoke saveToLocalStorage() to ensure buildings are saved if they were modified (e.g. account edits).
    logAudit(`New bill added to ${buildingName} history.`);
    alert('Reading Saved!');
    this.reset();
    entryModal.style.display = 'none';

    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
});
