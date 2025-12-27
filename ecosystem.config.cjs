module.exports = {
  apps: [
    {
      name: "fe_ng",
      cwd: "/home/app/supplydata/fe_ng",
      script: "npx",
      args: "serve dist --single -l 3090",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      watch: false,
    },
  ],
};
