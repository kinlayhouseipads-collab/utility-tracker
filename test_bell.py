from playwright.sync_api import sync_playwright

def test_bell(page):
    page.goto("http://localhost:8000")
    page.fill("#login-username", "Super_Admin")
    page.click("button[type='submit']")
    page.wait_for_selector("#main-dashboard", state="visible")
    page.wait_for_timeout(1000)
    page.click("#notification-bell")
    page.wait_for_timeout(1000)
    page.screenshot(path="bell_dropdown.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        b = p.chromium.launch()
        test_bell(b.new_page())
        b.close()
