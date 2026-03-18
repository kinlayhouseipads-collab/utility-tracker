from playwright.sync_api import sync_playwright

def verify_grids():
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
                                    { property_name: 'Oracle - Block A', mprn_number: '10123456789', current_kwh: 5400, total_cost: 1620 },
                                    { property_name: 'Google HQ', mprn_number: '9876543210', current_kwh: 12000, total_cost: 3500 }
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
                        }
                    };
                }
            };
        """)

        # Perform login as dobutilities to trigger fetchEnergyData
        page.fill('#login-username', 'dobutilities')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)

        # Scroll down to ensure grids are visible
        page.evaluate("window.scrollBy(0, 500)")
        page.wait_for_timeout(500)

        page.screenshot(path='grids_energy_view.png')
        print("Energy grids view screenshot saved as grids_energy_view.png")

        # Click show insurance button
        page.click('#toggle-insurance-btn')
        page.wait_for_timeout(1000)

        page.evaluate("window.scrollBy(0, 500)")
        page.wait_for_timeout(500)

        page.screenshot(path='grids_insurance_view.png')
        print("Insurance grids view screenshot saved as grids_insurance_view.png")

        # Click a card to open entry modal
        page.click('#energy-list-grid .card:first-child')
        page.wait_for_timeout(1000)
        page.screenshot(path='wizard_modal_open.png')
        print("Wizard modal screenshot saved as wizard_modal_open.png")

        browser.close()

if __name__ == '__main__':
    verify_grids()
