const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf-8');
if (content.includes("utility_type: accType")) {
  console.log("Success: Payload mapping updated.");
} else {
  console.error("Failed to find updated payload mapping.");
}
