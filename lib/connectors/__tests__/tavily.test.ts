import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteTavilyApiKey,
  getTavilyApiKey,
  isTavilyConfigured,
  saveTavilyApiKey
} from '../tavily'

describe('lib/connectors/tavily', () => {
  let tempDir: string
  let tempKeyFile: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tavily-test-'))
    tempKeyFile = path.join(tempDir, '.tavily-key')
    vi.stubEnv('TAVILY_KEY_FILE', tempKeyFile)
    vi.unstubAllEnvs()
    vi.stubEnv('TAVILY_KEY_FILE', tempKeyFile)
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

  it('returns undefined when neither env nor key file is set', () => {
    expect(getTavilyApiKey()).toBeUndefined()
    expect(isTavilyConfigured()).toBe(false)
  })

  it('returns key from TAVILY_API_KEY env when no file is present', () => {
    vi.stubEnv('TAVILY_API_KEY', 'env-key-123')
    expect(getTavilyApiKey()).toBe('env-key-123')
    expect(isTavilyConfigured()).toBe(true)
  })

  it('prefers saved file key over TAVILY_API_KEY env', () => {
    vi.stubEnv('TAVILY_API_KEY', 'env-key-123')
    fs.writeFileSync(tempKeyFile, 'file-key-456', 'utf-8')

    expect(getTavilyApiKey()).toBe('file-key-456')
    expect(isTavilyConfigured()).toBe(true)
  })

  it('saves key to file and reads it back', () => {
    saveTavilyApiKey('saved-test-key')
    expect(fs.readFileSync(tempKeyFile, 'utf-8')).toBe('saved-test-key')
    expect(getTavilyApiKey()).toBe('saved-test-key')
    expect(isTavilyConfigured()).toBe(true)
  })

  it('throws when saving empty key', () => {
    expect(() => saveTavilyApiKey('')).toThrow('Tavily API key cannot be empty')
    expect(() => saveTavilyApiKey('   ')).toThrow(
      'Tavily API key cannot be empty'
    )
  })

  it('deletes saved key file', () => {
    saveTavilyApiKey('key-to-delete')
    expect(fs.existsSync(tempKeyFile)).toBe(true)

    deleteTavilyApiKey()
    expect(fs.existsSync(tempKeyFile)).toBe(false)
    expect(getTavilyApiKey()).toBeUndefined()
  })
})
