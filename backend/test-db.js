require('dotenv').config();
const { Client } = require('pg');

console.log('Testing connection to:', process.env.DATABASE_URL);

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

client.connect()
    .then(() => {
        console.log('Connected successfully!');
        return client.query('SELECT NOW()');
    })
    .then(res => {
        console.log('Query result:', res.rows[0]);
        client.end();
    })
    .catch(err => {
        console.error('Connection error:', err.message);
        if (err.code) console.error('Error code:', err.code);
        client.end();
    });
