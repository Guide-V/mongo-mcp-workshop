# Lab 02 – Slow API Investigation

## Objective

Identify why certain POS API endpoints are slow, examine query plans with
`explain()`, then use MCP tools to create indexes and fix the performance
problems.

> **Tools used in this lab:**
> - **Terminal** (`mongosh`) – for running explain plans (reliable)
> - **MCP** (`explain`, `create-index`, `collection-indexes`) – for AI-assisted explain, creating and listing indexes
>
> Each explain exercise has a **terminal** command (guaranteed to work) and
> an optional **MCP prompt** you can try in the chat UI. The MCP `explain`
> tool has a complex schema that some models may format incorrectly — if the
> LLM returns an error, use the terminal command instead.

---

## Background

The POS API (`http://localhost:4000`) has several endpoints that are
intentionally missing indexes. In this lab you will:

1. Observe the slow behavior
2. Explain the query plan (terminal)
3. Ask the LLM for index recommendations (MCP chat)
4. Create indexes via MCP
5. Verify the improvement

---

## Exercise 1 – Observe the slow query

Run this in your terminal and note the response time:

```bash
time curl -s "http://localhost:4000/api/orders?storeId=S0001&from=2026-01-01&to=2026-06-30" | head -c 200
```

> This should take noticeably longer than expected for returning just 50
> documents – because it's doing a full collection scan on 50,000 orders.

---

## Exercise 2 – Explain the query plan

### Option A – Terminal (recommended)

Run the explain directly in `mongosh` via Docker:

```bash
docker exec mcp-mongodb mongosh --quiet pos --eval '
db.orders.explain("executionStats").find({
  storeId: "S0001",
  createdAt: {
    $gte: ISODate("2026-01-01T00:00:00Z"),
    $lte: ISODate("2026-06-30T23:59:59Z")
  }
}).sort({ createdAt: -1 })
'
```

### Option B – MCP chat (optional)

**Prompt:**

```
Use the explain tool on database "pos", collection "orders".
The method name is "find" and the arguments are:
filter: { storeId: "S0001", createdAt: { $gte: ISODate("2026-01-01"), $lte: ISODate("2026-06-30") } }
sort: { createdAt: -1 }
Use executionStats verbosity.
The method array should have an object with a name field set to find and an arguments field with the filter and sort.
Tell me if it's using an index or doing a collection scan.
```

> **If the LLM returns a 422 error**, it likely formatted the `method`
> parameter incorrectly. The explain tool requires
> `[{"name": "find", "arguments": {...}}]` — not `[{"find": {...}}]`.
> You can try rephrasing: *"The method array should have an object with
> a `name` field set to `find` and an `arguments` field with the filter
> and sort."* Otherwise, fall back to Option A.

### What to look for in the output

| Field | Expected value | Meaning |
|---|---|---|
| `winningPlan.stage` | `COLLSCAN` | No index is being used |
| `totalDocsExamined` | ~50,000 | Scanning every document |
| `nReturned` | Small number | Only a fraction match |
| `executionTimeMillis` | High | Slow due to full scan |

> **Tip:** Scroll up to the `winningPlan` section. If you see
> `"stage": "COLLSCAN"`, that confirms the query is scanning every document
> in the collection instead of using an index.

---

## Exercise 3 – Get index suggestions (MCP chat)

**Prompt:**

```
The orders collection in the pos database has no useful indexes.
I need to run queries that filter by storeId and a createdAt date range,
sorted by createdAt descending. What compound index should I create?
```

**Expected response:** The LLM should suggest a compound index:

```
{ storeId: 1, createdAt: -1 }
```

---

## Exercise 4 – Create the index (MCP chat)

**Prompt:**

```
Create a compound index on the orders collection in the pos database
with storeId ascending and createdAt descending.
```

**Expected MCP tool:** `create-index` on `orders`

**Expected result:** Index created successfully.

---

## Exercise 5 – Verify the improvement

### Option A – Terminal

Re-run the same explain from Exercise 2:

```bash
docker exec mcp-mongodb mongosh --quiet pos --eval '
db.orders.explain("executionStats").find({
  storeId: "S0001",
  createdAt: {
    $gte: ISODate("2026-01-01T00:00:00Z"),
    $lte: ISODate("2026-06-30T23:59:59Z")
  }
}).sort({ createdAt: -1 })
'
```

### Option B – MCP chat (optional)

**Prompt:**

```
Run the explain tool again on database "pos", collection "orders".
Method name is "find", arguments:
  filter: { storeId: "S0001", createdAt: { $gte: ISODate("2026-01-01"), $lte: ISODate("2026-06-30") } }
  sort: { createdAt: -1 }
Use executionStats verbosity.
The method array should have an object with a name field set to find and an arguments field with the filter and sort.
Is it using the new index now? Compare with the previous COLLSCAN result.
```

### What to look for now

| Field | Expected value | Meaning |
|---|---|---|
| `winningPlan...stage` | `IXSCAN` | Using the index! |
| `indexName` | `storeId_1_createdAt_-1` | The index you just created |
| `totalDocsExamined` | Close to `nReturned` | Minimal wasted reads |
| `executionTimeMillis` | Low | Much faster |

Now re-run the API call and compare response times:

```bash
time curl -s "http://localhost:4000/api/orders?storeId=S0001&from=2026-01-01&to=2026-06-30" | head -c 200
```

---

## Exercise 6 – Fix the customer history endpoint

First, observe the slow response:

```bash
time curl -s "http://localhost:4000/api/customers/C0042/history"
```

Explain the query:

**Terminal:**

```bash
docker exec mcp-mongodb mongosh --quiet pos --eval '
db.orders.explain("executionStats").find({
  customerId: "C0042"
}).sort({ createdAt: -1 })
'
```

**Or MCP chat (optional):**

```
Run the explain tool on database "pos", collection "orders".
Method name is "find", arguments:
  filter: { customerId: "C0042" }
  sort: { createdAt: -1 }
Use executionStats verbosity.
Is it using an index or doing a collection scan?
```

You should see another `COLLSCAN`. Now ask the LLM to fix it:

**Prompt:**

```
The orders collection in pos needs an index to support
queries that filter by customerId and sort by createdAt descending.
Create that index.
```

**Verify:**

```bash
time curl -s "http://localhost:4000/api/customers/C0042/history"
```

---

## Bonus: List all indexes (MCP chat)

**Prompt:**

```
Show me all indexes on the orders collection in the pos database.
```

**Expected MCP tool:** `collection-indexes`

You should see:
1. `_id_` (default)
2. `storeId_1_createdAt_-1`
3. `customerId_1_createdAt_-1`

---

## Checkpoint

- [ ] Observed slow response from the orders endpoint
- [ ] Explain plan shows `COLLSCAN` with ~50,000 docs examined
- [ ] Created compound index `{storeId: 1, createdAt: -1}` via MCP
- [ ] Explain plan now shows `IXSCAN` with minimal docs examined
- [ ] Created index for `{customerId: 1, createdAt: -1}` via MCP
- [ ] Verified faster response times for both endpoints

---

**Next:** [Lab 03 – Aggregation Pipelines →](03-aggregation.md)
