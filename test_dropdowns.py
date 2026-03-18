import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("http://localhost:8000")

        await page.fill("#login-username", "Super_Admin")
        await page.click("#login-form button[type='submit']")

        await page.wait_for_timeout(1000)

        await page.click("#add-building")
        await page.wait_for_timeout(500)

        await page.click("#add-b-company")
        await page.wait_for_timeout(500)

        await page.screenshot(path="add_building_dropdown.png")

        await page.click("#close-add-building-modal")
        await page.wait_for_timeout(500)

        await page.click("#add-entry")
        await page.wait_for_timeout(500)

        await page.click("#wizard-company")
        await page.wait_for_timeout(500)

        await page.screenshot(path="new_reading_dropdown.png")

        await browser.close()

asyncio.run(run())
