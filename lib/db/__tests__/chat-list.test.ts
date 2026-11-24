import { PgDialect } from 'drizzle-orm/pg-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { withRLS } from '@/lib/db/with-rls'

import { getChatsPage } from '../actions'

vi.mock('@/lib/db/with-rls', () => ({
  withOptionalRLS: vi.fn(),
  withRLS: vi.fn()
}))

const dialect = new PgDialect()

function mockListQuery(rows: unknown[] = []) {
  const offset = vi.fn().mockResolvedValue(rows)
  const limit = vi.fn().mockReturnValue({ offset })
  const orderBy = vi.fn().mockReturnValue({ limit })
  const where = vi.fn().mockReturnValue({ orderBy })
  const from = vi.fn().mockReturnValue({ where })
  const select = vi.fn().mockReturnValue({ from })

  vi.mocked(withRLS).mockImplementation(async (_userId, callback) =>
    callback({ select } as never)
  )

  return { select, where, orderBy, limit, offset }
}

describe('getChatsPage space filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
