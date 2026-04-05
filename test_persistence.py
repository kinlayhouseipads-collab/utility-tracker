from playwright.sync_api import sync_playwright
import time
import random

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8000')
        page.wait_for_selector('#login-username', timeout=10000)
        page.fill('#login-username', 'Super_Admin')
        page.click('button[type="submit"]')

        page.wait_for_selector('#main-dashboard', state='visible', timeout=10000)
        time.sleep(2)

        # open modal
        page.click('#add-entry')
        page.wait_for_selector('#entry-modal', state='visible')

        rand_usage = random.randint(100, 999)

        page.select_option('#wizard-company', index=1)
        time.sleep(0.5)
        page.click('#wizard-next-1')

        page.select_option('#wizard-building', index=1)
        time.sleep(0.5)
        page.click('#wizard-next-2')

        page.select_option('#wizard-account', index=1)
        time.sleep(0.5)

        page.fill('#reading-value', str(rand_usage))
        page.fill('#reading-cost', '150.00')

        page.click('button:has-text("Save Reading")')
        print(f"Submitted reading: usage {rand_usage}")
        time.sleep(3)

        # Refresh page
        print("Refreshing page...")
        page.reload()
        page.wait_for_selector('#main-dashboard', state='visible', timeout=10000)
        time.sleep(3)

        # Open history for the first account to check if the new provider or reading was saved
        # Actually just clicking on history modal
        page.evaluate("() => { const btns = document.querySelectorAll('.dropdown-menu button'); for(let b of btns) { if(b.innerHTML.includes('History')) { b.click(); break; } } }")

        page.wait_for_selector('#bill-history-modal', state='visible')
        time.sleep(2)

        # check if random usage is in the list
        content = page.content()
        if 'TestProviderXYZ' in content or str(rand_usage) in content:
            print("SUCCESS: Data persisted after refresh!")
        else:
            print("FAILURE: Could not find the submitted data after refresh.")

        browser.close()

if __name__ == "__main__":
    test()
