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

        page.screenshot(path='grids_energy_view_verified.png')
        print("Energy grids view screenshot saved as grids_energy_view_verified.png")

        page.evaluate("document.getElementById('entry-modal').style.display='block'")
        page.wait_for_timeout(1000)

        # Step 1
        page.evaluate("document.getElementById('wizard-company').value='oracle'")
        page.evaluate("document.getElementById('wizard-next-1').click()")
        page.wait_for_timeout(500)

        # Step 2
        page.evaluate("document.getElementById('wizard-building').selectedIndex=1")
        page.evaluate("document.getElementById('wizard-next-2').click()")
        page.wait_for_timeout(500)

        # Step 3
        page.evaluate("document.getElementById('wizard-account').selectedIndex=1")

        # Fill in new reading info to test save function
        page.evaluate("document.getElementById('wizard-step-1').style.display='none'; document.getElementById('wizard-step-2').style.display='none'; document.getElementById('wizard-step-3').style.display='block';")
        page.wait_for_timeout(500)
        page.evaluate("document.getElementById('reading-value').value='500'")
        page.evaluate("document.getElementById('reading-cost').value='100'")
        page.screenshot(path='wizard_modal_open_verified.png')
        print("Wizard modal screenshot saved as wizard_modal_open_verified.png")

        browser.close()

if __name__ == '__main__':
    verify_grids()
