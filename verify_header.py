from playwright.sync_api import sync_playwright

def capture_header():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://127.0.0.1:8000')

        # Log in first to see the full app header
        page.fill('#login-username', 'Super_Admin')
        page.click('button[type="submit"]')
        page.wait_for_selector('#app-content', state='visible')

        # Take a screenshot of the header
        header = page.locator('.app-header')
        header.screenshot(path='header_with_logo.png')
        print('Screenshot saved to header_with_logo.png')

        browser.close()

if __name__ == '__main__':
    capture_header()
