module.exports = {
    apps: [
        {
            name: 'pma-backend',
            script: './dist/index.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3002,
            },
        },
    ],
};
