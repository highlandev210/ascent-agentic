import { NextRequest } from 'next/server'

import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DELETE, POST } from '../route'

describe('/api/mcp/knowledge/token route', () => {
  let tempDir: string
  let tempTokenFile: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kn-token-route-'))
    tempTokenFile = path.join(tempDir, '.knowledge-token.txt')
    vi.stubEnv('KNOWLEDGE_MCP_TOKEN_FILE', tempTokenFile)
    delete process.env.KNOWLEDGE_MCP_TOKEN
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    try {
      if (fs.existsSync(tempTokenFile)) {
        fs.unlinkSync(tempTokenFile)
      }
      fs.rmdirSync(tempDir)
    } catch {}
  })

  it('rejects empty or missing token with 400', async () => {
    const req1 = new NextRequest('http://localhost/api/mcp/knowledge/token', {
      method: 'POST',
      body: JSON.stringify({})
    })
    const res1 = await POST(req1)
    expect(res1.status).toBe(400)

    const req2 = new NextRequest('http://localhost/api/mcp/knowledge/token', {
      method: 'POST',
      body: JSON.stringify({ token: '   ' })
    })
    const res2 = await POST(req2)
    expect(res2.status).toBe(400)
  })

  it('saves token and returns success status', async () => {
    const req = new NextRequest('http://localhost/api/mcp/knowledge/token', {
      method: 'POST',
      body: JSON.stringify({ token: 'test-token-123' })
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toMatchObject({
      success: true,
      configured: true,
      connected: true
    })

    expect(fs.readFileSync(tempTokenFile, 'utf-8')).toBe('test-token-123')
  })

  it('deletes token on DELETE and returns status', async () => {
    fs.writeFileSync(tempTokenFile, 'token-to-remove', 'utf-8')

    const res = await DELETE()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toMatchObject({
      success: true,
      configured: false,
      connected: false
    })

    expect(fs.existsSync(tempTokenFile)).toBe(false)
  })
})
