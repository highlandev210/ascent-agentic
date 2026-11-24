import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getConnectorsStatus } from '../status'

describe('lib/connectors/status', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('includes default connectors: crunchbase, knowledge, tavily', () => {
    const list = getConnectorsStatus()
    const ids = list.map(c => c.id)

    expect(ids).toContain('crunchbase')
    expect(ids).toContain('knowledge')
    expect(ids).toContain('tavily')

    const cb = list.find(c => c.id === 'crunchbase')!
    expect(cb.connectType).toBe('oauth')
    expect(cb.authUrl).toBe('/api/mcp/crunchbase/auth')

    const kn = list.find(c => c.id === 'knowledge')!
    expect(kn.connectType).toBe('token')

    const tv = list.find(c => c.id === 'tavily')!
    expect(tv.connectType).toBe('apiKey')
  })

  it('includes optional search providers only when env vars are present', () => {
    let list = getConnectorsStatus()
    expect(list.find(c => c.id === 'searxng')).toBeUndefined()
    expect(list.find(c => c.id === 'exa')).toBeUndefined()
    expect(list.find(c => c.id === 'brave')).toBeUndefined()

    vi.stubEnv('SEARXNG_API_URL', 'https://searx.example.com')
    vi.stubEnv('EXA_API_KEY', 'exa-test-key')
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'brave-test-key')

    list = getConnectorsStatus()
    expect(list.find(c => c.id === 'searxng')).toMatchObject({
      id: 'searxng',
      connectType: 'none',
      configured: true,
      connected: true
    })
    expect(list.find(c => c.id === 'exa')).toMatchObject({
      id: 'exa',
      connectType: 'none',
      configured: true,
      connected: true
    })
    expect(list.find(c => c.id === 'brave')).toMatchObject({
      id: 'brave',
      connectType: 'none',
      configured: true,
      connected: true
    })
  })
})
