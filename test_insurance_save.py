import os
import time
from playwright.sync_api import sync_playwright

def test_insurance_save():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Navigate to local server
        page.goto("http://localhost:8000/insurance.html")
        page.wait_for_selector("#login-username")

        # Login
        page.fill("#login-username", "dobutilities")
        page.click("button[type='submit']")

        # Wait for dashboard
        page.wait_for_selector("#insurance-dashboard", state="visible")

        # Create a dummy building so we can select it
        page.evaluate('''() => {
            allBuildings.push({ id: 'B999', name: 'Test Building', address: '123 Fake St', companyId: 'oracle', area: 1000, accounts: [], billHistory: [] });
            updateFilters();
        }''')

        # Click "+ Add Insurance" button
        page.click("#add-insurance-btn")
        page.wait_for_selector("#add-insurance-modal", state="visible")

        page.select_option("#ins-building", value="123 Fake St")
        page.fill("#ins-policy-number", "POL-123456")
        page.fill("#ins-provider", "Test Provider Inc")
        page.select_option("#ins-type", value="Building")
        page.fill("#ins-coverage", "500000")
        page.fill("#ins-premium", "2500")
        page.fill("#ins-last-year-premium", "2400")
        page.fill("#ins-renewal-date", "2026-12-01")

        # Submit
        print("Clicking save...")
        page.click("#add-insurance-form button[type='submit']")

        # Wait to see what happens
        time.sleep(3)
        print("Done waiting.")
        browser.close()

if __name__ == "__main__":
    test_insurance_save()
