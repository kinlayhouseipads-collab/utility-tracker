import asyncio
from playwright.async_api import async_playwright
import time

async def verify_backup():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        print("Navigating to http://localhost:3000")
        await page.goto("http://localhost:3000")

        # Login
        print("Logging in as Super_Admin")
        await page.wait_for_selector("#login-username")
        await page.fill("#login-username", "Super_Admin")
        await page.click("button[type='submit']")

        await page.wait_for_selector("#main-dashboard", state="visible")

        # Take screenshot of new button
        await page.screenshot(path="screenshot_with_backup_button.png")
        print("Screenshot saved: screenshot_with_backup_button.png")

        # Add a building
        print("Adding a new building to trigger storage...")
        await page.click("#add-building")
        await page.wait_for_selector("#add-building-modal", state="visible")

        await page.fill("#add-b-name", "Test Building Storage")
        await page.fill("#add-b-address", "123 Storage Lane")
        await page.select_option("#add-b-company", value="oracle")
        await page.fill("#add-b-area", "2500")

        await page.click("#add-building-form button[type='submit']")

        # Wait a bit
        await asyncio.sleep(1)

        # Download backup
        print("Clicking backup data button...")
        async with page.expect_download() as download_info:
            await page.click("#backup-data-btn")
        download = await download_info.value
        await download.save_as("test_backup.json")
        print(f"Downloaded backup to {download.path()}")

        # Refresh page
        print("Refreshing page to check persistence...")
        await page.reload()

        # Check if building is still there
        await page.wait_for_selector("#main-dashboard", state="visible")
        await asyncio.sleep(1)
        await page.screenshot(path="screenshot_after_refresh.png")
        print("Screenshot saved: screenshot_after_refresh.png")

        # See if the building is in the text
        content = await page.content()
        if "Test Building Storage" in content:
            print("SUCCESS: Building was persisted across refresh!")
        else:
            print("ERROR: Building was NOT found after refresh.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_backup())
