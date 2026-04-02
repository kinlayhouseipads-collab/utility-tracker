// Verify mapping keys are lowercase
grep -E -i "const\s+payload\s*=\s*\{" app.js -A 15
