from playwright.sync_api import sync_playwright

def verify_login():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Go to the local server
        page.goto('http://127.0.0.1:8000')
        page.wait_for_timeout(1000)

        # Take a screenshot of the login modal
        page.screenshot(path='login_modal.png')
        print("Login modal screenshot saved as login_modal.png")

        # Perform login
        page.fill('#login-username', 'Oracle_Admin')
        page.click('button[type="submit"]')
        page.wait_for_timeout(1000)

        # Take a screenshot after login
        page.screenshot(path='after_login.png')
        print("After login screenshot saved as after_login.png")

        browser.close()

if __name__ == '__main__':
    verify_login()