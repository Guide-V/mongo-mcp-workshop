# Lab 01 – Exploring the Orders API

## Objective

Use the MongoDB MCP tools through Open WebUI to explore the POS data model,
understand the schema of each collection, and run basic queries.

---

## Context

Your company runs 5 retail stores. The `pos` database has four collections:

- **stores** – Store locations and metadata
- **products** – Product catalog (500 items)
- **customers** – Customer profiles with loyalty tiers (2,000)
- **orders** – Point-of-sale transactions (50,000)

---

## Exercise 1 – Discover the data model

**Prompt:**

```
Show me all the collections in the "pos" database and how many documents
are in each one.
```

**Expected MCP tools:** `listCollections`, `count` (×4)

**Expected output:** A summary table like:

| Collection | Count |
|------------|-------|
| stores | 5 |
| products | 500 |
| customers | 2,000 |
| orders | 50,000 |

---

## Exercise 2 – Understand the orders schema

**Prompt:**

```
Show me the schema of the orders collection. What fields does each
document have?
```

**Expected MCP tool:** `collectionSchema`

**Expected output:** A breakdown of the order document fields:
`orderId`, `storeId`, `customerId`, `items[]`, `total`, `paymentMethod`,
`status`, `createdAt`.

> **Note:** You may notice some orders have `total_amount` instead of `total`,
> and some are missing `customerId`. We will investigate this in Lab 04.

---

## Exercise 3 – Sample queries

### 3a. Find recent orders for a specific store

**Prompt:**

```
Show me the 5 most recent orders from store S0001.
```

**Expected MCP tool:** `find` on `orders` collection with filter
`{storeId: "S0001"}`, sort `{createdAt: -1}`, limit 5.

### 3b. Count orders by payment method

**Prompt:**

```
How many orders were paid by each payment method?
```

**Expected MCP tool:** `aggregate` with `$group` by `paymentMethod` and `$sum`.

### 3c. Look up a customer's profile

**Prompt:**

```
Find customer C0042 and show me their profile.
```

**Expected MCP tool:** `find` on `customers` with filter `{customerId: "C0042"}`.

---

## Exercise 4 – Explore the POS API

The Node.js POS API is running at `http://localhost:4000`. Try calling it from
your terminal:

```bash
# Recent orders for store S0001
curl "http://localhost:4000/api/orders?storeId=S0001&limit=5"

# Top-selling products
curl "http://localhost:4000/api/products/top-sellers"

# Customer order history
curl "http://localhost:4000/api/customers/C0042/history"
```

> Notice how some of these endpoints feel slow? We will investigate why in
> the next lab.

---

## Checkpoint

- [ ] Listed all collections and their counts
- [ ] Described the orders schema correctly
- [ ] Retrieved recent orders for a store
- [ ] Counted orders by payment method
- [ ] Found a specific customer profile
- [ ] Called the POS API endpoints from the terminal

---

**Next:** [Lab 02 – Slow API Investigation →](02-slow-api.md)
