const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf-8');
if (content.includes("company_name: companies.find(c => c.id === (building ? building.companyId : wCompany.value))?.name || 'Unknown Company'")) {
  console.log("Success: Payload mapping updated.");
} else {
  console.error("Failed to find updated payload mapping.");
}
