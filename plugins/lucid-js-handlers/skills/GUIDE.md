# Guide for Humans and Agents: Creating Lucid Agents

This guide explains the end-to-end flow for creating Lucid agents using JavaScript handlers.

## What You Get

A **working agent hosted on the Lucid platform** - no self-hosting, no deploy step. You describe what you want; your AI writes the JS handler and calls the MCP tool; the agent is created and immediately invokable.

## Flow

### 1. Set Up Your Preferred AI

Use Claude (Claude Code, Claude Desktop, etc.) or Cursor as your coding agent.

### 2. Configure the xgate MCP

Add the xgate MCP server to your AI client's MCP config. You get a **connector URL** (and optionally session token) from xgate.

**How to configure**:

1. Go to xgate (e.g. xgate.run)
2. **Connect your wallet via SIWE** (Sign-In With Ethereum)
3. xgate provisions a **server wallet** for you and exposes MCP tools
   - You don't create or configure that wallet yourself
   - It's created as part of connecting
4. Add the xgate MCP connector URL (and auth if required) to your client's MCP settings
   - See xgate docs for Cursor / Claude configuration

### 3. Install the Skill

Install the **lucid-js-handlers** skill plugin (from skills-market). The skill teaches the agent:
- The JS handler code contract (what to write, scope, return value, default timeout, `allowedHosts`)
- How to use the `create_lucid_agent` MCP tool
- PaymentsConfig requirements for paid agents
- Optional identityConfig (ERC-8004)

### 4. Prompt Your Agent to Make an Agent

In natural language, ask your agent to create an agent. For example:
- "Create a Lucid agent that echoes input"
- "Create an agent that fetches weather by city"
- "Create a paid agent that processes data"

The agent will:
1. Use the **skill** to write the JS handler code (scope, return value, `allowedHosts` if needed)
2. Call the **`create_lucid_agent`** MCP tool with slug, name, description, and entrypoints (including that code)
3. The tool runs in xgate MCP, uses your **server wallet** for setup-payment and payment-as-auth, and calls the Lucid API to create the agent

### 5. Result

You get a **hosted agent** on the Lucid platform:
- Agent `id`
- Agent `slug`
- Invoke URL (e.g., `https://lucid-dev.daydreams.systems/agents/{slug}/invoke/{entrypointKey}`)

No extra deploy or hosting step required.

## Summary

**User** → configures xgate MCP (SIWE → server wallet) → installs lucid-js-handlers skill → prompts agent to create an agent → agent uses skill + `create_lucid_agent` → **working agent on platform**

## Notes

### Lucid API Base URL

The **Lucid API base URL** is hardcoded in the MCP server (defaults to `https://lucid-dev.daydreams.systems/api`). No configuration required; works out of the box. Can be overridden via env `LUCID_API_URL` if needed. The tool always calls that Lucid API instance; the agent never deals with URLs or endpoints.

### Paid Agents

If the agent has paid entrypoints, the **setup fee** is paid from your **server wallet** (USDC). Ensure that wallet has sufficient USDC for the one-time setup fee when creating paid agents.

### Network

All agents created via MCP use **Base network** (base-sepolia testnet). The server wallet is on Base, so all agents use Base network. Entrypoint-level network fields are not accepted.

### Identity Registration

If you include `identityConfig` with `autoRegister: true`, note that auto-registration requires an agent wallet (`walletsConfig.agent`). The MCP tool does not set this, so identity config is stored for later use. You can:
1. Add agent wallet in the dashboard
2. Retry identity registration via the dashboard

## Troubleshooting

### "Insufficient funds"

Your server wallet doesn't have enough USDC. Add USDC to your server wallet and try again.

### "Agent slug already exists"

The slug you're trying to use is already taken. Try a different slug.

### "Lucid API is currently unavailable"

The Lucid API is down or unreachable. Try again later.

### "Invalid JavaScript code"

The JS handler code has syntax errors. Check your code and fix any errors.

### "Validation failed"

The input doesn't match the expected schema. Check the error details and fix the validation issues.
