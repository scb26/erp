require("dotenv").config();

const app = require("./app");
const { testConnection } = require("./db/mysql");

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    await testConnection();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
