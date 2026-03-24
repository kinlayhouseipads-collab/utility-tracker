from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8000')
        page.wait_for_selector('#login-username')
        page.fill('#login-username', 'Super_Admin')
        page.click('button[type="submit"]')

        # Wait for data fetch
        time.sleep(2)

        cost = page.locator('#stat-cost').inner_text()
        elec = page.locator('#stat-electricity').inner_text()
        print(f"Cost: {cost}, Elec: {elec}")
        browser.close()

if __name__ == '__main__':
    run()
