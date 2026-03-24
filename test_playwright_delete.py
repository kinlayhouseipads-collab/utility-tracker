from playwright.sync_api import sync_playwright

def verify_deletion():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 1024})

        page.goto('http://127.0.0.1:8000')
        page.wait_for_timeout(1000)

        page.fill('#login-username', 'Super_Admin')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)

        # Scroll down and open accordion
        page.evaluate("window.scrollBy(0, 300)")
        page.wait_for_timeout(500)

        rows = page.locator('#buildings-list tbody > tr')
        if rows.count() > 0:
            rows.nth(0).click()
            page.wait_for_timeout(1000)

            page.on("dialog", lambda dialog: dialog.accept())

            page.evaluate("""
                const trashButtons = document.querySelectorAll('button[title="Delete Bill"]');
                if (trashButtons.length > 0) {
                    trashButtons[0].click();
                }
            """)
            page.wait_for_timeout(1000)

            page.screenshot(path='after_delete_bill.png')

        browser.close()

if __name__ == '__main__':
    verify_deletion()
