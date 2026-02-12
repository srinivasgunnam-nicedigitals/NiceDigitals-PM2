const { Client } = require('pg');
require('dotenv').config();

// Disable SSL certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function comprehensiveTest() {
    console.log('='.repeat(60));
    console.log('COMPREHENSIVE DATABASE CONNECTION DIAGNOSTIC');
    console.log('='.repeat(60));
    console.log('');

    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;

    console.log('📋 Configuration Check:');
    console.log('  DATABASE_URL:', dbUrl ? dbUrl.replace(/:([^:@]+)@/, ':****@') : 'NOT SET');
    console.log('  DIRECT_URL:', directUrl ? directUrl.replace(/:([^:@]+)@/, ':****@') : 'NOT SET');
    console.log('  NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);
    console.log('');

    // Test 1: Pooler connection (port 6543)
    console.log('🔍 Test 1: Pooler Connection (Port 6543)');
    console.log('-'.repeat(60));
    await testConnection(dbUrl, 'Pooler');

    console.log('');

    // Test 2: Direct connection (port 5432)
    console.log('🔍 Test 2: Direct Connection (Port 5432)');
    console.log('-'.repeat(60));
    await testConnection(directUrl, 'Direct');

    console.log('');
    console.log('='.repeat(60));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('='.repeat(60));
}

async function testConnection(connectionString, label) {
    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        },
        connectionTimeoutMillis: 10000
    });

    try {
        console.log(`  Connecting to ${label}...`);
        const startTime = Date.now();
        await client.connect();
        const connectTime = Date.now() - startTime;
        console.log(`  ✅ Connected successfully in ${connectTime}ms`);

        // Test query
        const queryStart = Date.now();
        const result = await client.query('SELECT version(), current_database(), current_user');
        const queryTime = Date.now() - queryStart;

        console.log(`  ✅ Query executed in ${queryTime}ms`);
        console.log(`  📊 Database: ${result.rows[0].current_database}`);
        console.log(`  👤 User: ${result.rows[0].current_user}`);
        console.log(`  🗄️  Version: ${result.rows[0].version.substring(0, 50)}...`);

        // Test table access
        try {
            const tables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
                LIMIT 5
            `);
            console.log(`  📋 Sample tables (${tables.rows.length}):`);
            tables.rows.forEach(row => console.log(`     - ${row.table_name}`));
        } catch (err) {
            console.log(`  ⚠️  Could not list tables: ${err.message}`);
        }

    } catch (error) {
        console.log(`  ❌ Connection FAILED`);
        console.log(`  Error Type: ${error.constructor.name}`);
        console.log(`  Error Code: ${error.code || 'N/A'}`);
        console.log(`  Error Message: ${error.message}`);

        if (error.code === 'ECONNREFUSED') {
            console.log(`  💡 Suggestion: Database server is not reachable`);
        } else if (error.code === 'ENOTFOUND') {
            console.log(`  💡 Suggestion: DNS resolution failed - check hostname`);
        } else if (error.message.includes('password')) {
            console.log(`  💡 Suggestion: Password authentication failed - verify credentials`);
        } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
            console.log(`  💡 Suggestion: SSL/TLS certificate issue`);
        } else if (error.message.includes('timeout')) {
            console.log(`  💡 Suggestion: Connection timeout - check network/firewall`);
        }
    } finally {
        try {
            await client.end();
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

comprehensiveTest().catch(console.error);
