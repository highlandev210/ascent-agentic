# Design: Threads per space

Date: 2026-11-24
Status: Proposed (short design — small change)

## Intent / why

Today the sidebar History ("threads") lists every chat for the user,
regardless of which space is active. The user works in separate spaces
(e.g. an "Anthropic funding" space vs. others) and wants each space to
have its own threads, so switching spaces shows only that space's
conversations. This is the first step toward the larger Insights feature
(captured Q&A per space); per-space threads is the foundation that sits
under it.

## Goals

- The History list shows only the threads belonging to the **active
  space**.
- Searching history (title, content, reasoning) is scoped to the active
  space too.
- Switching spaces refilters the list immediately, with no page reload.
- No schema change and no data migration.

## Non-goals

- No combined "All threads" / space-less view. Threads are **strictly
  per-space** (confirmed with the user).
- No change to how chats are created or assigned to a space (that already
  works — see Constraints).
- Insights (the capture/collect feature) is a separate, later piece.

## Anti-goals (would make this a failure even if it "works")

- Fetching all of a user's chats to the client and hiding most of them
  (breaks the existing pagination and leaks other spaces' titles to the
  client).
- Any approach where a newly created chat does not immediately appear
  under the space it was started in.

## Constraints / what already exists

- Every chat already stores `spaceId` (`lib/db/schema.ts:93`), null =
  the Default space.
- The active space is already known server-side: switching writes the
  `spaceColor` cookie (`components/spaces/spaces-provider.tsx:331`,
  `SPACE_COLOR_COOKIE = 'spaceColor'` in
  `components/spaces/space-colors.ts`), and the server already reads it
  in `app/layout.tsx:113`.
- New chats already inherit the active space via `resolveChatSpace`
  (`lib/streaming/helpers/resolve-chat-space.ts`), so per-space threads
  will pick up new chats automatically.
- `DEFAULT_SPACE_COLOR = 'black'` and a null `spaceId` both mean "Default
  space."

## Approaches considered

1. **Server-side filter by the active space (chosen).** Resolve the
   active space server-side (from the `spaceColor` cookie, the same
   source `app/layout.tsx` already uses) to a `spaceId` (or null for
   Default), and add that filter to the list and search queries. The
   client passes the active color as an explicit query param so it
   refetches on switch and the param acts as a cache key; the server
   falls back to the cookie for the first render.
2. **Client-side filtering.** Fetch all chats, filter in the browser.
   Rejected: breaks pagination and sends other spaces' data to the
   client (anti-goal).
3. **Separate per-space threads table.** Rejected: duplicates `chats`
   for no benefit; `spaceId` already models membership.

## The how (decided)

Behavioral decisions (1–3 are the model's calls, confirmed by the user;
4 was the user's):

1. **Default space = chats with `spaceId IS NULL`.** All existing/
   ungrouped history lives under Default; each color-space shows only its
   own chats.
2. **Search is scoped to the active space** (title, content, reasoning).
3. **Switching spaces refilters immediately** via a client refetch keyed
   to the active space — no page reload.
4. **Strictly per-space**, no combined "All" view.

Resolution rule for the active space → filter:
- Read the `spaceColor` cookie (or the explicit request param).
- If it is missing or `DEFAULT_SPACE_COLOR` → filter `spaceId IS NULL`.
- Otherwise look up the user's space of that color; filter
  `spaceId = <that space's id>`. If no such space row exists yet, the
  filter matches nothing (empty list), which is correct.

Touch points (exact files/lines to be finalized in the plan):
- `lib/db/actions.ts`: add a `spaceId` filter to `getChatsPage`,
  `searchChatTitles`, `searchChatContent`, `searchChatReasoning`
  (null → `isNull(chats.spaceId)`, else `eq(chats.spaceId, id)`).
- `lib/actions/chat.ts`: `getChatsPage` wrapper resolves the active
  space and passes the filter.
- A small server helper to resolve active color → `spaceId` for the
  current user (reads the cookie / request param).
- `app/api/chats/route.ts` and `app/api/search/route.ts`: thread the
  active space through.
- `components/sidebar/chat-history-client.tsx` and
  `components/sidebar/chat-history-search.tsx`: include the active space
  (from `useSpaces()`) in the fetch and in the refetch dependencies, so
  switching refilters.

## Left to the builder

- Exact signatures for the filter param and the resolve-active-space
  helper.
- Whether the API reads the cookie or takes the color as a query param
  (default: explicit param, cookie fallback for first server render).
- Test coverage: list/search filtering by space (including Default =
  null), and switch-refetch behavior in the history client. Follow the
  existing `__tests__` patterns in `lib/db`, `lib/actions`, and
  `components/sidebar`.
