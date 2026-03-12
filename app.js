let utilityChartInstance = null;
let activeBuildingId = null;
let allBuildings = [];

async function loadBuildings() {
    try {
        const response = await fetch('buildings.json');
        allBuildings = await response.json();
        renderBuildings(allBuildings);
    } catch (error) {
        console.error('Error loading buildings:', error);
    }
}

function renderBuildings(buildings) {
    const list = document.getElementById('buildings-list');
    list.innerHTML = '';

    buildings.forEach(building => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer';
        if (building.id === activeBuildingId) {
            card.style.borderColor = 'var(--primary)';
            card.style.borderWidth = '2px';
        }

        card.innerHTML = `
            <h3>${building.name}</h3>
            <p style="font-size: 0.9em; color: #64748b;">${building.address}</p>
            <p class="stat" style="font-size: 1.2rem;">${building.current_usage}</p>
        `;

        card.addEventListener('click', () => {
            selectBuilding(building);

            // Re-render to update selected border but respect current search filter
            const searchBar = document.getElementById('search-bar');
            let buildingsToRender = allBuildings;

            if (searchBar && searchBar.value) {
                const searchTerm = searchBar.value.toLowerCase();
                buildingsToRender = allBuildings.filter(b =>
                    b.name.toLowerCase().includes(searchTerm) ||
                    b.address.toLowerCase().includes(searchTerm)
                );
            }
            renderBuildings(buildingsToRender);
        });

        list.appendChild(card);
    });
}

function selectBuilding(building) {
    if (activeBuildingId === building.id) {
        // Deselect
        activeBuildingId = null;
        document.getElementById('selected-building-name').textContent = 'All Buildings Dashboard';
        document.getElementById('building-id').value = '';
    } else {
        activeBuildingId = building.id;
        document.getElementById('selected-building-name').textContent = `${building.name} Dashboard`;
        document.getElementById('building-id').value = building.id;
    }

    updateDashboard();
    renderChart();
}

function updateDashboard() {
    let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let totalElectricity = 0;
    let totalWater = 0;
    let totalGas = 0;
    let totalCost = 0;

    readings.forEach(reading => {
        if (activeBuildingId && reading.building_id !== activeBuildingId) {
            return; // Skip if a building is selected and it doesn't match
        }

        const readingDate = new Date(reading.date);
        if (readingDate.getMonth() === currentMonth && readingDate.getFullYear() === currentYear) {
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

    document.getElementById('stat-electricity').textContent = totalElectricity.toFixed(2) + ' kWh';
    document.getElementById('stat-water').textContent = totalWater.toFixed(2) + ' m³';
    document.getElementById('stat-gas').textContent = totalGas.toFixed(2) + ' units';
    document.getElementById('stat-cost').textContent = '$' + totalCost.toFixed(2);
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

document.addEventListener('DOMContentLoaded', () => {
    loadBuildings();
    updateDashboard();
    renderChart();

    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredBuildings = allBuildings.filter(building =>
                building.name.toLowerCase().includes(searchTerm) ||
                building.address.toLowerCase().includes(searchTerm)
            );
            renderBuildings(filteredBuildings);
        });
    }
});

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
