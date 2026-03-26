import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Inject mock supabase for testing locally
        await page.route('**/*', lambda route: route.continue_())

        await page.goto('http://localhost:8000')

        # Wait for the login modal and log in
        await page.wait_for_selector('#login-username')
        await page.fill('#login-username', 'Super_Admin')
        await page.click('#login-form button')

        # Mock the Supabase fetch here so it renders rows
        await page.evaluate("""
            window.supabase = {
                from: function(table) {
                    return {
                        select: async function(query) {
                            if (table === 'energy_accounts') {
                                return { data: [
                                    { id: '1', property_name: 'Oracle - Block A', mprn_number: '10123456789', usage_kwh: 5400, total_cost: 1620, company_name: 'Oracle', bill_date: '2026-03-01' }
                                ], error: null };
                            } else if (table === 'insurance_vault') {
                                return { data: [], error: null };
                            }
                            return { data: [], error: null };
                        }
                    };
                }
            };
            fetchDataFromSupabase();
        """)

        await page.wait_for_timeout(2000)

        # Wait for the app to load
        await page.wait_for_selector('#buildings-list tbody > tr')

        # Screenshot the top dashboard
        await page.screenshot(path='screenshot_dashboard.png', full_page=False)

        # Click the first building row to expand the accordion
        await page.locator('#buildings-list tbody > tr').nth(0).click()
        await page.wait_for_timeout(1000)

        # Screenshot the expanded building view
        await page.screenshot(path='screenshot_accordion.png', full_page=False)

        # Click the add account button inside the FIRST accordion row (which is the 2nd tr, so index 1)
        add_account_btn = page.locator('button:has-text("+ Add Metered Account")').nth(0)
        await add_account_btn.click(force=True)
        await page.wait_for_timeout(500)

        await page.screenshot(path='screenshot_add_account.png', full_page=False)

        await browser.close()

asyncio.run(run())
