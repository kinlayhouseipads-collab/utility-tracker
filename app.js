// --- FIX 1: Overwrite updateFilters ---
function updateFilters() {
    const searchBar = document.getElementById('search-bar');
    const companyFilter = document.getElementById('company-filter');
    const propertyFilter = document.getElementById('property-filter');

    let filtered = energyBuildings;

    // Search logic
    if (searchBar && searchBar.value) {
        const term = searchBar.value.toLowerCase();
        filtered = filtered.filter(b => b.name.toLowerCase().includes(term) || b.address.toLowerCase().includes(term));
    }

    // Company logic
    if (companyFilter && companyFilter.value) {
        filtered = filtered.filter(b => b.companyId === companyFilter.value);
    }

    // Property Dropdown Sync
    if (propertyFilter) {
        const current = propertyFilter.value;
        propertyFilter.innerHTML = '<option value="">All Properties</option>';
        filtered.sort((a,b) => a.name.localeCompare(b.name)).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id; opt.textContent = b.name;
            propertyFilter.appendChild(opt);
        });
        propertyFilter.value = filtered.find(b => b.id === current) ? current : "";
    }

    renderBuildings(filtered);
    updateDashboard(); // Re-calculate stats based on filters
    renderChart();
}

// --- FIX 2: Overwrite updateDashboard (The Gas Scaler) ---
function updateDashboard() {
    let totalElec = 0;
    let totalGas = 0;
    let totalCost = 0;

    const start = document.getElementById('start-date-filter')?.value;
    const end = document.getElementById('end-date-filter')?.value;

    let targets = activeBuildingId ? energyBuildings.filter(b => b.id === activeBuildingId) : energyBuildings;

    targets.forEach(b => {
        if (b.billHistory) {
            b.billHistory.forEach(bill => {
                const bDate = (bill.bill_date || bill.date || "").split('T')[0];
                let inRange = (!start || !end) ? true : (bDate >= start && bDate <= end);

                if (inRange) {
                    // THE SCALER: Check all potential usage keys
                    const rawKwh = parseFloat(bill.usage_kwh) || parseFloat(bill.current_kwh) || 0;
                    const rawM3 = parseFloat(bill.usage_m3) || 0;
                    
                    // If Gas is in m3, convert to kWh so it's not "small" on the chart (1m3 = ~11.1 kWh)
                    const isGas = (bill.utility_type || "").toLowerCase().includes('gas') || rawM3 > 0;
                    const normalizedUsage = (isGas && rawKwh === 0) ? (rawM3 * 11.1) : rawKwh;

                    if (isGas) {
                        totalGas += normalizedUsage;
                    } else {
                        totalElec += normalizedUsage;
                    }
                    totalCost += (parseFloat(bill.total_cost) || parseFloat(bill.cost) || 0);
                }
            });
        }
    });

    // Update the UI
    const formatter = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
    if(document.getElementById('stat-electricity')) document.getElementById('stat-electricity').textContent = totalElec.toLocaleString() + ' kWh';
    if(document.getElementById('stat-gas')) document.getElementById('stat-gas').textContent = totalGas.toLocaleString() + ' kWh';
    if(document.getElementById('stat-cost')) document.getElementById('stat-cost').textContent = formatter.format(totalCost);
}
