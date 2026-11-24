import {
  getCrunchbaseTokens,
  isCrunchbaseConfigured,
  isCrunchbaseConnected
} from '@/lib/mcp/crunchbase'
import {
  isKnowledgeConfigured,
  isKnowledgeConnected
} from '@/lib/mcp/knowledge'

import { isTavilyConfigured } from './tavily'
import { ConnectorStatus } from './types'

export function getConnectorsStatus(): ConnectorStatus[] {
  const cbTokens = getCrunchbaseTokens()
  const connectors: ConnectorStatus[] = [
    {
      id: 'crunchbase',
      name: 'Crunchbase',
      description: 'Company and startup funding intelligence',
      connectType: 'oauth',
      configured: isCrunchbaseConfigured(),
      connected: isCrunchbaseConnected(),
      authUrl: '/api/mcp/crunchbase/auth',
      expiresAt: cbTokens?.expiresAt
        ? new Date(cbTokens.expiresAt).toISOString()
        : null
    },
    {
      id: 'knowledge',
      name: 'Knowledge Pack MCP',
      description: 'Research evidence & Southeast Asia market datasets',
      connectType: 'token',
      configured: isKnowledgeConfigured(),
      connected: isKnowledgeConnected()
    },
    {
      id: 'tavily',
      name: 'Tavily Search',
      description: 'AI-optimized web search & content extraction',
      connectType: 'apiKey',
      configured: isTavilyConfigured(),
      connected: isTavilyConfigured()
    }
  ]

  // Optional status-only search providers from environment
  if (process.env.SEARXNG_API_URL) {
    connectors.push({
      id: 'searxng',
      name: 'SearXNG',
      description: 'Self-hosted metasearch engine',
      connectType: 'none',
      configured: true,
      connected: true
    })
  }

  if (process.env.EXA_API_KEY) {
    connectors.push({
      id: 'exa',
      name: 'Exa Search',
      description: 'Neural and semantic web search',
      connectType: 'none',
      configured: true,
      connected: true
    })
  }

  if (process.env.BRAVE_SEARCH_API_KEY) {
    connectors.push({
      id: 'brave',
      name: 'Brave Search',
      description: 'Privacy-focused web search',
      connectType: 'none',
      configured: true,
      connected: true
    })
  }

  return connectors
}
