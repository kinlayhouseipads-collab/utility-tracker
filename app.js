function updateDashboard() {
    let totalElectricity = 0;
    let totalGas = 0;
    let totalCost = 0;

    const start = document.getElementById('start-date-filter')?.value;
    const end = document.getElementById('end-date-filter')?.value;

    let targetBuildings = activeBuildingId
        ? energyBuildings.filter(b => b.id === activeBuildingId)
        : energyBuildings;

    targetBuildings.forEach(building => {
        if (building.billHistory) {
            building.billHistory.forEach(bill => {
                const rawDate = (bill.bill_date || bill.date || "").split('T')[0];
                
                let withinRange = true;
                if (start && end && rawDate) {
                    withinRange = (rawDate >= start && rawDate <= end);
                }

                if (withinRange) {
                    // Try to find usage in kWh first, then m3
                    const kwhVal = parseFloat(bill.usage_kwh) || parseFloat(bill.current_kwh) || 0;
                    const m3Val = parseFloat(bill.usage_m3) || 0;
                    
                    // CONVERSION: If Gas is in m3, multiply by 11.1 to match kWh scale
                    const isGas = (bill.utility_type || "").toLowerCase().includes('gas') || m3Val > 0;
                    const usage = (isGas && kwhVal === 0) ? (m3Val * 11.1) : kwhVal;

                    if (isGas) {
                        totalGas += usage;
                    } else {
                        totalElectricity += usage;
                    }
                    totalCost += (parseFloat(bill.total_cost) || parseFloat(bill.cost) || 0);
                }
            });
        }
    });

    // Safe UI Update
    const formatter = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
    
    if(document.getElementById('stat-electricity')) 
        document.getElementById('stat-electricity').textContent = totalElectricity.toLocaleString() + ' kWh';
    
    if(document.getElementById('stat-gas')) 
        document.getElementById('stat-gas').textContent = totalGas.toLocaleString() + ' kWh';
    
    if(document.getElementById('stat-cost')) 
        document.getElementById('stat-cost').textContent = formatter.format(totalCost);
}
