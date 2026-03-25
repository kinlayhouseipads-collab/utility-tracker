from playwright.sync_api import sync_playwright

def verify_debounce():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 1024})

        # Inject mock supabase
        page.route('**/*', lambda route: route.continue_())

        page.goto('http://127.0.0.1:8000')
        page.wait_for_timeout(1000)

        page.evaluate("""
            window.supabase = {
                from: function(table) {
                    return {
                        select: async function(query) {
                            return { data: [
                                { id: 'test1', property_name: 'Test Prop', company_name: 'Test Co', mprn_number: '123' }
                            ], error: null };
                        },
                        insert: async function(data) {
                            console.log('Mock Insert called', data);
                            return { data: data, error: null };
                        }
                    };
                }
            };
        """)

        page.fill('#login-username', 'Super_Admin')
        page.click('button[type="submit"]')
        page.wait_for_timeout(1000)

        # Open Entry Wizard
        page.click('#add-entry')
        page.wait_for_timeout(500)

        # Step 1: Select Company
        page.select_option('#wizard-company', index=1)
        page.click('#wizard-next-1')
        page.wait_for_timeout(500)

        # Step 2: Select Property
        page.select_option('#wizard-building', index=1)
        page.click('#wizard-next-2')
        page.wait_for_timeout(500)

        # Step 3: Fill reading
        page.select_option('#wizard-account', index=1)
        page.fill('#reading-value', '100')
        page.fill('#reading-unit-rate', '0.25')

        # Double click the submit button rapidly
        page.evaluate("""
            const submitBtn = document.querySelector('#tracker-form button[type="submit"]');
            submitBtn.click();
            submitBtn.click();
        """)

        page.wait_for_timeout(1000)

        # Verify form cleared
        reading_value = page.evaluate('document.getElementById("reading-value").value')
        print(f"Reading value after submit: '{reading_value}'")

        if reading_value == "":
            print("SUCCESS: Form was reset.")
        else:
            print("FAILURE: Form was not reset.")

        browser.close()

if __name__ == '__main__':
    verify_debounce()
