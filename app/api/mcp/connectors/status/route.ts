import { NextResponse } from 'next/server'

import { getConnectorsStatus } from '@/lib/connectors/status'

export const dynamic = 'force-dynamic'

export async function GET() {
  const connectors = getConnectorsStatus()
  return NextResponse.json(connectors)
}
