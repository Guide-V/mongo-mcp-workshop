# Lab 00 – Environment Setup

## Objective

Get the full workshop stack running locally and verify that Open WebUI can talk
to the MongoDB MCP Server.

---

## Prerequisites

| Tool | Min version | Check |
|------|-------------|-------|
| Docker Desktop | 4.30+ | `docker --version` |
| Docker Compose | v2 | `docker compose version` |
| Git | any | `git --version` |
| LLM credentials | see below | AWS or Azure keys |

---

## Step 1 – Clone and configure

```bash
git clone <repo-url>
cd mongodb-mcp-workshop
cp .env.example .env
```

Open `.env` in your editor and configure your LLM provider:

### Option A: AWS Bedrock

Uncomment and fill in the Bedrock section:

```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
OPENAI_API_BASE_URLS=http://bedrock-gateway:8866/api/v1
OPENAI_API_KEYS=bedrock
```

### Option B: Azure OpenAI

Uncomment and fill in the Azure section:

```bash
OPENAI_API_BASE_URLS=https://<resource>.openai.azure.com/openai/deployments/<deployment>
OPENAI_API_KEYS=<your-azure-api-key>
```

---

## Step 2 – Start the stack

**AWS Bedrock users:**

```bash
docker compose --profile bedrock up -d
```

**Azure OpenAI users:**

```bash
docker compose up -d
```

Wait for all containers to become healthy (1-2 minutes on first run):

```bash
docker compose ps
```

You should see:

| Container | Status |
|-----------|--------|
| mcp-mongodb | running (healthy) |
| mcp-seed | exited (0) |
| mcp-server | running |
| mcp-webui | running |
| mcp-pos-api | running |
| mcp-bedrock-gw | running *(Bedrock only)* |

> **Tip:** Run `docker compose logs mongo-seed` to confirm seed data loaded
> successfully. You should see "Seed complete!" at the end.

---

## Step 3 – Create your Open WebUI account

1. Open **http://localhost:3000** in your browser.
2. Click **Sign up** and create an admin account (first user is automatically admin).
3. Log in with your new credentials.

---

## Step 4 – Add the MongoDB MCP Tools

The MongoDB MCP Server is exposed to Open WebUI via **mcpo** (an
MCP-to-OpenAPI proxy). This gives Open WebUI access to all 22 MongoDB tools.

1. Click your **profile icon** (bottom-left) → **Admin Panel**.
2. Go to **Settings** → **Connections**.
3. Scroll down to **Tool & Function Servers** section.
4. Click the **+** button to add a new connection.
5. Fill in:
   - **URL**: `http://mcpo:8000`
   - **Type**: **OpenAPI**
   - **Auth**: None
6. Click **Save**.

The server should show a green "connected" indicator with **22 tools**
available (aggregate, find, count, createIndex, etc.).

> **Tip:** You can browse the interactive API docs at
> http://localhost:8001/docs to see all available MongoDB tools.

---

## Step 5 – Verify the connection

Open a new chat and type:

```
List all databases on the connected MongoDB server.
```

**Expected MCP tool call:** `listDatabases`

**Expected response:** The LLM should return a list that includes the `pos`
database with collections like `stores`, `products`, `customers`, and `orders`.

---

## Step 6 – Verify the POS API

In a separate browser tab or terminal:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{"status":"ok","db":"connected"}
```

---

## Checkpoint

- [ ] All containers running (`docker compose ps`)
- [ ] Open WebUI accessible at http://localhost:3000
- [ ] MCP server connected (green indicator, 22 tools)
- [ ] Chat returns database list including `pos`
- [ ] POS API health check returns `ok`

---

**Next:** [Lab 01 – Exploring the Orders API →](01-orders-api.md)
