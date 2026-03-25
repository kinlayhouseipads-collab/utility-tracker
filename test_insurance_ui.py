import os
from playwright.sync_api import sync_playwright

def test_insurance_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Navigate to local server
        page.goto("http://localhost:8000")
        page.wait_for_selector("#login-username")

        # Login
        page.fill("#login-username", "dobutilities")
        page.click("button[type='submit']")

        # Wait for dashboard
        page.wait_for_selector("#main-dashboard", state="visible")

        # Click on Insurance Command nav button
        page.click("#nav-insurance")
        page.wait_for_selector("#insurance-dashboard", state="visible")

        # Take a screenshot
        page.screenshot(path="screenshot_insurance_dashboard.png")
        print("Screenshot of Insurance Dashboard taken.")

        # Verify elements
        assert page.is_visible("#stat-total-premium")
        assert page.is_visible("#stat-upcoming-renewals")
        assert page.is_visible("#stat-highest-premium")
        assert page.is_visible("#ins-search-address")
        assert page.is_visible("#ins-filter-provider")
        assert page.is_visible("#ins-sort-renewal")

        browser.close()

if __name__ == "__main__":
    test_insurance_dashboard()