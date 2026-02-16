const { Router } = require("express");
const router = Router();

/**
 * GET /api/products
 *
 * List products with optional category filter.
 */
router.get("/", async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    const filter = category ? { category } : {};

    const products = await req.db
      .collection("products")
      .find(filter)
      .limit(Number(limit))
      .toArray();

    res.json({ count: products.length, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/products/top-sellers
 *
 * INTENTIONALLY SLOW: Scans the entire orders collection, unwinds every
 * item, then groups and sorts. No indexes help this pipeline.
 */
router.get("/top-sellers", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const pipeline = [
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.name" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: Number(limit) },
    ];

    const topSellers = await req.db
      .collection("orders")
      .aggregate(pipeline)
      .toArray();

    res.json({ topSellers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
