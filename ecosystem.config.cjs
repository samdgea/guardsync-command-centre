module.exports = {
  apps: [
    {
      name: 'guardsync-fe',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
      },
      env_production: {
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
      },
    },
  ],
};
