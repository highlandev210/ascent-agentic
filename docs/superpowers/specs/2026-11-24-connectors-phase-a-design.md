# Design: Connectors menu — Phase A (manage built-in connectors)

Date: 2026-11-24
Status: Proposed

## Intent / why

Give the user a **Connectors** panel to see and configure the external
integrations Morphic already ships (Crunchbase, Knowledge Pack MCP,
Tavily) without editing env vars or files by hand. Phase A manages the
built-in connectors; Phase B (separate) adds registering arbitrary MCP
servers from the UI.

## Goals

- A **Connectors** entry in the sidebar (like Library) opening a panel.
- The panel lists each built-in connector with a **status badge**
  (`configured` / `connected`) read from a status endpoint.
- Per-connector action:
  - **Crunchbase** — a **Connect** button that opens the existing OAuth
    flow (`/api/mcp/crunchbase/auth`); shows connected + token expiry.
  - **Knowledge Pack** — a token field + **Save**, persisted to a file.
  - **Tavily** — an API-key field + **Save**, persisted to a file.
- Other env-configured search providers (SearXNG / Exa / Brave) shown
  **status-only** (no secret entry) if present, else omitted.

## Non-goals

- No generic/arbitrary MCP server registration — that is **Phase B**.
- No DB-backed config (chosen: file-based for now; DB is the Phase B /
  multi-user migration path).
- No change to how connectors plug into the agent; only how they are
  configured and surfaced.

## Approaches considered

- **A — File-based config + a Connectors panel mirroring Library
  (CHOSEN).** UI-entered secrets are written to server-side files,
  exactly like Crunchbase (`.crunchbase-tokens.json`) and Knowledge
  (`.knowledge-token.txt`) already do. No migration; consistent with
  existing code; fits the single-user Docker setup.
- **B — DB-backed `connector_settings` table.** Per-user, multi-instance
  safe. Deferred: pairs with Phase B + real auth, and needs a migration
  plus secrets-at-rest handling.

## The how (decided)

### Config helpers (file-based, mirroring the existing pattern)

- **Knowledge:** add `saveKnowledgeToken(token)` writing
  `.knowledge-token.txt` (the read path `getKnowledgeToken()` already
  falls back to that file).
- **Tavily:** add `getTavilyApiKey()` (env `TAVILY_API_KEY` → `.tavily-key`
  file) and `saveTavilyApiKey(key)`; change the two read sites
  (`lib/tools/search/providers/tavily.ts`, `lib/tools/fetch.ts`) to call
  `getTavilyApiKey()` so a saved key overrides/augments the env var.
- **Crunchbase:** already has `saveCrunchbaseTokens` via the OAuth
  callback — no change.
- Add the new secret files to `.gitignore` (`.tavily-key`; Knowledge's is
  already covered).

### Routes

- **Status:** `GET /api/mcp/connectors/status` returning an array of
  `{ id, name, configured, connected, connectType: 'oauth' | 'token' |
'apiKey', authUrl?, expiresAt? }`, composed from the existing Crunchbase
  and Knowledge status logic plus a Tavily entry from `getTavilyApiKey()`.
- **Save:** `POST /api/mcp/knowledge/token` `{ token }` →
  `saveKnowledgeToken`; `POST /api/mcp/tavily/key` `{ key }` →
  `saveTavilyApiKey`. Validate non-empty; return the new status.
- **Disconnect (optional):** `DELETE` on the same routes removes the file.

### UI (mirror the Library panel)

- `components/sidebar/connectors-menu-item.tsx` — sidebar entry
  (plug icon, label "Connectors") toggling the panel.
- `components/connectors/connectors-context.tsx` — open/close + cached
  status, like `library-context`.
- `components/connectors/connectors-panel.tsx` — lists connectors with a
  status badge and the per-connector action (Connect button / token
  field+Save). Mount the provider in `app/layout.tsx` beside the others.

## Security / constraints

- The save routes write secrets to server files and are **unauthenticated**
  in the single-user setup (like the existing Crunchbase auth route). This
  is acceptable for anonymous single-user Docker only. **Phase B / multi-user
  must** move config to per-user DB storage and gate these routes by user.
  Note this in code comments so it is not shipped to a shared deployment
  as-is.
- Secret files stay out of git (`.gitignore`).

## Left to the builder

- Exact status-endpoint shape vs. reusing the per-connector `/status`
  routes (compose vs. fan-out on the client).
- Whether to include SearXNG/Exa/Brave status-only tiles in Phase A or
  defer them with Phase B.
- Icon choices and panel layout details (follow the Library panel).
- Tests: `getTavilyApiKey` precedence (env vs file), `saveKnowledgeToken`
  / `saveTavilyApiKey` file writes, the status endpoint composition, and
  the save routes (success + empty-input rejection). Follow existing
  `lib/mcp` and route `__tests__` patterns.
