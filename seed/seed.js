/**
 * POS Seed Data Generator (mongosh script)
 *
 * Generates realistic retail point-of-sale data directly into MongoDB.
 * Runs inside mongosh – no npm or external dependencies needed.
 *
 * Intentional quirks (for workshop labs):
 *   - ~5% of orders use "total_amount" instead of "total"  (schema drift)
 *   - ~3% of orders are missing "customerId"                (schema drift)
 *
 * Usage: mongosh "mongodb://..." seed.js
 */

// ---------------------------------------------------------------------------
// Simple seeded PRNG (Mulberry32) for reproducible output
// ---------------------------------------------------------------------------
let _seed = 42;
function random() {
  _seed |= 0;
  _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick(arr) {
  return arr[Math.floor(random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.round((random() * (max - min) + min) * 100) / 100;
}

function padId(prefix, n, width) {
  width = width || 4;
  return prefix + String(n).padStart(width, "0");
}

function randomDate(start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + random() * (e - s));
}

// ---------------------------------------------------------------------------
// Name generation data (no faker needed)
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda",
  "David","Elizabeth","William","Barbara","Richard","Susan","Joseph","Jessica",
  "Thomas","Sarah","Charles","Karen","Christopher","Lisa","Daniel","Nancy",
  "Matthew","Betty","Anthony","Margaret","Mark","Sandra","Donald","Ashley",
  "Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle",
  "Kenneth","Carol","Kevin","Amanda","Brian","Dorothy","George","Melissa",
];
const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
  "Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson",
  "Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson",
  "White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker",
  "Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill",
];
const CITIES = [
  "New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia",
  "San Antonio","San Diego","Dallas","Austin","Portland","Denver",
  "Memphis","Seattle","Nashville","Atlanta","Miami","Minneapolis",
];
const STATES = [
  "NY","CA","IL","TX","AZ","PA","TX","CA","TX","TX","OR","CO",
  "TN","WA","TN","GA","FL","MN",
];
const STREETS = [
  "Main St","Oak Ave","Maple Dr","Cedar Ln","Pine Rd","Elm St",
  "Washington Blvd","Park Ave","Lake Dr","Hill St","River Rd","Market St",
];
const ADJECTIVES = [
  "Premium","Classic","Organic","Fresh","Artisan","Select","Natural",
  "Golden","Crispy","Smooth","Bold","Deluxe","Pure","Zesty","Savory",
  "Creamy","Crunchy","Sweet","Spicy","Rich","Light","Extra",
];
const REGIONS = ["Northeast","Southeast","Midwest","West","Southwest"];

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------
function generateStores(count) {
  const stores = [];
  for (let i = 1; i <= count; i++) {
    stores.push({
      storeId: padId("S", i),
      name: pick(CITIES) + " Store #" + i,
      address: randInt(100, 9999) + " " + pick(STREETS),
      city: CITIES[i % CITIES.length],
      state: STATES[i % STATES.length],
      region: REGIONS[(i - 1) % REGIONS.length],
      manager: pick(FIRST_NAMES) + " " + pick(LAST_NAMES),
      phone: "(" + randInt(200,999) + ") " + randInt(200,999) + "-" + randInt(1000,9999),
      openDate: randomDate("2019-01-01", "2024-01-01"),
    });
  }
  return stores;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
const CATEGORIES = {
  Beverages: ["Coffee","Tea","Soda","Juice","Water","Energy Drink","Smoothie"],
  Snacks:    ["Chips","Cookies","Crackers","Nuts","Granola Bar","Popcorn","Candy"],
  Fresh:     ["Sandwich","Salad","Fruit Cup","Yogurt","Wrap","Sushi Pack","Soup"],
  Household: ["Paper Towels","Batteries","Light Bulb","Trash Bags","Tape","Soap","Sponge"],
  Electronics: ["USB Cable","Earbuds","Phone Case","Screen Protector","Charger","Power Bank","Adapter"],
};
const CATEGORY_NAMES = Object.keys(CATEGORIES);
const TAGS = ["organic","sale","new","popular","limited","bulk","seasonal"];

function generateProducts(count) {
  const products = [];
  for (let i = 1; i <= count; i++) {
    const category = pick(CATEGORY_NAMES);
    const subcategory = pick(CATEGORIES[category]);
    const cost = randFloat(0.5, 30);
    const margin = randFloat(1.2, 3.0);
    const numTags = randInt(0, 3);
    const tags = [];
    for (let t = 0; t < numTags; t++) tags.push(pick(TAGS));

    products.push({
      productId: padId("P", i),
      name: pick(ADJECTIVES) + " " + subcategory,
      category: category,
      subcategory: subcategory,
      sku: Array.from({length:10}, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[randInt(0,35)]).join(""),
      price: Math.round(cost * margin * 100) / 100,
      cost: cost,
      inventory: randInt(0, 500),
      tags: [...new Set(tags)],
    });
  }
  return products;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
const LOYALTY_TIERS = ["Bronze","Silver","Gold","Platinum"];
const LOYALTY_WEIGHTS = [0.50, 0.80, 0.95, 1.00]; // cumulative

function pickLoyalty() {
  const r = random();
  for (let i = 0; i < LOYALTY_WEIGHTS.length; i++) {
    if (r < LOYALTY_WEIGHTS[i]) return LOYALTY_TIERS[i];
  }
  return LOYALTY_TIERS[LOYALTY_TIERS.length - 1];
}

function generateCustomers(count) {
  const customers = [];
  for (let i = 1; i <= count; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    customers.push({
      customerId: padId("C", i),
      firstName: first,
      lastName: last,
      email: (first + "." + last + randInt(1,999) + "@example.com").toLowerCase(),
      phone: "(" + randInt(200,999) + ") " + randInt(200,999) + "-" + randInt(1000,9999),
      loyaltyTier: pickLoyalty(),
      totalSpend: randFloat(10, 15000),
      joinDate: randomDate("2021-01-01", "2025-01-01"),
    });
  }
  return customers;
}

// ---------------------------------------------------------------------------
// Orders (with intentional schema drift)
// ---------------------------------------------------------------------------
const PAYMENT_METHODS = ["cash","credit_card","debit_card","mobile_pay"];
const ORDER_STATUSES = ["completed","completed","completed","refunded","voided"];

function generateOrders(count, stores, products, customers) {
  const BATCH = 5000;
  let batch = [];

  for (let i = 1; i <= count; i++) {
    const store = pick(stores);
    const customer = pick(customers);
    const numItems = randInt(1, 8);
    const items = [];
    let orderTotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = pick(products);
      const qty = randInt(1, 5);
      const subtotal = Math.round(product.price * qty * 100) / 100;
      orderTotal += subtotal;
      items.push({
        productId: product.productId,
        name: product.name,
        quantity: qty,
        unitPrice: product.price,
        subtotal: subtotal,
      });
    }
    orderTotal = Math.round(orderTotal * 100) / 100;

    const order = {
      orderId: padId("ORD", i, 6),
      storeId: store.storeId,
      items: items,
      paymentMethod: pick(PAYMENT_METHODS),
      status: pick(ORDER_STATUSES),
      createdAt: randomDate(new Date(Date.now() - 30 * 86400000).toISOString(), new Date().toISOString()),
    };

    // Schema drift: ~5% use "total_amount" instead of "total"
    if (random() < 0.05) {
      order.total_amount = orderTotal;
    } else {
      order.total = orderTotal;
    }

    // Schema drift: ~3% missing customerId
    if (random() >= 0.03) {
      order.customerId = customer.customerId;
    }

    batch.push(order);

    if (batch.length >= BATCH) {
      db.orders.insertMany(batch, { ordered: false });
      print("    inserted " + i + " / " + count);
      batch = [];
    }
  }

  if (batch.length > 0) {
    db.orders.insertMany(batch, { ordered: false });
    print("    inserted " + count + " / " + count);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
print("============================================");
print("  MongoDB MCP Workshop – Seed Data");
print("============================================\n");

// Drop existing collections
["stores","products","customers","orders"].forEach(function(c) {
  db.getCollection(c).drop();
});

print("[1/4] Generating stores...");
const stores = generateStores(5);
db.stores.insertMany(stores);
print("  -> " + stores.length + " stores\n");

print("[2/4] Generating products...");
const products = generateProducts(500);
db.products.insertMany(products);
print("  -> " + products.length + " products\n");

print("[3/4] Generating customers...");
const customers = generateCustomers(2000);
db.customers.insertMany(customers);
print("  -> " + customers.length + " customers\n");

print("[4/4] Generating orders (this may take a moment)...");
generateOrders(50000, stores, products, customers);
print("  -> 50000 orders\n");

print("Seed complete!");
print("  Database: " + db.getName());
print("  Collections: stores, products, customers, orders");
