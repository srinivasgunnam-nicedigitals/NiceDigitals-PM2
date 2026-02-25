// A pure Node script to test the backend cookie assignment logic
async function test() {
    console.log("Testing POST /api/auth/login to http://192.168.0.125:3001/api/auth/login");
    try {
        const response = await fetch('http://192.168.0.125:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: 'praveen123', password: 'Nice@1234' })
        });

        console.log(`Status: ${response.status}`);

        const setCookie = response.headers.get('set-cookie');
        console.log(`\nSet-Cookie Header Received:\n${setCookie || 'NONE'}`);

        if (setCookie) {
            console.log("\nCookie parsing check:");
            console.log(setCookie.split(';').map(s => s.trim()));

            // Critical check: does it have SameSite=None without Secure?
            if (setCookie.includes('SameSite=None') && !setCookie.includes('Secure')) {
                console.error("\n❌ FATAL FLAW: SameSite=None was specified, but Secure was not. Modern browsers will REJECT this cookie entirely.");
            } else if (setCookie.includes('SameSite=Lax')) {
                console.warn("\n⚠️ WARNING: SameSite=Lax is set. If the frontend is on localhost and backend is on an IP, Chrome considers this CROSS-SITE and will REJECT it.");
            } else {
                console.log("\n✅ Cookie header format looks okay for same-origin, but might fail cross-origin.");
            }
        } else {
            console.error("\n❌ FATAL FLAW: Backend did not send a Set-Cookie header at all.");
        }

    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

test();
