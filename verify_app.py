from playwright.sync_api import sync_playwright

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
                                    { id: '1', property_name: 'Oracle - Block A', mprn_number: '10123456789', usage_kwh: 5400, total_cost: 1620, company_name: 'Oracle', bill_date: '2026-03-01' },
                                    { id: '2', property_name: 'Oracle - Block A', mprn_number: '10123456789', usage_kwh: 6000, total_cost: 1800, company_name: 'Oracle', bill_date: '2026-04-01' },
                                    { id: '3', property_name: 'Google HQ', mprn_number: '9876543210', usage_kwh: 12000, total_cost: 3500, company_name: 'Google', bill_date: '2026-03-15' }
                                ], error: null };
                            } else if (table === 'insurance_vault') {
                                return { data: [], error: null };
                            }
                            return { data: [], error: null };
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

        page.screenshot(path='screenshot_before_delete.png')

        # Scroll down and open accordion
        page.evaluate("window.scrollBy(0, 300)")
        page.wait_for_timeout(500)

        # Click the first row to expand accordion
        rows = page.locator('#buildings-list tbody tr')
        if rows.count() > 0:
            rows.nth(0).click()
            page.wait_for_timeout(1000)
            page.screenshot(path='accordion_before_delete.png')

            page.on("dialog", lambda dialog: dialog.accept())

            # Find the trash button and click it
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
    verify_deletion_and_login()
