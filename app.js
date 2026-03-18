/* =========================================
  DOB UTILITIES - PROPERTY PORTAL 2026
  Full Core Logic - Integrated with Supabase
  =========================================
*/

let utilityChartInstance = null;
let activeBuildingId = null;
let allBuildings = [];
let sortEndDateAscending = true;
let currentUserRole = null;
let currentUserId = null;

// Company Registry (Utility Clients)
let companies = JSON.parse(localStorage.getItem('utility_companies')) || [
    { id: 'oracle', name: 'Oracle', industry: 'Technology' },
    { id: 'google', name: 'Google', industry: 'Technology' },
    { id: 'dob_accounts', name: 'DOB Utilities', industry: 'Services' }
];

// --- 1. CORE UTILITY UI FUNCTIONS ---

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

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 300);
    }, 3000);
}

function saveToLocalStorage() {
    const data = { buildings: allBuildings, companies: companies };
    localStorage.setItem('VestaLogic_Storage', JSON.stringify(data));
}

function logAudit(action) {
    if (!currentUserId) return;
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    const logEntry = { userId: currentUserId, action: action, timestamp: timestamp };

    let logs = JSON.parse(localStorage.getItem('utility_audit_logs')) || [];
    logs.unshift(logEntry);
    localStorage.setItem('utility_audit_logs', JSON.stringify(logs));
    renderAuditLogs();
}

// --- 2. DATA LOADING & RENDERING ---

async function loadBuildings() {
    try {
        const buildingsListContainer = document.getElementById('buildings-list');
        if (buildingsListContainer) {
            buildingsListContainer.innerHTML = '<div style="padding: 20px;"><div class="skeleton"></div></div>';
        }

        const storedDataStr = localStorage.getItem('VestaLogic_Storage');
        if (storedDataStr) {
            const storedData = JSON.parse(storedDataStr);
            allBuildings = storedData.buildings || [];
            if (storedData.companies) {
                companies = storedData.companies;
                populateCompanyDropdowns();
            }
            renderBuildings(allBuildings);
            return;
        }
    } catch (error) {
        console.error('Error loading buildings:', error);
    }
}

function renderBuildings(buildings) {
    const list = document.getElementById('buildings-list');
    if (!list) return;
    list.innerHTML = '';

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr style="background: var(--card-bg); position: sticky; top: 0; z-index: 10;">
            <th style="padding: 20px 15px; color: #cbd5e1; text-align: left;">Property Name</th>
            <th style="padding: 20px 15px; color: #cbd5e1; text-align: left;">Company</th>
            <th style="padding: 20px 15px; color: #cbd5e1; text-align: left;">End Date</th>
            <th style="padding: 20px 15px; color: #cbd5e1; text-align: left;">Total Cost</th>
            <th style="padding: 20px 15px; color: #cbd5e1; text-align: center;">Actions</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    buildings.forEach(building => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        
        const companyName = companies.find(c => c.id === building.companyId)?.name || 'Unknown';
        const totalCost = (building.totalCost || 0).toLocaleString('en-IE', { style: 'currency', currency: 'EUR' });

        row.innerHTML = `
            <td style="padding: 20px 15px;"><strong>${building.name}</strong><br><small>${building.address}</small></td>
            <td style="padding: 20px 15px;"><span class="badge">${companyName}</span></td>
            <td style="padding: 20px 15px;">${building.contractEndDate || 'N/A'}</td>
            <td style="padding: 20px 15px; font-weight: bold; color: var(--primary);">${totalCost}</td>
            <td style="padding: 20px 15px; text-align: center;">
                <button onclick="openEditModal('${building.id}')" style="background:none; border:none; color:#cbd5e1; cursor:pointer;"><i class="fas fa-edit"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    list.appendChild(table);
}

// --- 3. THE SUPABASE SYNC (THE FIX) ---

async function syncToCloud(payload) {
    if (typeof supabase === 'undefined') return;

    // Mapping to your exact columns: mprn, usage_kwh, company_id
    const dbPayload = {
        mprn: payload.account_number,
        company_id: payload.company_id,
        property_name: payload.property_name,
        usage_kwh: Number(payload.value),
        current_kwh: Number(payload.value), // redundancy for safety
        total_cost: Number(payload.cost),
        last_updated: new Date().toISOString()
    };

    try {
        // UPSERT is critical: prevents "Duplicate Key" errors by updating existing MPRNs
        const { data, error } = await supabase
            .from('energy_accounts')
            .upsert(dbPayload, { onConflict: 'mprn' });

        if (error) {
            console.error('Supabase Error:', error.message);
            showToast('Cloud Sync Error: ' + error.message, 'error');
        } else {
            showToast('Property Meter Synced to Cloud', 'success');
        }
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

// --- 4. FORM & WIZARD LOGIC ---

document.getElementById('tracker-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const bId = document.getElementById('wizard-building').value;
    const building = allBuildings.find(b => b.id === bId);
    
    if (!building) {
        alert("Please select a valid property.");
        return;
    }

    const payload = {
        building_id: bId,
        property_name: building.name,
        company_id: building.companyId,
        account_number: document.getElementById('wizard-edit-acc-num').value,
        value: document.getElementById('reading-value').value,
        cost: document.getElementById('reading-cost').value,
        date: document.getElementById('reading-date').value
    };

    // 1. Audit & Local Update
    logAudit(`Added reading for ${building.name} (${payload.account_number})`);
    
    // 2. Execute Cloud Sync
    await syncToCloud(payload);

    // 3. UI Cleanup
    document.getElementById('entry-modal').style.display = 'none';
    this.reset();
    updateDashboard();
});

// --- 5. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    loadBuildings();
    checkAuth();
    populateCompanyDropdowns();
    
    // Auto-calculate cost in wizard
    const rVal = document.getElementById('reading-value');
    const rRate = document.getElementById('reading-unit-rate');
    const rCost = document.getElementById('reading-cost');

    if (rVal && rRate) {
        [rVal, rRate].forEach(el => el.addEventListener('input', () => {
            const total = (Number(rVal.value) * Number(rRate.value)).toFixed(2);
            rCost.value = total > 0 ? total : '';
        }));
    }
});

// Authentication Bridge
function checkAuth() {
    const role = sessionStorage.getItem('auth_role');
    const gate = document.getElementById('auth-gate');
    const dashboard = document.getElementById('main-dashboard');
    
    if (!role && gate) {
        gate.style.display = 'flex';
        if (dashboard) dashboard.style.display = 'none';
    } else {
        if (gate) gate.style.display = 'none';
        if (dashboard) dashboard.style.display = 'flex';
    }
}

function updateDashboard() {
    renderBuildings(allBuildings);
    if (typeof fetchEnergyData === 'function') fetchEnergyData();
}

// Populate Wizard/Filters
function populateCompanyDropdowns() {
    const selects = ['company-filter', 'wizard-company', 'add-b-company'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '<option value="" disabled selected>Select Company</option>';
        companies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            el.appendChild(opt);
        });
    });
}
