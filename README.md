# MongoDB MCP Workshop

A hands-on workshop for learning MongoDB through AI-powered natural language
interactions using the **Model Context Protocol (MCP)**.

Attendees use a web-based chat interface (Open WebUI) to talk to an LLM that
has direct access to MongoDB via the official MongoDB MCP Server -- no IDE or
CLI expertise required.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  docker compose                       │
│                                                       │
│  ┌─────────────┐    MCP (HTTP)    ┌───────────────┐  │
│  │  Open WebUI  │ ──────────────► │  MongoDB MCP   │  │
│  │  :3000       │                 │  Server :8808  │  │
│  └──────┬───────┘                 └───────┬───────┘  │
│         │ OpenAI-compatible               │          │
│         ▼                                 ▼          │
│  ┌──────────────┐                 ┌───────────────┐  │
│  │  Bedrock GW   │                │  MongoDB 8.0   │  │
│  │  :8866        │                │  :27017        │  │
│  │  (optional)   │                └───────┬───────┘  │
│  └──────────────┘                         │          │
│                                   ┌───────┴───────┐  │
│  ┌──────────────┐                 │  POS API       │  │
│  │  Azure OpenAI │◄── (or) ──►   │  :4000         │  │
│  │  (external)   │                └───────────────┘  │
│  └──────────────┘                                    │
└──────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Docker Desktop** 4.30+ with Docker Compose v2
- **LLM credentials** – one of:
  - AWS Bedrock (access key + secret key)
  - Azure OpenAI (endpoint + API key)

### 1. Clone and configure

```bash
git clone <repo-url>
cd mongodb-mcp-workshop
cp .env.example .env
```

Edit `.env` and uncomment/fill in your LLM provider credentials.

### 2. Start the stack

**AWS Bedrock users:**

```bash
docker compose --profile bedrock up -d
```

**Azure OpenAI users:**

```bash
docker compose up -d
```

### 3. Open the UI

Navigate to **http://localhost:3000** and create an admin account
(first user is automatically admin).

### 4. Connect the MCP Server

1. Go to **Settings** → **Admin Settings** → **Tools & Functions**
2. Click **+ Add Connection**
3. Set URL to `http://mcp-server:8808/mcp` and Type to `MCP (Streamable HTTP)`
4. Save

You should see 22 MongoDB tools become available.

### 5. Start chatting

Try: *"List all databases on the connected MongoDB server."*

Then follow the **Workshop Labs** below.

## Workshop Labs

| Lab | Topic | What you'll learn |
|-----|-------|-------------------|
| [00 – Setup](worksheet/00-setup.md) | Environment | Docker, Open WebUI, MCP connection |
| [01 – Orders API](worksheet/01-orders-api.md) | Exploration | Schema discovery, basic queries |
| [02 – Slow API](worksheet/02-slow-api.md) | Performance | Explain plans, index creation |
| [03 – Aggregation](worksheet/03-aggregation.md) | Analytics | Pipelines, $group, $lookup |
| [04 – Schema Drift](worksheet/04-schema-drift.md) | Data quality | Detection, updateMany fixes |
| [05 – Scale Design](worksheet/05-scale-design.md) | Architecture | Shard keys, TTL, time-series |

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Open WebUI | http://localhost:3000 | Chat interface with MCP support |
| MongoDB | localhost:27017 | MongoDB 8.0 replica set |
| MCP Server | http://localhost:8808 | MongoDB MCP Server (HTTP) |
| POS API | http://localhost:4000 | Sample Node.js API (intentionally slow) |
| Bedrock GW | http://localhost:8866 | AWS Bedrock proxy *(Bedrock profile only)* |

## Seed Data

The `pos` database is pre-loaded with realistic retail POS data:

| Collection | Documents | Description |
|------------|-----------|-------------|
| stores | 5 | Store locations and metadata |
| products | 500 | Product catalog across 5 categories |
| customers | 2,000 | Customer profiles with loyalty tiers |
| orders | 50,000 | POS transactions over 18 months |

The orders collection intentionally includes schema drift (~5% with
`total_amount` instead of `total`, ~3% missing `customerId`) for Lab 04.

## Switching to Atlas

To use MongoDB Atlas instead of the local instance:

1. Edit `.env` and set `MONGODB_URI` to your Atlas connection string
2. The MCP server and POS API will connect to Atlas automatically
3. You can skip the `mongodb` and `mongo-seed` containers

## Troubleshooting

**Containers won't start:**
```bash
docker compose logs -f          # check all logs
docker compose logs mongodb     # check MongoDB specifically
```

**MCP server can't connect:**
- Ensure MongoDB is healthy: `docker compose ps`
- Check the MCP server logs: `docker compose logs mcp-server`
- Verify the URL in Open WebUI is exactly `http://mcp-server:8808/mcp`

**Seed data not loaded:**
```bash
docker compose logs mongo-seed  # should end with "Seed complete!"
docker compose run --rm mongo-seed  # re-run seeding manually
```

**LLM not responding:**
- Bedrock: verify your AWS credentials and region in `.env`
- Azure: verify endpoint URL and API key in `.env`
- Check: `docker compose logs bedrock-gateway` (Bedrock) or Open WebUI logs

**Reset everything:**
```bash
docker compose down -v          # stops and removes volumes
docker compose --profile bedrock up -d   # start fresh
```

## License

MIT
