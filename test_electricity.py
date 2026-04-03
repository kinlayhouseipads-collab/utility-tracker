from playwright.sync_api import sync_playwright

def test_electricity_cost_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:8000')

        page.fill('#login-username', 'Super_Admin')
        page.click('button[type="submit"]')
        page.wait_for_selector('#stat-electricity')

        # check graph
        page.screenshot(path='/home/jules/verification/verification.png')

        browser.close()

if __name__ == '__main__':
    test_electricity_cost_dashboard()
