const fs = require('fs');

const appContent = fs.readFileSync('app.js', 'utf-8');
const styleContent = fs.readFileSync('style.css', 'utf-8');

let appChecks = 0;
let styleChecks = 0;

if (appContent.includes("provider: document.getElementById('provider').value || null")) appChecks++;
if (appContent.includes("readingDateInput.value = new Date().toISOString().split('T')[0];")) appChecks++;
if (appContent.includes("document.getElementById('provider');")) appChecks++;
if (appContent.includes("providerInput.value = '';")) appChecks++;

if (styleContent.includes("max-width: 1200px !important;")) styleChecks++;
if (styleContent.includes(".btn-primary {")) styleChecks++;
if (styleContent.includes("background: #22c55e;")) styleChecks++;
if (styleContent.includes(".dropdown-menu {")) styleChecks++;

if (appChecks === 4 && styleChecks === 4) {
    console.log("Success: All verified.");
} else {
    console.log(`Failed verification. App: ${appChecks}/4, Style: ${styleChecks}/4`);
}
