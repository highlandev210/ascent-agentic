import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteKnowledgeToken,
  getKnowledgeToken,
  isKnowledgeConfigured,
  saveKnowledgeToken
} from '../knowledge'

describe('lib/mcp/knowledge token management', () => {
  let tempDir: string
  let tempTokenFile: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-test-'))
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

  it('returns null when no token file and no env var exist', () => {
    expect(getKnowledgeToken()).toBeNull()
    expect(isKnowledgeConfigured()).toBe(false)
  })

  it('returns token from KNOWLEDGE_MCP_TOKEN env var if no file', () => {
    vi.stubEnv('KNOWLEDGE_MCP_TOKEN', 'env-token-abc')
    expect(getKnowledgeToken()).toBe('env-token-abc')
    expect(isKnowledgeConfigured()).toBe(true)
  })

  it('prefers saved token file over KNOWLEDGE_MCP_TOKEN env var', () => {
    vi.stubEnv('KNOWLEDGE_MCP_TOKEN', 'env-token-abc')
    fs.writeFileSync(tempTokenFile, 'file-token-xyz', 'utf-8')
    expect(getKnowledgeToken()).toBe('file-token-xyz')
    expect(isKnowledgeConfigured()).toBe(true)
  })

  it('saves token to file and reads it back', () => {
    saveKnowledgeToken('new-saved-token')
    expect(fs.readFileSync(tempTokenFile, 'utf-8')).toBe('new-saved-token')
    expect(getKnowledgeToken()).toBe('new-saved-token')
    expect(isKnowledgeConfigured()).toBe(true)
  })

  it('throws if saving empty token', () => {
    expect(() => saveKnowledgeToken('')).toThrow(
      'Knowledge MCP token cannot be empty'
    )
    expect(() => saveKnowledgeToken('   ')).toThrow(
      'Knowledge MCP token cannot be empty'
    )
  })

  it('deletes token file and falls back to env if set', () => {
    vi.stubEnv('KNOWLEDGE_MCP_TOKEN', 'fallback-env-token')
    saveKnowledgeToken('file-token')
    expect(getKnowledgeToken()).toBe('file-token')

    deleteKnowledgeToken()
    expect(fs.existsSync(tempTokenFile)).toBe(false)
    expect(getKnowledgeToken()).toBe('fallback-env-token')
  })
})
