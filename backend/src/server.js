require("dotenv").config();

const app = require("./app");
const { testConnection } = require("./db/mysql");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 4000;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_NAME = process.env.DB_NAME || "unidex_customer_db";

async function startServer() {
  try {
    await testConnection();

    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Network access enabled on http://<your-pc-ip>:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server.");
    console.error("Database connection details:", {
      code: error.code || "UNKNOWN",
      message: error.message || "(no message provided by driver)",
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME
    });

    if (error.code === "ECONNREFUSED") {
      console.error("MySQL is not reachable. Start your MySQL service and verify DB_HOST/DB_PORT.");
    }

    process.exit(1);
  }
}

startServer();
