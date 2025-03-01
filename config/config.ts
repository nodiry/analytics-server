// config.ts
const environment = (process.env.NODE_ENV as "development" | "test" | "production") || "development";

const config = {
  development: {
    db: "mongodb://localhost/Analytics",
    logLevel: "debug"
  },
  test: {
    db: "mongodb://localhost/test_db",
    logLevel: "warn"
  },
  production: {
    db: process.env.DB,
    logLevel: "error"
  }
};


export default config[environment];
