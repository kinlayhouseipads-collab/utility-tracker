from playwright.sync_api import sync_playwright

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser error: {err}"))

        page.goto("http://localhost:8000")

        # Login
        page.fill("#login-username", "dobutilities")
        page.click("button[type='submit']")

        # Verify Dashboard is visible
        page.wait_for_selector("#main-dashboard", state="visible")

        # Click + New Entry
        page.click("#add-entry")
        page.wait_for_selector("#entry-modal", state="visible")

        # Step 1
        page.select_option("#wizard-company", value="oracle")
        page.click("#wizard-next-1")

        # Step 2
        page.wait_for_selector("#wizard-step-2", state="visible")
        page.select_option("#wizard-building", label="Building A1")
        page.click("#wizard-next-2")

        # Step 3
        page.wait_for_selector("#wizard-step-3", state="visible")
        page.select_option("#wizard-account", index=1)
        page.fill("#reading-value", "100")
        page.fill("#reading-unit-rate", "0.2")
        page.fill("#reading-date", "2026-03-18")

        # Click save
        page.once("dialog", lambda dialog: dialog.accept()) # accept alert box
        page.click("button[type='submit']:has-text('Save Reading')")

        # Give some time for submission to execute
        page.wait_for_timeout(2000)

        print("Test passed")

        browser.close()

if __name__ == "__main__":
    test()
