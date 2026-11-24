# Threads per space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope the sidebar History list and its search to the user's currently-active space, so each space shows only its own threads.

**Architecture:** Every chat already stores `spaceId` (null = Default). The active space is already known server-side via the `spaceColor` cookie. We resolve the active color to a space filter, apply it to the list and search queries, and make the sidebar refetch when the user switches spaces. One structural change: `SpacesProvider` currently wraps only the main chat area, so it must be hoisted to also wrap `AppSidebar`, letting the history list read the active space.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM (Postgres), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-24-threads-per-space-design.md`

## Global Constraints

- No schema change and no data migration (spec: Goals).
- Strictly per-space: no combined "All threads" view (spec: Non-goals).
- Default space = chats with `spaceId IS NULL` (spec: The how, decision 1).
- `DEFAULT_SPACE_COLOR = 'black'`; a null `spaceId` and the Default color both mean "Default space."
- Run tests with `bun run test` (NOT `bun test`). Pre-PR: `bun lint`, `bun typecheck`, `bun format:check`, `bun run build`, `bun run test` must pass.
- Import sorting is enforced by ESLint (`eslint-plugin-simple-import-sort`); run `bun lint --fix`.

## Review Focus

- Active space is a non-default color whose space row does not exist yet (user switched but has not started a chat) → threads list must be **empty**, never Default's threads. → Task 1 (`{ empty: true }`) + Task 2 (wrapper short-circuit).
- Tampered/unknown `spaceColor` cookie value (not a valid `SpaceColor`) → treated as Default, no error. → Task 1 test.
- Chats created before spaces existed (`spaceId IS NULL`) → appear under Default. → Task 2 null-filter test.
- Searching inside a non-default space must not surface other spaces' matches, including Default. → Task 3 SQL tests.
- "Load more" pagination must stay within the active space. → Task 2 (filter applies to the paged query) + Task 4 (load-more URL carries `space`).

---

### Task 1: Active-space thread filter resolver

**Files:**
- Create: `lib/spaces/active-space-filter.ts`
- Test: `lib/spaces/__tests__/active-space-filter.test.ts`

**Interfaces:**
- Consumes: `getSpacesByColors(userId: string, colors: SpaceColor[]) => Promise<Space[]>` from `@/lib/db/actions`; `DEFAULT_SPACE_COLOR`, `isSpaceColor` from `@/lib/spaces/space`.
- Produces:
  ```ts
  export type SpaceThreadFilter = { spaceId: string | null } | { empty: true }
  export async function resolveSpaceThreadFilter(
    userId: string,
    color: string | null | undefined
  ): Promise<SpaceThreadFilter>
  ```
  Rule: missing color, non-`SpaceColor`, or `DEFAULT_SPACE_COLOR` → `{ spaceId: null }`. Otherwise look up the user's space of that color → `{ spaceId: space.id }` if it exists, else `{ empty: true }`.

- [ ] **Step 1: Write the failing test**

```ts
// mock '@/lib/db/actions' so getSpacesByColors is a vi.fn()
describe('resolveSpaceThreadFilter', () => {
  it('returns default (null) for undefined color', async () =>
    expect(await resolveSpaceThreadFilter('u', undefined)).toEqual({ spaceId: null }))
  it('returns default (null) for the Default color', async () =>
    expect(await resolveSpaceThreadFilter('u', 'black')).toEqual({ spaceId: null }))
  it('returns default (null) for an unknown/tampered color', async () =>
    expect(await resolveSpaceThreadFilter('u', 'not-a-color')).toEqual({ spaceId: null }))
  it('returns the space id when the color has a saved space', async () => {
    vi.mocked(getSpacesByColors).mockResolvedValue([{ id: 's1', color: 'blue' } as Space])
    expect(await resolveSpaceThreadFilter('u', 'blue')).toEqual({ spaceId: 's1' })
  })
  it('returns { empty: true } for a non-default color with no saved space', async () => {
    vi.mocked(getSpacesByColors).mockResolvedValue([])
    expect(await resolveSpaceThreadFilter('u', 'blue')).toEqual({ empty: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/spaces/__tests__/active-space-filter.test.ts`
Expected: FAIL (module/function not found).

- [ ] **Step 3: Implement `resolveSpaceThreadFilter` in `lib/spaces/active-space-filter.ts`**

Follow the rule in Interfaces. For the default/unknown branch, guard with `!color || !isSpaceColor(color) || color === DEFAULT_SPACE_COLOR`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/spaces/__tests__/active-space-filter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/spaces/active-space-filter.ts lib/spaces/__tests__/active-space-filter.test.ts
git commit -m "feat(spaces): resolve active-space thread filter"
```

---

### Task 2: Space-scope the chat list query

**Files:**
- Modify: `lib/db/actions.ts` (`getChatsPage`, around line 366)
- Modify: `lib/actions/chat.ts` (`getChatsPage` wrapper, around line 46)
- Modify: `app/api/chats/route.ts`
- Test: `lib/db/__tests__/chat-list.test.ts` (new; mirror the mock style in `lib/db/__tests__/chat-search.test.ts`)

**Interfaces:**
- Consumes: `resolveSpaceThreadFilter`, `SpaceThreadFilter` from Task 1; `SPACE_COLOR_COOKIE` from `@/components/spaces/space-colors`.
- Produces:
  ```ts
  // lib/db/actions.ts — add 4th param; undefined = unfiltered (back-compat)
  export async function getChatsPage(
    userId: string, limit?: number, offset?: number,
    spaceId?: string | null
  ): Promise<{ chats: Chat[]; nextOffset: number | null }>

  // lib/actions/chat.ts — add color arg
  export async function getChatsPage(
    limit?: number, offset?: number, color?: string | null
  ): Promise<{ chats: Chat[]; nextOffset: number | null }>
  ```
  Where-clause: `spaceId === undefined` → user-only; `spaceId === null` → `and(eq(chats.userId,…), isNull(chats.spaceId))`; string → `and(eq(chats.userId,…), eq(chats.spaceId, spaceId))`. Import `isNull` from `drizzle-orm`.

- [ ] **Step 1: Write the failing test** (SQL assertion style from `chat-search.test.ts`: mock `withRLS`, capture the `where` arg, render with `new PgDialect()`)

```ts
describe('getChatsPage space filter', () => {
  it('filters spaceId IS NULL when spaceId is null', async () => {
    const { where } = mockListQuery([])
    await getChatsPage('u', 20, 0, null)
    const sql = dialect.sqlToQuery(where.mock.calls[0][0]).sql
    expect(sql).toContain('"space_id" is null')
  })
  it('filters by space id when a string is given', async () => {
    const { where } = mockListQuery([])
    await getChatsPage('u', 20, 0, 's1')
    const sql = dialect.sqlToQuery(where.mock.calls[0][0]).sql
    expect(sql).toContain('"space_id" =')
  })
  it('does not filter by space when spaceId is undefined', async () => {
    const { where } = mockListQuery([])
    await getChatsPage('u', 20, 0)
    const sql = dialect.sqlToQuery(where.mock.calls[0][0]).sql
    expect(sql).not.toContain('space_id')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/db/__tests__/chat-list.test.ts`
Expected: FAIL (param ignored / `space_id` absent).

- [ ] **Step 3: Implement the filter**

- `lib/db/actions.ts`: add the `spaceId` param and the where-clause branch above to `getChatsPage`; import `isNull`.
- `lib/actions/chat.ts`: wrapper resolves the filter — `const filter = await resolveSpaceThreadFilter(userId, color)`; if `'empty' in filter` return `{ chats: [], nextOffset: null }`; else return `dbActions.getChatsPage(userId, limit, offset, filter.spaceId)`.
- `app/api/chats/route.ts`: read the active color from the request and pass it — `const space = searchParams.get('space') ?? request.cookies.get(SPACE_COLOR_COOKIE)?.value ?? null`, then `getChatsPage(limit, offset, space)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/db/__tests__/chat-list.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/db/actions.ts lib/actions/chat.ts app/api/chats/route.ts lib/db/__tests__/chat-list.test.ts
git commit -m "feat(spaces): scope chat list to the active space"
```

---

### Task 3: Space-scope the history search

**Files:**
- Modify: `lib/db/actions.ts` (`searchChatTitles` ~line 397; `searchChatParts` ~line 455; `searchChatContent` ~line 524; `searchChatReasoning` ~line 535)
- Modify: `app/api/search/route.ts`
- Test: `lib/db/__tests__/chat-search.test.ts` (extend existing)

**Interfaces:**
- Consumes: `resolveSpaceThreadFilter` (Task 1); `SPACE_COLOR_COOKIE`.
- Produces: add a trailing `spaceId?: string | null` param (undefined = unfiltered) to `searchChatTitles`, `searchChatContent`, `searchChatReasoning`, and the private `searchChatParts`.
  - Titles: same `isNull`/`eq` branch as Task 2, AND-ed into the existing `where`.
  - Parts (raw SQL): inject into the `ranked` CTE WHERE, after `AND p.${tsvectorCol} @@ fts_query.q`:
    `undefined` → `sql``` (nothing); `null` → `sql` AND c.space_id IS NULL`; string → `sql` AND c.space_id = ${spaceId}``.

- [ ] **Step 1: Write the failing tests** (extend each `describe`)

```ts
it('searchChatTitles scopes to a space id', async () => {
  const { where } = mockTitleQuery([])
  await searchChatTitles('u', 'hello', 20, 's1')
  expect(dialect.sqlToQuery(where.mock.calls[0][0]).sql).toContain('"space_id" =')
})
it('searchChatContent scopes to Default (IS NULL)', async () => {
  const execute = mockExecute([])
  await searchChatContent('u', 'hello', 20, null)
  expect(execute.mock.calls[0][0].queryChunks.join('')).toContain('space_id')
  // assert the rendered SQL contains "c.space_id is null"
})
```
(Use the existing helpers; for `execute`, assert on the rendered SQL the same way the file's current FTS tests do.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/db/__tests__/chat-search.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the filter**

Add the param and SQL fragments above. `searchChatContent`/`searchChatReasoning` pass `spaceId` straight through to `searchChatParts`. In `app/api/search/route.ts`: resolve `const space = searchParams.get('space') ?? request.cookies.get(SPACE_COLOR_COOKIE)?.value ?? null`; `const filter = await resolveSpaceThreadFilter(userId, space)`; if `'empty' in filter` return `emptyResponse`; else pass `filter.spaceId` as the new last arg to all three search calls.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/db/__tests__/chat-search.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/db/actions.ts app/api/search/route.ts lib/db/__tests__/chat-search.test.ts
git commit -m "feat(spaces): scope history search to the active space"
```

---

### Task 4: Sidebar reads the active space and refetches on switch

**Files:**
- Modify: `app/layout.tsx` (hoist `SpacesProvider` to wrap `AppSidebar` + the main column; ~lines 140–153)
- Modify: `components/sidebar/chat-history-client.tsx`
- Modify: `components/sidebar/chat-history-search.tsx`
- Test: `components/sidebar/__tests__/chat-history-client.test.tsx` (extend)

**Interfaces:**
- Consumes: `useSpaces()` from `@/components/spaces/spaces-provider` — read `active: SpaceColor`; the server endpoints from Tasks 2–3 that accept `?space=<color>`.
- Produces: no new exports; behavioral change — list and search fetches include `&space=${active}` and refetch when `active` changes.

- [ ] **Step 1: Write the failing test**

```ts
// mock useSpaces to return { active }; mock global.fetch.
it('includes the active space in the list fetch', async () => {
  mockActive('blue')
  render(<ChatHistoryClient />)
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('space=blue')))
})
it('refetches when the active space changes', async () => {
  const { rerender } = render(<ChatHistoryClient />) // active 'black'
  mockActive('green'); rerender(<ChatHistoryClient />)
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('space=green')))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test components/sidebar/__tests__/chat-history-client.test.tsx`
Expected: FAIL (no `space=` in URL).

- [ ] **Step 3: Implement**

- `app/layout.tsx`: move `<SpacesProvider key={userId ?? 'guest'} enabled={!!userId} initialColor={initialSpaceColor}>` so it wraps `{userId && <AppSidebar user={user} />}`, `<KeyboardShortcutHandler />`, and the `<div className="flex flex-col flex-1 min-w-0">…</div>`, and remove the inner `SpacesProvider` from inside `<main>`. `SpacesProvider` renders only a context provider (no DOM wrapper), so layout is unchanged.
- `chat-history-client.tsx`: `const { active } = useSpaces()`; append `&space=${active}` to the `fetchInitialChats` and `fetchMoreChats` URLs; add `active` to each `useCallback` dependency list so a switch recreates them and the existing initial-fetch effect reruns (resetting list to offset 0).
- `chat-history-search.tsx`: `const { active } = useSpaces()`; append `&space=${active}` to the `/api/search` URL and add `active` to the search effect's dependencies.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test components/sidebar/__tests__/chat-history-client.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite + lint/types**

Run: `bun run test && bun lint && bun typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx components/sidebar/chat-history-client.tsx components/sidebar/chat-history-search.tsx components/sidebar/__tests__/chat-history-client.test.tsx
git commit -m "feat(spaces): show only the active space's threads in the sidebar"
```

---

## Notes for the implementer

- `request.cookies.get(...)` is used in route handlers (NextRequest) to avoid `next/headers`; the client also sends `?space=` explicitly, and the cookie is the fallback for the first request.
- A non-default color with no saved space row yields `{ empty: true }` → the endpoints return an empty page without querying; do not fall back to Default in that case.
- Verify no other caller of `getChatsPage`/`searchChat*` breaks: the new params are optional and default to unfiltered.
