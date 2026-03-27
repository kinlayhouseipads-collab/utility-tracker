1. **Add `toggleInsuranceStatus` function to `app.js`**: Create a global function that toggles the `is_paid` status of a policy in the `insurance_vault` table, updates the UI immediately, and shows a 'Saving...' toast. If the DB request fails, revert the UI.
2. **Make the Status Icon clickable**: In `app.js`, within `renderInsuranceVault`, modify the `statusIcon` div to be clickable (add `cursor: pointer` and `onclick="toggleInsuranceStatus('${policy.id}', ${!!policy.is_paid})"`). Add `id="status-icon-${policy.id}"`.
3. **Verify "Broker Name" and "Van / Motor" logic**: Confirm they are fully integrated (already checked: they are mapped in the payload, HTML inputs, and display logic).
4. **Complete Pre-Commit Steps**: Ensure proper testing, verification, review, and reflection are done by calling `pre_commit_instructions`.
5. **Submit Change**: Submit the branch when complete.
