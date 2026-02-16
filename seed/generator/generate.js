#!/usr/bin/env node
/**
 * POS Seed Data Generator
 *
 * Generates realistic retail point-of-sale data for the MongoDB MCP Workshop.
 * Outputs JSON files into ../imports/ ready for mongoimport.
 *
 * Intentional quirks (for workshop labs):
 *   - ~5% of orders use "total_amount" instead of "total"  (schema drift)
 *   - ~3% of orders are missing "customerId"                (schema drift)
 */

const { faker } = require("@faker-js/faker");
const fs = require("fs");
const path = require("path");

faker.seed(42); // reproducible across runs

const IMPORTS_DIR = path.join(__dirname, "..", "imports");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const round2 = (n) => Math.round(n * 100) / 100;
const padId = (prefix, n, width = 4) =>
  `${prefix}${String(n).padStart(width, "0")}`;

function writeJsonLines(filename, docs) {
  const filePath = path.join(IMPORTS_DIR, filename);
  const lines = docs.map((d) => JSON.stringify(d));
  fs.writeFileSync(filePath, lines.join("\n") + "\n");
  console.log(`  -> ${filename}  (${docs.length} docs)`);
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------
const REGIONS = ["Northeast", "Southeast", "Midwest", "West", "Southwest"];

function generateStores(count = 5) {
  const stores = [];
  for (let i = 1; i <= count; i++) {
    stores.push({
      storeId: padId("S", i),
      name: `${faker.location.city()} Store`,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      region: REGIONS[i - 1],
      manager: faker.person.fullName(),
      phone: faker.phone.number(),
      openDate: faker.date
        .past({ years: 5, refDate: "2024-01-01" })
        .toISOString(),
    });
  }
  return stores;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
const CATEGORIES = {
  Beverages: [
    "Coffee",
    "Tea",
    "Soda",
    "Juice",
    "Water",
    "Energy Drink",
    "Smoothie",
  ],
  Snacks: [
    "Chips",
    "Cookies",
    "Crackers",
    "Nuts",
    "Granola Bar",
    "Popcorn",
    "Candy",
  ],
  Fresh: [
    "Sandwich",
    "Salad",
    "Fruit Cup",
    "Yogurt",
    "Wrap",
    "Sushi Pack",
    "Soup",
  ],
  Household: [
    "Paper Towels",
    "Batteries",
    "Light Bulb",
    "Trash Bags",
    "Tape",
    "Soap",
    "Sponge",
  ],
  Electronics: [
    "USB Cable",
    "Earbuds",
    "Phone Case",
    "Screen Protector",
    "Charger",
    "Power Bank",
    "Adapter",
  ],
};

function generateProducts(count = 500) {
  const products = [];
  const categories = Object.keys(CATEGORIES);

  for (let i = 1; i <= count; i++) {
    const category = pick(categories);
    const subcategory = pick(CATEGORIES[category]);
    const cost = round2(faker.number.float({ min: 0.5, max: 30 }));
    const margin = faker.number.float({ min: 1.2, max: 3.0 });

    products.push({
      productId: padId("P", i),
      name: `${faker.commerce.productAdjective()} ${subcategory}`,
      category,
      subcategory,
      sku: faker.string.alphanumeric({ length: 10, casing: "upper" }),
      price: round2(cost * margin),
      cost: cost,
      inventory: faker.number.int({ min: 0, max: 500 }),
      tags: faker.helpers.arrayElements(
        ["organic", "sale", "new", "popular", "limited", "bulk", "seasonal"],
        { min: 0, max: 3 }
      ),
    });
  }
  return products;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
const LOYALTY_TIERS = ["Bronze", "Silver", "Gold", "Platinum"];
const LOYALTY_WEIGHTS = [0.5, 0.3, 0.15, 0.05]; // distribution

function pickWeighted(items, weights) {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

function generateCustomers(count = 2000) {
  const customers = [];
  for (let i = 1; i <= count; i++) {
    customers.push({
      customerId: padId("C", i),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number(),
      loyaltyTier: pickWeighted(LOYALTY_TIERS, LOYALTY_WEIGHTS),
      totalSpend: round2(faker.number.float({ min: 10, max: 15000 })),
      joinDate: faker.date
        .past({ years: 4, refDate: "2025-01-01" })
        .toISOString(),
    });
  }
  return customers;
}

// ---------------------------------------------------------------------------
// Orders  (with intentional schema drift)
// ---------------------------------------------------------------------------
const PAYMENT_METHODS = ["cash", "credit_card", "debit_card", "mobile_pay"];
const ORDER_STATUSES = ["completed", "completed", "completed", "refunded", "voided"];

function generateOrders(count = 50000, stores, products, customers) {
  const orders = [];

  for (let i = 1; i <= count; i++) {
    const store = pick(stores);
    const customer = pick(customers);
    const numItems = faker.number.int({ min: 1, max: 8 });

    const items = [];
    let orderTotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = pick(products);
      const qty = faker.number.int({ min: 1, max: 5 });
      const subtotal = round2(product.price * qty);
      orderTotal += subtotal;

      items.push({
        productId: product.productId,
        name: product.name,
        quantity: qty,
        unitPrice: product.price,
        subtotal,
      });
    }

    orderTotal = round2(orderTotal);

    const order = {
      orderId: padId("ORD", i, 6),
      storeId: store.storeId,
      items,
      paymentMethod: pick(PAYMENT_METHODS),
      status: pick(ORDER_STATUSES),
      createdAt: {
        $date: faker.date
          .between({
            from: "2024-06-01T00:00:00Z",
            to: "2025-12-31T23:59:59Z",
          })
          .toISOString(),
      },
    };

    // --- Schema drift: ~5% use "total_amount" instead of "total" ---
    if (Math.random() < 0.05) {
      order.total_amount = orderTotal;
    } else {
      order.total = orderTotal;
    }

    // --- Schema drift: ~3% missing customerId ---
    if (Math.random() >= 0.03) {
      order.customerId = customer.customerId;
    }

    orders.push(order);
  }

  return orders;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log("Generating POS seed data...\n");

  if (!fs.existsSync(IMPORTS_DIR)) {
    fs.mkdirSync(IMPORTS_DIR, { recursive: true });
  }

  const stores = generateStores(5);
  writeJsonLines("stores.json", stores);

  const products = generateProducts(500);
  writeJsonLines("products.json", products);

  const customers = generateCustomers(2000);
  writeJsonLines("customers.json", customers);

  const orders = generateOrders(50000, stores, products, customers);
  writeJsonLines("orders.json", orders);

  console.log("\nDone! Files written to seed/imports/");
}

main();
