1. **Initialize Date Filter Defaults**: In `app.js` `DOMContentLoaded`, set the default value of `start-date-filter` to `2025-01-01` and `end-date-filter` to the current date (e.g. `new Date().toISOString().split('T')[0]`) if they are empty.
2. **Update Table and Graph Logic**: Remove all hardcoded checks for `2026-01-01` and `2026-12-31` throughout `app.js`. Ensure the Bills Table (in `renderBuildings` and `viewBillHistoryBtn`) and the metrics calculations (`updateDashboard`) filter strictly using the `startDateFilter` and `endDateFilter`.
3. **Upgrade Chart.js X-Axis to Time Scale**:
   - Add the Chart.js date adapter (`chartjs-adapter-date-fns`) script to `index.html`.
   - Update `renderChart` so `labels` and `data` are array of objects with `x` (date) and `y` (cost) to use a true time scale (`type: 'time', time: { unit: 'month' }`).
   - Remove the hardcoded 12-month array logic in `renderChart`. Sort the data points chronologically.
   - Set `spanGaps: true` in the chart datasets to connect the lines directly across gaps.
4. **Ensure Sync & Property Filtering**: Verify that changing the date picker triggers `updateFilters()` to refresh both the graph and the accordion bill history table. The existing building filter logic will apply correctly to the new chart data points.
5. **Complete Pre Commit Steps**: Make sure testing, verification, review, and reflections are done.
6. **Submit**: Request submit once verified.
