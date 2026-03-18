/* =========================================
  DOB UTILITIES - FULL PORTAL LOGIC
  Fixed: Supabase Mapping & Login Bypass
  =========================================
*/

let utilityChartInstance = null;
let activeBuildingId = null;
let allBuildings = [];
let sortEndDateAscending = true;
let currentUserRole = null;
let currentUserId = null;

// 1. FIXED COMPANY REGISTRY
let companies = JSON.parse(localStorage.getItem('utility_companies')) || [
    { id: 'oracle', name: 'Oracle', industry: 'Technology' },
    { id: 'google', name: 'Google', industry: 'Technology' },
    { id: 'dob_accounts', name: 'DOB Utilities', industry: 'Services' }
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadBuildings();
    checkAuth();
    populateCompanyDropdowns();
    renderClientManager();
    updateDashboard();
});

// --- AUTH & LOGIN (FIXED) ---
function checkAuth() {
    const authRole = sessionStorage.getItem('auth_role');
    currentUserId = sessionStorage.getItem('auth_user_id');
    currentUserRole = authRole;

    const gate = document.getElementById('auth-gate');
    const appContent = document.getElementById('main-dashboard');

    if (!authRole) {
        if (gate) gate.style.display = 'flex';
        if (appContent) appContent.style.display = 'none';
    } else {
        if (gate) gate.style.display = 'none';
        if (appContent) appContent.style.display = 'flex';
        renderAuditLogs();
        updateFilters();
    }
}

// Master Login Handler
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim().toLowerCase();

        if (username === 'dobutilities' || username === 'super_admin') {
            sessionStorage.setItem('auth_role', 'Super-Admin');
            sessionStorage.setItem('auth_user_id', username);
            checkAuth();
        } else {
            alert('Invalid Username. Use "dobutilities"');
        }
    });
}

// --- SUPABASE SYNC LOGIC (THE FIX) ---
async function syncToSupabase(payload) {
    if (typeof supabase === 'undefined') {
        console.error("Supabase not found. Check Vercel Variables.");
        return;
    }

    const dbPayload = {
        mprn: payload.account_number,           // Matches your DB column
        company_id: payload.company_id,         // Matches your DB column
        property_name: payload.property_name,
        usage_kwh: Number(payload.value),       // Matches your DB column
        total_cost: Number(payload.cost),
        last_updated: new Date().toISOString()
    };

    try {
        // UPSERT prevents the "Duplicate Key" error
        const { error } = await supabase
            .from('energy_accounts')
            .upsert(dbPayload, { onConflict: 'mprn' });

        if (error) {
            console.error('Sync Error:', error.message);
            showToast('Cloud Sync Failed', 'error');
        } else {
            showToast('Cloud Synced Successfully', 'success');
        }
    } catch (err) {
        console.error('Fatal Sync Error:', err);
    }
}

// --- WIZARD NAVIGATION (RESTORED) ---
const wStep1 = document.getElementById('wizard-step-1');
const wStep2 = document.getElementById('wizard-step-2');
const wStep3 = document.getElementById('wizard-step-3');

window.nextStep = function(current) {
    if (current === 1) {
        const company = document.getElementById('wizard-company').value;
        if (!company) return alert("Select a company");
        
        // Populate building dropdown based on company
        const bSelect = document.getElementById('wizard-building');
        bSelect.innerHTML = '<option value="">Select Property</option>';
        allBuildings.filter(b => b.companyId === company).forEach(b => {
            bSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        });
        
        wStep1.style.display = 'none';
        wStep2.style.display = 'block';
    } else if (current === 2) {
        wStep2.style.display = 'none';
        wStep3.style.display = 'block';
    }
};

window.prevStep = function(current) {
    if (current === 2) {
        wStep2.style.display = 'none';
        wStep1.style.display = 'block';
    } else if (current === 3) {
        wStep3.style.display = 'none';
        wStep2.style.display = 'block';
    }
};

// --- DATA SAVING ---
document.getElementById('tracker-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const bId = document.getElementById('wizard-building').value;
    const building = allBuildings.find(b => b.id === bId);
    
    const payload = {
        property_name: building ? building.name : 'Unknown',
        company_id: building ? building.companyId : 'Unknown',
        account_number: document.getElementById('wizard-edit-acc-num').value,
        value: document.getElementById('reading-value').value,
        cost: document.getElementById('reading-cost').value,
        date: document.getElementById('reading-date').value
    };

    // Save locally first
    let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
    readings.push(payload);
    localStorage.setItem('utility_readings', JSON.stringify(readings));

    // Sync to Cloud
    await syncToSupabase(payload);

    document.getElementById('entry-modal').style.display = 'none';
    updateDashboard();
});

// --- UTILITY HELPERS ---
function showToast(message, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.style.cssText = `background:${type==='success'?'#10b981':'#ef4444'};color:#fff;padding:12px;border-radius:8px;margin-bottom:10px;`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function loadBuildings() {
    const data = localStorage.getItem('VestaLogic_Storage');
    if (data) allBuildings = JSON.parse(data).buildings || [];
    renderBuildings(allBuildings);
}

function renderBuildings(buildings) {
    const list = document.getElementById('buildings-list');
    if (!list) return;
    list.innerHTML = buildings.map(b => `
        <div class="card">
            <h3>${b.name}</h3>
            <p>${b.address}</p>
            <button onclick="openEditModal('${b.id}')">Edit</button>
        </div>
    `).join('');
}

function populateCompanyDropdowns() {
    const selects = ['company-filter', 'wizard-company'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">Select Company</option>' + 
                companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    });
}

function updateDashboard() {
    // Logic to refresh chart and stats
}
