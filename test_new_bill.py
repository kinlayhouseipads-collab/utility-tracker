from playwright.sync_api import sync_playwright

def verify_new_bill():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 1024})

        page.goto('http://127.0.0.1:8000')
        page.wait_for_timeout(1000)

        # Handle dialogs automatically
        page.on("dialog", lambda dialog: dialog.accept())

        # Intercept console logs
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Login
        page.fill('#login-username', 'Super_Admin')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)

        # Click + New Entry
        page.click('#add-entry')
        page.wait_for_timeout(500)

        # Step 1: Select company
        page.select_option('#wizard-company', index=1)
        page.click('#wizard-next-1')
        page.wait_for_timeout(500)

        # Step 2: Select Property
        page.select_option('#wizard-building', index=1)
        page.click('#wizard-next-2')
        page.wait_for_timeout(500)

        # Mock supabase before submit so it intercepts the actual function call
        page.evaluate("""
            window.mock_payload = null;
            window.supabase = {
                from: function(table) {
                    return {
                        insert: async function(payload) {
                            console.log('MOCK INSERT CALLED:', payload);
                            window.mock_payload = payload;
                            return { data: [], error: null };
                        },
                        select: async function() { return { data: [], error: null }; }
                    };
                },
                channel: function() {
                    return {
                        on: function() { return this; },
                        subscribe: function() { return this; }
                    }
                }
            };

            // Bypass the alert so it doesn't block the script
            window.alert = function() { console.log("Alert bypassed"); };
        """)

        # Step 3: Account & Reading
        page.select_option('#wizard-account', index=1)
        page.fill('#reading-value', '100')
        page.fill('#reading-cost', '50.25')
        page.screenshot(path='wizard_step3_filled.png')

        page.click('button:has-text("Save Reading")')
        page.wait_for_timeout(1000)

        payload = page.evaluate("window.mock_payload")
        print("Captured payload:", payload)

        browser.close()

if __name__ == '__main__':
    verify_new_bill()
