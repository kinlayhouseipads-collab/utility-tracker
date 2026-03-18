from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://127.0.0.1:8000')

    # Login
    page.fill('#login-username', 'Oracle_Admin')
    page.click('button[type="submit"]')
    page.wait_for_timeout(1000)

    # Click Contract Dates
    page.click('#view-contracts')
    page.wait_for_timeout(1000)

    # Screenshot the contract dates section
    page.screenshot(path='contract_dates_view.png')

    browser.close()
