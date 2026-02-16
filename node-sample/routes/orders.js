const { Router } = require("express");
const router = Router();

/**
 * GET /api/orders?storeId=S0001&from=2025-01-01&to=2025-06-30
 *
 * INTENTIONALLY SLOW: No compound index on {storeId, createdAt}.
 * This forces a COLLSCAN that students will detect and fix in Lab 02.
 */
router.get("/", async (req, res) => {
  try {
    const { storeId, from, to, limit = 50 } = req.query;

    const filter = {};
    if (storeId) filter.storeId = storeId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const orders = await req.db
      .collection("orders")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .toArray();

    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/summary
 *
 * INTENTIONALLY SLOW: Unoptimized aggregation – $unwind + $lookup on every
 * order, then $group. No pre-filtering, no index support.
 */
router.get("/summary", async (req, res) => {
  try {
    const pipeline = [
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "productId",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: {
            storeId: "$storeId",
            category: "$productInfo.category",
          },
          totalRevenue: { $sum: "$items.subtotal" },
          totalQuantity: { $sum: "$items.quantity" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 },
    ];

    const summary = await req.db
      .collection("orders")
      .aggregate(pipeline)
      .toArray();

    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orders
 *
 * Creates a new order. Used in write-path labs.
 */
router.post("/", async (req, res) => {
  try {
    const order = {
      ...req.body,
      createdAt: new Date(),
      status: req.body.status || "completed",
    };

    const result = await req.db.collection("orders").insertOne(order);
    res.status(201).json({ insertedId: result.insertedId, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
