import fs from 'fs'
import path from 'path'

function getKeyFilePath(): string {
  if (process.env.TAVILY_KEY_FILE) {
    return process.env.TAVILY_KEY_FILE
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), '.tavily-key')
}

/**
 * Returns the Tavily API key.
 * Follows precedence: saved file key (.tavily-key) -> TAVILY_API_KEY env var -> undefined.
 */
export function getTavilyApiKey(): string | undefined {
  const keyFilePath = getKeyFilePath()
  try {
    if (fs.existsSync(keyFilePath)) {
      const key = fs.readFileSync(keyFilePath, 'utf-8').trim()
      if (key) return key
    }
  } catch (err) {
    console.error('[Tavily Connector] Error reading key file:', err)
  }

  if (process.env.TAVILY_API_KEY) {
    const key = process.env.TAVILY_API_KEY.trim()
    if (key) return key
  }

  return undefined
}

/**
 * Saves a Tavily API key to the key file.
 */
export function saveTavilyApiKey(key: string): void {
  const trimmed = key?.trim()
  if (!trimmed) {
    throw new Error('Tavily API key cannot be empty')
  }

  const keyFilePath = getKeyFilePath()
  fs.writeFileSync(keyFilePath, trimmed, 'utf-8')
}

/**
 * Deletes the saved Tavily API key file if present.
 */
export function deleteTavilyApiKey(): void {
  const keyFilePath = getKeyFilePath()
  try {
    if (fs.existsSync(keyFilePath)) {
      fs.unlinkSync(keyFilePath)
    }
  } catch (err) {
    console.error('[Tavily Connector] Error deleting key file:', err)
  }
}

/**
 * Checks whether Tavily has a configured API key.
 */
export function isTavilyConfigured(): boolean {
  return !!getTavilyApiKey()
}
