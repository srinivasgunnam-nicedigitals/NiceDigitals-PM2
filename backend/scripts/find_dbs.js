const { Client } = require('pg');

async function main() {
    const config = {
        user: 'postgres',
        password: 'Nicedigitals2025',
        host: 'localhost',
        port: 5432,
        database: 'postgres'
    };
    
    let client = new Client(config);
    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
        const dbs = res.rows.map(r => r.datname);
        await client.end();
        
        console.log("Databases found:", dbs);
        
        for (const dbName of dbs) {
            const dbClient = new Client({ ...config, database: dbName });
            try {
                await dbClient.connect();
                // Check if Project table exists
                const tableRes = await dbClient.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'Project'
                    );
                `);
                if (tableRes.rows[0].exists) {
                    const countRes = await dbClient.query('SELECT count(*) FROM "Project"');
                    console.log(`- ${dbName}: "Project" table has ${countRes.rows[0].count} rows.`);
                }
            } catch (e) {
                // ignore
            } finally {
                await dbClient.end();
            }
        }
    } catch (e) {
        console.error("Connection failed:", e);
    }
}

main();
