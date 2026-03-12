from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 1024})

        # Go to the local server
        page.goto('http://127.0.0.1:8000')
        page.wait_for_timeout(1000)

        # Perform login as Super_Admin
        page.fill('#login-username', 'Super_Admin')
        page.click('button[type="submit"]')
        page.wait_for_timeout(1000)

        # Take a screenshot of the new table
        page.screenshot(path='table_view.png')
        print("Table screenshot saved as table_view.png")

        # Click the first row to expand accordion
        # tbody tr:first-child should be the first building row
        page.click('tbody tr:first-child')
        page.wait_for_timeout(1000)

        # Take a screenshot of the expanded row
        page.screenshot(path='accordion_view.png')
        print("Accordion screenshot saved as accordion_view.png")

        # Click header to sort
        page.click('#sort-end-date')
        page.wait_for_timeout(1000)

        # Take a screenshot after sort
        page.screenshot(path='sorted_view.png')
        print("Sorted view screenshot saved as sorted_view.png")

        browser.close()

if __name__ == '__main__':
    verify_app()