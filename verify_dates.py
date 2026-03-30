from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8000/index.html')

        # Login
        page.fill('#login-username', 'dobutilities')
        page.click('button[type="submit"]')
        time.sleep(3)

        # Check default dates
        start_date = page.locator('#start-date-filter').input_value()
        end_date = page.locator('#end-date-filter').input_value()
        print(f"Default start date: {start_date}")
        print(f"Default end date: {end_date}")

        # Check filter effect by taking a screenshot of the chart and table
        page.screenshot(path='before_filter.png')

        # Change date
        page.fill('#start-date-filter', '2026-06-01')
        # trigger change event
        page.locator('#start-date-filter').evaluate('node => node.dispatchEvent(new Event("change"))')
        time.sleep(2)

        page.screenshot(path='after_filter.png')

        print("Verification completed successfully. Screenshots saved.")
        browser.close()

if __name__ == '__main__':
    main()
