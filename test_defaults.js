const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf-8');
if (content.includes("readingDateInput.value = new Date().toISOString().split('T')[0];") && content.includes("providerInput.value = '';")) {
  console.log("Success: Ghost defaults removed.");
} else {
  console.error("Failed to verify ghost default removal.");
}
