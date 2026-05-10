module.exports = {
  apps: [
    {
      name: 'sally-api',
      script: 'src/index.js',
      cwd: '/opt/sally/api',
      instances: 2,
      exec_mode: 'cluster',
      env_file: '/opt/sally/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
