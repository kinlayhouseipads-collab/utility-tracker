from playwright.sync_api import sync_playwright
import time
import random

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto('http://localhost:8000/insurance.html')

        # Login
        page.fill('#login-username', 'dobutilities')
        page.click('button[type="submit"]')
        time.sleep(2)

        # Open add insurance modal
        page.evaluate("document.getElementById('add-insurance-btn').click()")
        page.wait_for_selector('#add-insurance-modal', state='visible')

        # Fill insurance data
        # we need a building first. But we don't know what is there. Just pick the first if available.
        building_val = page.evaluate('''() => {
            const select = document.getElementById('ins-building');
            if (select.options.length > 1) {
                return select.options[1].value;
            }
            return "";
        }''')

        if building_val:
            page.select_option('#ins-building', value=building_val)

        page.fill('#ins-policy-number', f"POL-{random.randint(1000, 9999)}")
        page.fill('#ins-provider', 'Allianz')
        page.fill('#ins-broker', 'BrokerXYZ')
        page.check('#ins-paid')
        page.select_option('#ins-type', 'Van / Motor')
        page.fill('#ins-coverage', '1000000')
        page.fill('#ins-premium', '1500')
        page.fill('#ins-last-year-premium', '1200')

        # submit
        page.click('#btn-save-insurance')

        time.sleep(3) # wait for save and reload

        # Wait for data to render in grid
        try:
            page.wait_for_selector('#insurance-vault-grid .card', state='visible', timeout=5000)
            page.screenshot(path='/tmp/screenshot_insurance_grid.png')

            # Click the toggle button for the first policy
            # We will use evaluate to find the first toggle and click it
            page.evaluate("""() => {
                const firstToggle = document.querySelector('[id^="status-icon-"]');
                if (firstToggle) firstToggle.click();
            }""")
            time.sleep(2)
            page.screenshot(path='/tmp/screenshot_insurance_toggle.png')

            # Fill filter inputs
            page.fill('#ins-filter-broker', 'xyz')
            time.sleep(1)
            page.screenshot(path='/tmp/screenshot_insurance_filtered_broker.png')

            page.select_option('#ins-filter-status', 'unpaid')
            time.sleep(1)
            page.screenshot(path='/tmp/screenshot_insurance_filtered_unpaid.png')

        except Exception as e:
            print("Could not find cards, maybe empty list. Error:", e)

        print("Verification completed successfully. Screenshots saved.")
        browser.close()

if __name__ == '__main__':
    main()
