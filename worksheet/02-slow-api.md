# Lab 02 – Slow API Investigation

## Objective

Identify why certain POS API endpoints are slow by using MCP tools to run
`explain()` plans, then create indexes to fix the performance problems.

---

## Background

The POS API (`http://localhost:4000`) has several endpoints that are
intentionally missing indexes. In this lab you will:

1. Observe the slow behavior
2. Use MCP to explain the query plan
3. Create the right indexes
4. Verify the improvement

---

## Exercise 1 – Observe the slow query

Run this in your terminal and note the response time:

```bash
time curl -s "http://localhost:4000/api/orders?storeId=S0001&from=2025-01-01&to=2025-06-30" | head -c 200
```

> This should take noticeably longer than expected for returning just 50
> documents – because it's doing a full collection scan on 50,000 orders.

---

## Exercise 2 – Explain the query plan

**Prompt:**

```
Run an explain on the orders collection for this query:
find orders where storeId = "S0001" and createdAt is between
2025-01-01 and 2025-06-30, sorted by createdAt descending.
Tell me if it's using an index or doing a collection scan.
```

**Expected MCP tool:** `explain` with method `find`

**What to look for in the response:**
- `stage: "COLLSCAN"` – confirms no index is being used
- `totalDocsExamined: 50000` – scanning every document
- `nReturned` – only a small fraction actually match

---

## Exercise 3 – Get index suggestions

**Prompt:**

```
Based on the explain plan, what index should I create on the orders
collection to optimize queries that filter by storeId and createdAt range?
```

**Expected response:** The LLM should suggest a compound index:

```
{ storeId: 1, createdAt: -1 }
```

---

## Exercise 4 – Create the index

**Prompt:**

```
Create a compound index on the orders collection with
storeId ascending and createdAt descending.
```

**Expected MCP tool:** `createIndex` on `orders`

**Expected result:** Index created successfully.

---

## Exercise 5 – Verify the improvement

**Prompt:**

```
Run the explain again on the same query:
find orders where storeId = "S0001" and createdAt is between
2025-01-01 and 2025-06-30, sorted by createdAt descending.
Compare the results with before.
```

**What to look for:**
- `stage: "IXSCAN"` – now using the index
- `totalDocsExamined` should be close to `nReturned`
- Much faster execution

Now re-run the API call and compare response times:

```bash
time curl -s "http://localhost:4000/api/orders?storeId=S0001&from=2025-01-01&to=2025-06-30" | head -c 200
```

---

## Exercise 6 – Fix the customer history endpoint

**Prompt:**

```
The endpoint GET /api/customers/C0042/history is slow.
It queries the orders collection by customerId.
Can you explain the query plan and suggest an index?
```

After the LLM suggests `{ customerId: 1, createdAt: -1 }`:

```
Create that index on the orders collection.
```

**Verify:**

```bash
time curl -s "http://localhost:4000/api/customers/C0042/history"
```

---

## Bonus: List all indexes

**Prompt:**

```
Show me all indexes on the orders collection now.
```

**Expected MCP tool:** `collectionIndexes`

You should see:
1. `_id_` (default)
2. `storeId_1_createdAt_-1`
3. `customerId_1_createdAt_-1`

---

## Checkpoint

- [ ] Observed slow response from the orders endpoint
- [ ] Explain plan shows `COLLSCAN` with 50,000 docs examined
- [ ] Created compound index `{storeId: 1, createdAt: -1}`
- [ ] Explain plan now shows `IXSCAN` with minimal docs examined
- [ ] Created index for `{customerId: 1, createdAt: -1}`
- [ ] Verified faster response times for both endpoints

---

**Next:** [Lab 03 – Aggregation Pipelines →](03-aggregation.md)
