document.getElementById('tracker-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const data = {
        type: document.getElementById('utility-type').value,
        value: document.getElementById('reading-value').value,
        date: document.getElementById('reading-date').value
    };

    // Save to LocalStorage (2026 simple storage)
    let readings = JSON.parse(localStorage.getItem('utility_readings')) || [];
    readings.push(data);
    localStorage.setItem('utility_readings', JSON.stringify(readings));

    alert('Reading Saved!');
    this.reset();
});
