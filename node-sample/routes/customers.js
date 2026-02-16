const { Router } = require("express");
const router = Router();

/**
 * GET /api/customers
 *
 * List customers with optional loyalty tier filter.
 */
router.get("/", async (req, res) => {
  try {
    const { loyaltyTier, limit = 50 } = req.query;
    const filter = loyaltyTier ? { loyaltyTier } : {};

    const customers = await req.db
      .collection("customers")
      .find(filter)
      .limit(Number(limit))
      .toArray();

    res.json({ count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/customers/:id/history
 *
 * INTENTIONALLY SLOW: No index on orders.customerId.
 * Full collection scan on 50k orders for each lookup.
 */
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    // First get the customer
    const customer = await req.db
      .collection("customers")
      .findOne({ customerId: id });

    if (!customer) {
      return res.status(404).json({ error: `Customer ${id} not found` });
    }

    // Then get their orders (COLLSCAN – no index on customerId)
    const orders = await req.db
      .collection("orders")
      .find({ customerId: id })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .toArray();

    res.json({ customer, orderCount: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
