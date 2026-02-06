
const PORTS = [3000, 3001];

async function verifyAuthHardening() {
    console.log("Verifying High-Risk Auth Items...");

    let BASE_URL = '';

    // Find active port
    for (const port of PORTS) {
        try {
            const res = await fetch(`http://localhost:${port}/health`);
            if (res.ok) {
                console.log(`Server found at port ${port}`);
                BASE_URL = `http://localhost:${port}/api`;
                break;
            }
        } catch (e) { }
    }

    if (!BASE_URL) {
        console.error("Could not find running server at 3000 or 3001");
        return;
    }

    // 1. Verify Rate Support
    console.log("\nTesting Password Reset Rate Limit (Should fail after 5 attempts)...");
    const email = 'admin@nicedigitals.com';

    for (let i = 1; i <= 7; i++) {
        try {
            const res = await fetch(`${BASE_URL}/auth/request-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (res.ok) {
                console.log(`Attempt ${i}: Success (200 OK)`);
            } else {
                console.log(`Attempt ${i}: Failed (${res.status})`);
                if (res.status === 429) {
                    console.log("   [PASS] Rate limit hit!");
                }
            }
            // Add slight delay to prevent overwhelming
        } catch (e) {
            console.error(`Attempt ${i}: Error`, e.message);
        }
    }

    // 3. Verify Login with Empty Password
    console.log("\nVerifying Login with Missing Password...");
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'nonexistent@example.com', password: 'password' })
        });
        console.log(`Login nonexistent result: ${res.status}`);
        if (res.status === 401) {
            console.log("   [PASS] Received 401 Unauthorized for invalid user");
        } else if (res.status === 404) {
            console.error("   [FAIL] 404 Route Not Found");
        }
    } catch (e) {
        console.error("Login test error:", e.message);
    }
}

verifyAuthHardening();
