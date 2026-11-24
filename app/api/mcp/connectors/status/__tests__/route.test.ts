import { describe, expect, it } from 'vitest'

import { GET } from '../route'

describe('GET /api/mcp/connectors/status', () => {
  it('returns a JSON list of connector statuses', async () => {
    const res = await GET()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)

    const ids = data.map((item: any) => item.id)
    expect(ids).toContain('crunchbase')
    expect(ids).toContain('knowledge')
    expect(ids).toContain('tavily')
  })
})
