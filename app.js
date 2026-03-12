let utilityChartInstance = null;

function updateDashboard() {
    let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let totalElectricity = 0;
    let totalWater = 0;
    let totalGas = 0;
    let totalCost = 0;

    readings.forEach(reading => {
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
    // document.getElementById('stat-cost').textContent = '$' + totalCost.toFixed(2);
}

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
    const grid = document.getElementById('buildings-grid');
    grid.innerHTML = '';

    let totalPortfolioCost = 0;

    buildings.forEach(building => {
        totalPortfolioCost += building.monthlyCost;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${building.name}</h3>
            <p><strong>Address:</strong> ${building.address}</p>
            <p><strong>Status:</strong> ${building.status}</p>
            <p class="stat">$${building.monthlyCost.toLocaleString()}</p>
        `;
        grid.appendChild(card);
    });

    document.getElementById('stat-portfolio-cost').textContent = '$' + totalPortfolioCost.toLocaleString();
}

function setupSearch() {
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allBuildings.filter(b =>
                b.name.toLowerCase().includes(term) ||
                b.address.toLowerCase().includes(term) ||
                b.status.toLowerCase().includes(term)
            );
            renderBuildings(filtered);
        });
    }
}

function renderChart() {
    let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];

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
    updateDashboard();
    renderChart();
    loadBuildings();
    setupSearch();
});

document.getElementById('tracker-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const data = {
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
