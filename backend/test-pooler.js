const { Client } = require('pg');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testPooler() {
    const url = process.env.DATABASE_URL;
    console.log('Testing Pooler Connection:');
    console.log(url.replace(/:([^:@]+)@/, ':****@'));
    console.log('');

    const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });

    try {
        console.log('Connecting...');
        await client.connect();
        console.log('✅ Connected!');

        console.log('\nTesting query...');
        const result = await client.query('SELECT NOW(), current_database(), current_user');
        console.log('✅ Query successful!');
        console.log('  Database:', result.rows[0].current_database);
        console.log('  User:', result.rows[0].current_user);
        console.log('  Time:', result.rows[0].now);

        console.log('\nListing tables...');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log(`Found ${tables.rows.length} tables:`);
        tables.rows.forEach(row => console.log('  -', row.table_name));

        await client.end();
        console.log('\n✅ ALL TESTS PASSED!');
        process.exit(0);

    } catch (error) {
        console.log('\n❌ FAILED');
        console.log('Error:', error.message);
        console.log('Code:', error.code);
        process.exit(1);
    }
}

testPooler();
