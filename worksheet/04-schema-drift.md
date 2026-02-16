# Lab 04 – Schema Drift Detection

## Objective

Use MCP tools to discover schema inconsistencies in the orders collection,
quantify their impact, and apply fixes – all through natural language prompts.

---

## Background

In real POS systems, schema drift is common:

- Legacy app versions write fields with different names
- Upstream bugs omit required fields
- Data migrations leave partial updates

The seed data intentionally includes two kinds of drift:

1. **~5% of orders** have `total_amount` instead of `total`
2. **~3% of orders** are missing the `customerId` field entirely

---

## Exercise 1 – Inspect the schema

**Prompt:**

```
Describe the schema of the orders collection. Are all documents
consistent, or are there variations in field names?
```

**Expected MCP tool:** `collectionSchema`

**What to look for:** The schema report should show both `total` and
`total_amount` as fields, with different frequencies. It should also show
`customerId` as not present in 100% of documents.

---

## Exercise 2 – Quantify the drift

### 2a. Count the total_amount variant

**Prompt:**

```
How many orders have a field called "total_amount" instead of "total"?
And how many have "total"?
```

**Expected MCP tool:** `count` (×2)

**Expected results:**
- `total_amount` exists: ~2,500 orders (5% of 50,000)
- `total` exists: ~47,500 orders

### 2b. Count missing customerId

**Prompt:**

```
How many orders are missing the customerId field?
```

**Expected MCP tool:** `count` with filter `{ customerId: { $exists: false } }`

**Expected result:** ~1,500 orders (3% of 50,000)

---

## Exercise 3 – Examine affected documents

**Prompt:**

```
Show me 3 example orders that have "total_amount" instead of "total".
```

**Expected MCP tool:** `find` with filter `{ total_amount: { $exists: true } }`,
limit 3

**Follow-up prompt:**

```
Show me 3 orders that are missing customerId.
```

---

## Exercise 4 – Plan the fix

**Prompt:**

```
I want to fix the schema drift in the orders collection:
1. Rename "total_amount" to "total" for all affected orders
2. For orders missing customerId, set it to "UNKNOWN"

What MongoDB update operations would accomplish this?
Don't execute yet – just show me the commands.
```

**Expected response:** The LLM should propose two `updateMany` operations:

```javascript
// Fix 1: Rename total_amount → total
db.orders.updateMany(
  { total_amount: { $exists: true } },
  { $rename: { "total_amount": "total" } }
)

// Fix 2: Set missing customerId
db.orders.updateMany(
  { customerId: { $exists: false } },
  { $set: { customerId: "UNKNOWN" } }
)
```

---

## Exercise 5 – Execute the fix

**Prompt:**

```
Go ahead and execute both fixes on the orders collection.
```

**Expected MCP tool:** `updateMany` (×2)

**Expected results:**
- Fix 1: ~2,500 documents modified
- Fix 2: ~1,500 documents modified

---

## Exercise 6 – Verify the fix

**Prompt:**

```
Verify the fix:
1. Are there any orders still using total_amount?
2. Are there any orders still missing customerId?
3. Show me the updated schema of the orders collection.
```

**Expected results:**
- `total_amount` count: 0
- Missing `customerId` count: 0
- Schema now shows consistent fields

---

## Discussion

- How would you prevent schema drift in production?
  - Schema validation rules (`$jsonSchema`)
  - Application-level validation
  - CI/CD checks before deployment
- What monitoring would alert you to drift early?
  - Periodic schema sampling
  - Alerting on unexpected field names

---

## Checkpoint

- [ ] Identified both types of schema drift via `collectionSchema`
- [ ] Counted ~2,500 orders with `total_amount`
- [ ] Counted ~1,500 orders missing `customerId`
- [ ] Examined example affected documents
- [ ] Executed `updateMany` to rename and backfill
- [ ] Verified zero remaining drift

---

**Next:** [Lab 05 – Scale & Design Patterns →](05-scale-design.md)
