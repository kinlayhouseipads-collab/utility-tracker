import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to login
        await page.goto("http://localhost:8000")

        # Login
        await page.fill("#login-username", "Super_Admin")
        await page.click("#login-form button[type='submit']")

        # Wait for dashboard to load
        await page.wait_for_timeout(1000)

        # Take screenshot of Dashboard
        await page.screenshot(path="dashboard_after_fix.png")

        # Click on the first building to expand accordion
        await page.click("table tbody tr:first-child td:first-child")
        await page.wait_for_timeout(1000)

        # Take screenshot of Accordion (which should have Bill History now)
        await page.screenshot(path="accordion_with_history.png", full_page=True)

        await browser.close()

asyncio.run(run())
