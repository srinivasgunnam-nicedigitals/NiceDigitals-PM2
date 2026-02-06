
const PORTS = [3000, 3001];

async function verifyAuthHardening() {
    console.log("Deep Debug Verifying...");

    let BASE_URL = '';

    for (const port of PORTS) {
        try {
            const res = await fetch(`http://localhost:${port}/health`);
            console.log(`Port ${port} health: ${res.status}`);
            if (res.ok) {
                BASE_URL = `http://localhost:${port}/api`;
                // break; 
                // Don't break, see if both are running
            }
        } catch (e) {
            console.log(`Port ${port} failed: ${e.message}`);
        }
    }

    if (!BASE_URL) return;

    // Check Bootstrap route (should be 401 or 200)
    try {
        const res = await fetch(`${BASE_URL}/bootstrap`);
        console.log(`Bootstrap status: ${res.status}`);
    } catch (e) { console.log("Bootstrap err:", e.message); }

    // Check Auth Login
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@nicedigitals.com', password: 'password' })
        });
        console.log(`Login status: ${res.status}`);
        if (!res.ok) {
            console.log(await res.text());
        }
    } catch (e) { console.log("Login err:", e.message); }
}

verifyAuthHardening();
