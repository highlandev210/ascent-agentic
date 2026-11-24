import { getSpacesByColors } from '@/lib/db/actions'

import { DEFAULT_SPACE_COLOR, isSpaceColor } from './space'

/**
 * How to scope a user's threads to their active space.
 * - `{ spaceId: null }` — the Default space: chats with no space.
 * - `{ spaceId: <id> }` — the saved space of that color.
 * - `{ empty: true }`  — a non-default color with no saved space yet, so
 *   it has no threads; callers return an empty page without querying.
 */
export type SpaceThreadFilter = { spaceId: string | null } | { empty: true }

/**
 * Resolve the active space color (from the `spaceColor` cookie or a request
 * param) to the filter to apply to that user's threads.
 */
export async function resolveSpaceThreadFilter(
  userId: string,
  color: string | null | undefined
): Promise<SpaceThreadFilter> {
  if (!color || !isSpaceColor(color) || color === DEFAULT_SPACE_COLOR) {
    return { spaceId: null }
  }

  const [space] = await getSpacesByColors(userId, [color])
  return space ? { spaceId: space.id } : { empty: true }
}
