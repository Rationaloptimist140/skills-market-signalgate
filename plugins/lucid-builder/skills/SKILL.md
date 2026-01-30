---
name: lucid-builder
description: |
  Build Lucid Agents with x402 payments. Creates TypeScript code with Hono, 
  proper Zod v4 schemas, and payment-enabled endpoints.
---

# Lucid Builder

Create production-ready Lucid Agents with x402 payment integration.

## Prerequisites

```bash
# Bun runtime
curl -fsSL https://bun.sh/install | bash
```

## Project Structure

```
<agent-name>/
├── src/
│   └── index.ts       # Main agent code
├── package.json       # Dependencies (Zod v4!)
├── Dockerfile         # Railway deployment
├── .gitignore         # node_modules, .env
└── README.md          # Documentation
```

## Step 1: Create package.json

**⚠️ CRITICAL: Use Zod v4, not v3!**

```json
{
  "name": "<agent-name>",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "@lucid-agents/core": "latest",
    "@lucid-agents/http": "latest",
    "@lucid-agents/hono": "latest",
    "@lucid-agents/payments": "latest",
    "hono": "^4.0.0",
    "zod": "^4.0.0"
  }
}
```

## Step 2: Create .gitignore

```
node_modules/
.data/
*.log
.env
```

## Step 3: Create Dockerfile

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 8080
ENV PORT=8080
CMD ["bun", "run", "src/index.ts"]
```

## Step 4: Create src/index.ts

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/hono';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { z } from 'zod';

// Create agent with extensions
const agent = await createAgent({
  name: '<agent-name>',
  version: '1.0.0',
  description: '<description>',
})
  .use(http())
  .use(payments({ config: paymentsFromEnv() }))
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

// === HELPER: Fetch with error handling ===
async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as T;
}

// === FREE ENDPOINT ===
addEntrypoint({
  key: 'overview',
  description: 'Free overview - try before you buy',
  input: z.object({}),
  price: { amount: 0 },
  handler: async () => {
    const data = await fetchJSON('<api_endpoint>');
    return {
      output: {
        summary: data,
        fetchedAt: new Date().toISOString(),
        dataSource: '<source> (live)',
      },
    };
  },
});

// === PAID: Lookup ($0.001) ===
addEntrypoint({
  key: 'lookup',
  description: 'Look up by ID or name',
  input: z.object({ 
    id: z.string().describe('Item ID or name to look up') 
  }),
  price: { amount: 1000 },
  handler: async (ctx) => {
    const data = await fetchJSON(`<api_endpoint>/${ctx.input.id}`);
    return { output: data };
  },
});

// === PAID: Search ($0.002) ===
addEntrypoint({
  key: 'search',
  description: 'Search with filters',
  input: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().optional().default(10).describe('Max results'),
  }),
  price: { amount: 2000 },
  handler: async (ctx) => {
    const data = await fetchJSON(
      `<api_endpoint>/search?q=${encodeURIComponent(ctx.input.query)}&limit=${ctx.input.limit}`
    );
    return { output: data };
  },
});

// === PAID: Top/Rankings ($0.002) ===
addEntrypoint({
  key: 'top',
  description: 'Top items by metric',
  input: z.object({
    metric: z.enum(['popular', 'recent', 'value']).optional().default('popular'),
    limit: z.number().optional().default(10),
  }),
  price: { amount: 2000 },
  handler: async (ctx) => {
    const data = await fetchJSON(`<api_endpoint>/top?by=${ctx.input.metric}&limit=${ctx.input.limit}`);
    return { output: data };
  },
});

// === PAID: Compare ($0.003) ===
addEntrypoint({
  key: 'compare',
  description: 'Compare multiple items',
  input: z.object({
    items: z.array(z.string()).min(2).max(5).describe('Items to compare'),
  }),
  price: { amount: 3000 },
  handler: async (ctx) => {
    const results = await Promise.all(
      ctx.input.items.map((item) => fetchJSON(`<api_endpoint>/${item}`))
    );
    return { output: { comparison: results, count: results.length } };
  },
});

// === PAID: Full Report ($0.005) ===
addEntrypoint({
  key: 'report',
  description: 'Comprehensive analysis report',
  input: z.object({
    subject: z.string().describe('Subject for the report'),
  }),
  price: { amount: 5000 },
  handler: async (ctx) => {
    const [details, stats, related] = await Promise.all([
      fetchJSON(`<api_endpoint>/details/${ctx.input.subject}`),
      fetchJSON(`<api_endpoint>/stats/${ctx.input.subject}`),
      fetchJSON(`<api_endpoint>/related/${ctx.input.subject}`),
    ]);
    return {
      output: { details, stats, related, generatedAt: new Date().toISOString() },
    };
  },
});

// Start server
const port = Number(process.env.PORT ?? 3000);
console.log(`🚀 ${agent.name} running on port ${port}`);

export default { port, fetch: app.fetch };
```

## Step 5: Test Locally

```bash
cd <agent-name>
bun install

# Start with required env vars
PAYMENTS_RECEIVABLE_ADDRESS=<your-wallet> \
FACILITATOR_URL=https://facilitator.daydreams.systems \
NETWORK=base \
bun run src/index.ts &

sleep 3

# Test all endpoints
curl -s http://localhost:3000/health | jq .

curl -s -X POST http://localhost:3000/entrypoints/overview/invoke \
  -H "Content-Type: application/json" -d '{}' | jq .

curl -s -X POST http://localhost:3000/entrypoints/lookup/invoke \
  -H "Content-Type: application/json" -d '{"id":"test"}' | jq .

# ... test all 6 endpoints

pkill -f "bun run src/index"
```

## Validation Checklist

- [ ] All endpoints return `status: "succeeded"`
- [ ] Output contains real data (not empty `{}`)
- [ ] No hardcoded values in responses
- [ ] Timestamps/IDs change between calls

## Common Errors

| Error | Fix |
|-------|-----|
| `z.toJSONSchema is not a function` | Use Zod v4: `bun add zod@4` |
| `PAYMENTS_RECEIVABLE_ADDRESS not set` | Set env var before starting |
| `EADDRINUSE` | Don't call `Bun.serve()` — use `export default` |
| Empty output | Check API endpoint URL |

## Next Step

→ Use **railway-deploy** skill to deploy the agent
