from playwright.sync_api import sync_playwright
import time

def verify_deletion_and_login():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 1024})

        # Inject mock supabase for testing locally
        page.route('**/*', lambda route: route.continue_())

        page.goto('http://127.0.0.1:8000')
        page.wait_for_timeout(1000)

        page.evaluate("""
            window.supabase = {
                from: function(table) {
                    return {
                        select: async function(query) {
                            if (table === 'energy_accounts') {
                                return { data: [
                                    { property_name: 'Oracle - Block A', mprn_number: '10123456789', current_kwh: 5400, total_cost: 1620, company_name: 'Oracle' },
                                    { property_name: 'Google HQ', mprn_number: '9876543210', current_kwh: 12000, total_cost: 3500, company_name: 'Google' }
                                ], error: null };
                            } else if (table === 'insurance_vault') {
                                return { data: [
                                    { broker_name: 'Allianz', policy_number: 'POL-99123', renewal_date: '2027-01-15', premium_cost: 4500 },
                                    { provider: 'Zurich', policy_type: 'Public Liability', renewal_date: '2026-11-20', premium_cost: 1200 }
                                ], error: null };
                            }
                            return { data: [], error: null };
                        },
                        upsert: async function(data) {
                            return { data: data, error: null };
                        },
                        delete: function() {
                            return {
                                eq: async function(field, value) {
                                    console.log('Mock Deleted:', field, value);
                                    return { data: [], error: null, status: 204 };
                                }
                            };
                        }
                    };
                }
            };
        """)

        # Perform login
        page.fill('#login-username', 'Super_Admin')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)

        # Take a screenshot to verify login bypassing buildings.json and loading from mock
        page.screenshot(path='screenshot_after_refresh.png')
        print("Dashboard after login screenshot saved as screenshot_after_refresh.png")

        # Scroll down and open accordion
        page.evaluate("window.scrollBy(0, 300)")
        page.wait_for_timeout(500)

        # Click the first row to expand accordion
        rows = page.locator('#buildings-list tbody tr')
        if rows.count() > 0:
            rows.nth(0).click()
            page.wait_for_timeout(1000)
            page.screenshot(path='accordion_with_history.png')
            print("Accordion expanded screenshot saved as accordion_with_history.png")

            # Click trash icon on first bill
            trash_buttons = page.locator('button[title="Delete Bill"]')
            if trash_buttons.count() > 0:
                # Override confirm dialog to always return true
                page.on("dialog", lambda dialog: dialog.accept())
                trash_buttons.nth(0).click()
                page.wait_for_timeout(1000)
                print("Clicked delete bill icon.")
                page.screenshot(path='after_delete_bill.png')

        browser.close()

if __name__ == '__main__':
    verify_deletion_and_login()
