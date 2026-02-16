const express = require("express");
const { MongoClient } = require("mongodb");

const ordersRouter = require("./routes/orders");
const productsRouter = require("./routes/products");
const customersRouter = require("./routes/customers");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/pos?replicaSet=rs0";
const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json());

let db;

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db();
  console.log(`Connected to MongoDB: ${db.databaseName}`);
  return db;
}

// Make db available to route handlers
app.use((req, _res, next) => {
  req.db = db;
  next();
});

// Routes
app.use("/api/orders", ordersRouter);
app.use("/api/products", productsRouter);
app.use("/api/customers", customersRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", db: db ? "connected" : "disconnected" });
});

// Start
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`POS API listening on http://0.0.0.0:${PORT}`);
      console.log(
        `\nNOTE: This API is intentionally unoptimized for workshop labs.`
      );
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
