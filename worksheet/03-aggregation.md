# Lab 03 – Aggregation Pipelines

## Objective

Build increasingly complex aggregation pipelines using natural language
prompts, letting the LLM translate your intent into MongoDB aggregation
stages via MCP.

---

## Exercise 1 – Daily revenue by store

**Prompt:**

```
Calculate the total revenue per store per day for the last 30 days.
Sort by date descending, then by revenue descending.
Only include orders with status "completed".
```

**Expected MCP tool:** `aggregate` on `orders`

**Expected pipeline stages:**
1. `$match` – status: "completed", createdAt in last 30 days
2. `$group` – by storeId + date (truncated to day), sum of `total`
3. `$sort` – date desc, revenue desc

**Discussion point:** Does this pipeline use the index we created in Lab 02?
Ask the LLM to explain it if you're unsure.

---

## Exercise 2 – Top 10 products by revenue

**Prompt:**

```
Find the top 10 products by total revenue across all stores.
Show the product name, total quantity sold, and total revenue.
```

**Expected pipeline stages:**
1. `$unwind` – items array
2. `$group` – by productId, sum quantity and subtotal
3. `$sort` – totalRevenue desc
4. `$limit` – 10

**Follow-up prompt:**

```
Now add the product category to each result by looking it up
from the products collection.
```

**Expected:** The LLM adds a `$lookup` stage joining to `products`.

---

## Exercise 3 – Customer spend distribution

**Prompt:**

```
Create a histogram of customer order counts. Group customers into
buckets: 1-5 orders, 6-10 orders, 11-20 orders, 21-50 orders, 50+.
Show how many customers fall into each bucket.
```

**Expected pipeline stages:**
1. `$group` – by customerId, count orders
2. `$bucket` or `$switch` – classify into ranges
3. `$group` – count per bucket

> **Tip:** If the LLM uses `$bucket`, note the boundaries syntax.
> If it uses `$switch` inside `$group`, that works too.

---

## Exercise 4 – Store performance comparison

**Prompt:**

```
Compare all 5 stores on these metrics for the year 2025:
- Total revenue
- Average order value
- Total number of orders
- Number of unique customers

Sort by total revenue descending.
```

**Expected:** A multi-metric aggregation with `$group` using `$sum`, `$avg`,
and `$addToSet` (or `$count` for distinct customers).

---

## Exercise 5 – Payment method trends by month

**Prompt:**

```
Show monthly payment method trends for 2025.
For each month, show the percentage breakdown of cash, credit_card,
debit_card, and mobile_pay.
```

**Expected:** Uses `$group` by month + paymentMethod, then a second
`$group` to calculate percentages, or uses `$facet`.

---

## Bonus – Save a pipeline as a view

**Prompt:**

```
Create a MongoDB view called "store_daily_revenue" based on the
aggregation from Exercise 1.
```

> **Note:** The MCP server may or may not support `createCollection` with a
> view pipeline. If it doesn't, the LLM should explain how to create it
> manually via `mongosh`.

---

## Checkpoint

- [ ] Calculated daily revenue per store
- [ ] Found top 10 products by revenue with category lookup
- [ ] Built a customer order-count histogram
- [ ] Compared all stores on multiple metrics
- [ ] Showed payment method trends by month

---

**Next:** [Lab 04 – Schema Drift Detection →](04-schema-drift.md)
