const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    console.log('Testing database connection...\n');

    // Parse the DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    console.log('Connection string (password masked):');
    console.log(dbUrl.replace(/:([^@]+)@/, ':****@'));
    console.log('');

    const client = new Client({
        connectionString: dbUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Attempting to connect...');
        await client.connect();
        console.log('✅ Connection successful!');

        console.log('\nTesting query...');
        const result = await client.query('SELECT NOW()');
        console.log('✅ Query successful!');
        console.log('Current time from database:', result.rows[0].now);

        // Test if we can see tables
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('\n📋 Tables in database:');
        tables.rows.forEach(row => console.log('  -', row.table_name));

    } catch (error) {
        console.error('❌ Connection failed!');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('\nFull error:', error);
    } finally {
        await client.end();
    }
}

testConnection();
