const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
    console.log("Starting Chrome Headless...");
    const browser = await chromium.launch({ headless: true });

    // Create an incognito context
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Navigating to frontend login: http://localhost:3000/ndpma/login");

    try {
        await page.goto('http://localhost:3000/ndpma/login', { waitUntil: 'networkidle' });

        console.log("Typing credentials...");
        await page.fill('input[type="email"]', 'praveen123');
        await page.fill('input[type="password"]', 'Nice@1234');

        // Setup request interception to watch for the actual POST /api/auth/login and subsequent GETs
        page.on('request', request => {
            if (request.url().includes('/api/')) {
                console.log(`[OUT] ${request.method()} ${request.url()} | Headers: ${JSON.stringify(request.headers())}`);
            }
        });

        page.on('response', async response => {
            if (response.url().includes('/api/')) {
                console.log(`[IN]  ${response.status()} ${response.url()}`);
                const headers = await response.headersArray();
                const setCookieHeader = headers.find(h => h.name.toLowerCase() === 'set-cookie');
                if (setCookieHeader) {
                    console.log(`      Set-Cookie received: ${setCookieHeader.value}`);
                }
            }
        });

        console.log("Clicking Sign In...");
        await page.click('button[type="submit"]');

        console.log("Waiting 5 seconds to observe network traffic...");
        await page.waitForTimeout(5000);

        console.log("Checking stored cookies in the browser context...");
        const cookies = await context.cookies();
        console.log("Total cookies stored:", cookies.length);
        console.dir(cookies, { depth: null });

        // Assert we actually have a cookie
        if (cookies.length === 0) {
            console.error("FAIL: Browser accepted NO cookies. This is a severe Cross-Origin issue, not a timing issue.");
        } else {
            console.log("SUCCESS: Browser accepted cookies. This means the 401 is timing or interceptor related.");
        }

    } catch (err) {
        console.error("Test failed to run:", err);
    } finally {
        await browser.close();
    }
})();
