const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(helmet());
app.use(cors());
app.use(express.json());

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ message: "Server is up and running!" });
});

// START SERVER
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
