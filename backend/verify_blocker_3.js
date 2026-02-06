
const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    console.log("Verifying Blocker 3...");

    // 1. Login
    console.log("Logging in...");
    let token;
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@nicedigitals.com', password: 'password' })
        });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        token = data.token;
        console.log("Login successful.");
    } catch (e) {
        console.error("Login failed:", e.message);
        return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Get List (getProjects)
    console.log("\nFetching Project List (getProjects)...");
    try {
        const listRes = await fetch(`${BASE_URL}/projects`, { headers });
        const listData = await listRes.json();
        const projects = listData.data;
        console.log(`Fetched ${projects.length} projects.`);

        if (projects.length > 0) {
            const p = projects[0];
            // Checks for prohibited fields
            // console.log("Keys:", Object.keys(p));

            const prohibited = ['comments', 'history', 'designChecklist', 'devChecklist', 'qaChecklist', 'finalChecklist'];
            const foundProhibited = prohibited.filter(k => p.hasOwnProperty(k));

            if (foundProhibited.length > 0) {
                console.error("\n[FAIL] List payload contains prohibited fields:", foundProhibited.join(', '));
            } else {
                console.log("\n[PASS] List payload is optimized (No comments, history, or checklists).");
            }

            // Size check
            const size = JSON.stringify(p).length;
            console.log(`Approximate payload size per project: ${size} bytes`);
        } else {
            console.warn("No projects found to verify.");
        }
    } catch (e) {
        console.error("Failed to fetch projects.", e.message);
    }

    // 3. Get Detail (getProject)
    console.log("\nFetching Project Detail (getProject/:id)...");
    try {
        const listRes = await fetch(`${BASE_URL}/projects`, { headers });
        const listData = await listRes.json();
        if (listData.data.length > 0) {
            const id = listData.data[0].id;
            const detailRes = await fetch(`${BASE_URL}/projects/${id}`, { headers });
            const p = await detailRes.json();

            if (p.comments && p.history) {
                console.log("\n[PASS] Detail payload contains full data.");
                console.log(`Comments count: ${p.comments.length}`);
                console.log(`History count: ${p.history.length}`);
            } else {
                console.error("\n[FAIL] Detail payload missing expected fields!");
            }
        }
    } catch (e) {
        console.error("Failed to fetch project detail.", e.message);
    }
}

verify();
