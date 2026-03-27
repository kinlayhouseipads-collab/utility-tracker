from playwright.sync_api import sync_playwright
import time

def verify_insurance():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8000/insurance.html')

        # Wait for login
        page.fill('#login-username', 'Oracle_Admin')
        page.click('button[type="submit"]')

        # Wait until the network is idle so the data fetch completes
        page.wait_for_selector('#insurance-vault-grid', state='visible', timeout=10000)
        time.sleep(3)

        # Take full page screenshot
        page.screenshot(path='insurance_full_page.png')

        browser.close()

verify_insurance()
