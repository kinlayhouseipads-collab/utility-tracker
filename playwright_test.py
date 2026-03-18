import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://localhost:8000')

        # Wait for the login modal and log in
        await page.wait_for_selector('#login-username')
        await page.fill('#login-username', 'Super_Admin')
        await page.click('#login-form button')

        # Wait for the app to load
        await page.wait_for_selector('#buildings-list')

        # Screenshot the top dashboard
        await page.screenshot(path='screenshot_dashboard.png', full_page=False)

        # Click the first building row to expand the accordion
        # In Playwright, nth(0) is the first element
        await page.locator('#buildings-list tbody > tr').nth(0).click()
        await page.wait_for_timeout(1000)

        # Screenshot the expanded building view
        await page.screenshot(path='screenshot_accordion.png', full_page=False)

        # Click the add account button inside the FIRST accordion row (which is the 2nd tr, so index 1)
        # Because we have multiple buttons with "+ Add Metered Account", wait for the visible one
        add_account_btn = page.locator('button:has-text("+ Add Metered Account")').nth(0)
        await add_account_btn.click(force=True)
        await page.wait_for_timeout(500)

        await page.screenshot(path='screenshot_add_account.png', full_page=False)

        await browser.close()

asyncio.run(run())
