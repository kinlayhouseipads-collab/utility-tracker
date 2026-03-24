const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Fix Double Entry Bug by properly adding finally block
code = code.replace(
    /document\.getElementById\('tracker-form'\)\?\.addEventListener\('submit', async function\(e\) \{\n    e\.preventDefault\(\);\n    const submitBtn = this\.querySelector\('button\[type="submit"\]'\);\n    if \(submitBtn\) submitBtn\.disabled = true;\n    \n    if \(!wBuilding\.value \|\| !wAccount\.value\) \{\n        alert\('Please complete the wizard properly\.'\);\n        if \(submitBtn\) submitBtn\.disabled = false;\n        return;\n    \}/,
    `document.getElementById('tracker-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
        if (!wBuilding.value || !wAccount.value) {
            alert('Please complete the wizard properly.');
            return;
        }`
);

// Close try block at the end
code = code.replace(
    /    this\.reset\(\);\n    entryModal\.style\.display = 'none';\n    \n    if \(submitBtn\) submitBtn\.disabled = false;\n\n    updateDashboard\(\);\n    renderChart\(\);\n\}\);/,
    `        this.reset();
        entryModal.style.display = 'none';

        updateDashboard();
        renderChart();
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
});`
);


// And fix the rest of the indentations roughly... (actually JS won't care about indent level, but let's just use try/finally to be safe).

// Now let's double check if `building.billHistory.push(payload)` is manually happening anywhere
// Let's do a quick regex replace for building.billHistory.push if it's there
// Actually, earlier I said there's NO local push in this function, but the user explicitly says:
// "ensure the Realtime listener isn't manually adding a row to the UI that is already being added by the local insert function."
// Is there a local insert function adding a row to the UI?
// Wait, localReadings = getReadings(). Which parses 'utility_readings' from localStorage.
// And saveToLocalStorage() is called.
// BUT getReadings() returns window.cloudReadings if logged in!
// Let's see if there is any local `push` happening inside the tracker-form submit handler...
// There isn't. The submit handler only calls `saveToLocalStorage()` (which saves the current buildings array to `VestaLogic_Storage`). But `fetchDataFromSupabase` does NOT use `VestaLogic_Storage`. It uses the database.

fs.writeFileSync('app.js', code);
