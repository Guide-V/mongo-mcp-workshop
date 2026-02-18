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
For the orders collection in the pos database, I need two updateMany
operations to standardize the schema:

1. Use $rename to change "total_amount" to "total" where total_amount exists.
2. Use $set to add customerId: "UNKNOWN" where customerId does not exist.

Please explain what each operation does and how many documents each would affect.
```

**Expected response:** The LLM should describe two `updateMany` operations:

```javascript
// Standardize field name: total_amount → total
db.orders.updateMany(
  { total_amount: { $exists: true } },
  { $rename: { "total_amount": "total" } }
)

// Backfill missing customerId
db.orders.updateMany(
  { customerId: { $exists: false } },
  { $set: { customerId: "UNKNOWN" } }
)
```

---

## Exercise 5 – Apply the updates

**Prompt:**

```
Run both updateMany operations on the orders collection in the pos database:
1. Rename total_amount to total where total_amount exists.
2. Set customerId to "UNKNOWN" where customerId does not exist.
```
**NOTE: The LLM might have already applied the updatedMany from Exercise 4**
**Expected MCP tool:** `updateMany` (×2)

**Expected results:**
- Update 1: ~2,500 documents modified
- Update 2: ~1,500 documents modified

---

## Exercise 6 – Verify the results

**Prompt:**

```
Check the orders collection in the pos database:
1. Count orders that still have a total_amount field.
2. Count orders where customerId does not exist.
3. Show the current schema of the orders collection.
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
