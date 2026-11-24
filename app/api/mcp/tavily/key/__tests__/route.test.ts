import { NextRequest } from 'next/server'

import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DELETE, POST } from '../route'

describe('/api/mcp/tavily/key route', () => {
  let tempDir: string
  let tempKeyFile: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tv-key-route-'))
    tempKeyFile = path.join(tempDir, '.tavily-key')
    vi.stubEnv('TAVILY_KEY_FILE', tempKeyFile)
    delete process.env.TAVILY_API_KEY
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    try {
      if (fs.existsSync(tempKeyFile)) {
        fs.unlinkSync(tempKeyFile)
      }
      fs.rmdirSync(tempDir)
    } catch {}
  })

  it('rejects empty or missing key with 400', async () => {
    const req1 = new NextRequest('http://localhost/api/mcp/tavily/key', {
      method: 'POST',
      body: JSON.stringify({})
    })
    const res1 = await POST(req1)
    expect(res1.status).toBe(400)

    const req2 = new NextRequest('http://localhost/api/mcp/tavily/key', {
      method: 'POST',
      body: JSON.stringify({ key: '   ' })
    })
    const res2 = await POST(req2)
    expect(res2.status).toBe(400)
  })

  it('saves key and returns success status', async () => {
    const req = new NextRequest('http://localhost/api/mcp/tavily/key', {
      method: 'POST',
      body: JSON.stringify({ key: 'tvly-test-key-456' })
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toMatchObject({
      success: true,
      configured: true,
      connected: true
    })

    expect(fs.readFileSync(tempKeyFile, 'utf-8')).toBe('tvly-test-key-456')
  })

  it('deletes key on DELETE and returns status', async () => {
    fs.writeFileSync(tempKeyFile, 'key-to-remove', 'utf-8')

    const res = await DELETE()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toMatchObject({
      success: true,
      configured: false,
      connected: false
    })

    expect(fs.existsSync(tempKeyFile)).toBe(false)
  })
})
