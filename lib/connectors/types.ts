export type ConnectType = 'oauth' | 'token' | 'apiKey' | 'none'

export interface ConnectorStatus {
  id: string
  name: string
  description?: string
  connectType: ConnectType
  configured: boolean
  connected: boolean
  authUrl?: string
  expiresAt?: string | null
}
