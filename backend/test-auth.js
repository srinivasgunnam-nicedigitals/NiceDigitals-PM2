const axios = require('axios');

async function testAuth() {
    const email = 'admin@nicedigitals.com';
    const password = 'password123';
    const baseUrl = 'http://localhost:3001/api';

    try {
        console.log('\nTesting Login with Seeded Admin...');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            email,
            password
        });
        console.log('Login Status:', loginRes.status);

        // Check for user object in response
        if (loginRes.data.user) {
            console.log('Login Success. User:', loginRes.data.user.email);
        } else {
            console.error('Login Failed: No user data', loginRes.data);
        }

        // Check for cookie
        const cookies = loginRes.headers['set-cookie'];
        if (cookies) {
            console.log('Cookie received:', cookies);
        } else {
            console.log('No cookie received (check if httpOnly)');
        }

    } catch (error) {
        if (error.response) {
            console.error('Error Response:', error.response.status, error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testAuth();
