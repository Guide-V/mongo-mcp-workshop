# Lab 05 – Scale & Design Patterns

## Objective

Use MCP-assisted exploration to discuss and prototype scaling strategies for
the POS system: shard key selection, archival patterns, and time-series
optimizations.

---

## Context

Your POS system is growing. You now have:
- 500 stores (up from 5)
- 10 million orders per month
- 3-year retention requirement
- Real-time dashboards need sub-second queries on recent data

---

## Exercise 1 – Analyze current data distribution

**Prompt:**

```
Analyze the distribution of orders across stores. Show order count
per storeId and the date range of orders. This will help us choose
a shard key.
```

**Expected MCP tool:** `aggregate` with `$group` by storeId + `$min`/`$max`
on createdAt.

**Discussion:** Is the data evenly distributed? What would happen if one store
had 10x more orders than others?

---

## Exercise 2 – Evaluate shard key candidates

**Prompt:**

```
I'm considering these shard key options for the orders collection.
For each one, explain the pros and cons:

1. { storeId: 1 }
2. { orderId: "hashed" }
3. { storeId: 1, createdAt: 1 }
4. { createdAt: 1 }
```

**Expected response:** A comparison covering:
- **Write distribution** – will inserts spread evenly?
- **Query isolation** – can common queries target a single shard?
- **Monotonic key risk** – will a time-based key create hotspots?
- **Cardinality** – enough unique values?

**Best choice for this workload:** `{ storeId: 1, createdAt: 1 }` because:
- Queries almost always filter by storeId (query isolation)
- createdAt adds cardinality and supports range queries
- Writes distribute across store chunks

---

## Exercise 3 – TTL indexes for archival

**Prompt:**

```
We want to automatically delete orders older than 3 years.
How would I set up a TTL index on the orders collection?
Show me the index definition but don't create it yet.
```

**Expected response:**

```javascript
db.orders.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 94608000 }  // 3 years in seconds
)
```

**Discussion points:**
- TTL runs once per minute – is that acceptable for your use case?
- What about archiving to cold storage before deletion?
- Does TTL work with sharded collections? (Yes, but only on the shard key prefix.)

---

## Exercise 4 – Time-series collection pattern

**Prompt:**

```
If we were starting fresh, could we use MongoDB's time-series
collection feature for orders? What would the collection definition
look like, and what are the trade-offs compared to a regular collection?
```

**Expected response:** A discussion covering:

```javascript
db.createCollection("orders_ts", {
  timeseries: {
    timeField: "createdAt",
    metaField: "storeId",
    granularity: "minutes"
  }
})
```

**Trade-offs:**
- Excellent for time-range queries and compression
- Limited update capabilities (no `$set` on non-meta fields)
- Great for analytics, less flexible for transactional POS use

---

## Exercise 5 – Bucket pattern for analytics

**Prompt:**

```
Design a bucket pattern for storing hourly sales summaries per store.
Show me the document structure and the aggregation pipeline that would
populate it from the orders collection.
```

**Expected document structure:**

```json
{
  "storeId": "S0001",
  "date": "2025-06-15",
  "hour": 14,
  "orderCount": 47,
  "totalRevenue": 2834.50,
  "paymentBreakdown": {
    "cash": 12,
    "credit_card": 20,
    "debit_card": 10,
    "mobile_pay": 5
  },
  "topProducts": [
    { "productId": "P0042", "name": "Premium Coffee", "qty": 89 }
  ]
}
```

**Expected aggregation:** `$match` → `$group` by storeId + day + hour →
`$project` to reshape.

---

## Exercise 6 – Index cleanup

**Prompt:**

```
List all indexes on the orders collection. Are there any redundant
or unused indexes we should consider dropping?
```

**Expected MCP tool:** `collectionIndexes`

**Discussion:** Now that we have a compound `{storeId: 1, createdAt: -1}`,
do we still need a single-field `{storeId: 1}` index? (The compound index
covers queries on storeId alone.)

---

## Summary

| Pattern | Best for | Watch out for |
|---------|----------|---------------|
| Compound shard key | Multi-tenant + time queries | Jumbo chunks if cardinality is low |
| TTL index | Auto-expiry | Runs on a background thread, ~60s cycle |
| Time-series collection | Analytics, IoT-like workloads | Limited update support |
| Bucket pattern | Pre-aggregated dashboards | Write complexity, staleness |

---

## Checkpoint

- [ ] Analyzed order distribution across stores
- [ ] Evaluated 4 shard key candidates with trade-offs
- [ ] Designed a TTL index for 3-year retention
- [ ] Explored time-series collection option
- [ ] Designed a bucket pattern for hourly summaries
- [ ] Reviewed indexes for redundancy

---

**Congratulations!** You have completed all five labs of the MongoDB MCP Workshop.
