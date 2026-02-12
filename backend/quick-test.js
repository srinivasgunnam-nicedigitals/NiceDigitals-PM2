const { Client } = require('pg');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function quickTest() {
    const tests = [
        { name: 'Pooler', url: process.env.DATABASE_URL },
        { name: 'Direct', url: process.env.DIRECT_URL }
    ];

    for (const test of tests) {
        console.log(`\n${test.name}: ${test.url.replace(/:([^:@]+)@/, ':****@')}`);
        const client = new Client({
            connectionString: test.url,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });

        try {
            await client.connect();
            const result = await client.query('SELECT 1 as test');
            console.log(`✅ SUCCESS - Query returned: ${result.rows[0].test}`);
            await client.end();
        } catch (error) {
            console.log(`❌ FAILED - ${error.code}: ${error.message}`);
        }
    }
}

quickTest();
