import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function main() {
    try {
        console.log('1. Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@nicedigital.com',
            password: 'SecretPassword123!'
        });
        
        const token = loginRes.data.token;
        const tenantId = loginRes.data.user.tenantId;
        console.log('✅ Login Successful');
        
        // Decode token to see payload
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log('🔍 Token Payload:', JSON.stringify(payload, null, 2));

        console.log(`Tenant from response body: ${tenantId}`);

        console.log('\n2. Fetching Users...');
        const usersRes = await axios.get(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✅ Fetched ${usersRes.data.length} users.`);
        usersRes.data.forEach((u: any) => {
            console.log(`- ${u.name} (${u.email}) [${u.role}] ID: ${u.id}`);
        });

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

main();
