import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSpacesByColors } from '@/lib/db/actions'
import type { Space } from '@/lib/db/schema'

import { resolveSpaceThreadFilter } from '../active-space-filter'

vi.mock('@/lib/db/actions')

describe('resolveSpaceThreadFilter', () => {
  beforeEach(() => {
    vi.mocked(getSpacesByColors).mockResolvedValue([])
  })

  it('returns default (null) for undefined color', async () => {
    expect(await resolveSpaceThreadFilter('u', undefined)).toEqual({
      spaceId: null
    })
  })

  it('returns default (null) for the Default color', async () => {
    expect(await resolveSpaceThreadFilter('u', 'black')).toEqual({
      spaceId: null
    })
  })

  it('returns default (null) for an unknown/tampered color', async () => {
    expect(await resolveSpaceThreadFilter('u', 'not-a-color')).toEqual({
      spaceId: null
    })
  })

  it('returns the space id when the color has a saved space', async () => {
    vi.mocked(getSpacesByColors).mockResolvedValue([
      { id: 's1', color: 'blue' } as Space
    ])
    expect(await resolveSpaceThreadFilter('u', 'blue')).toEqual({
      spaceId: 's1'
    })
  })

  it('returns { empty: true } for a non-default color with no saved space', async () => {
    vi.mocked(getSpacesByColors).mockResolvedValue([])
    expect(await resolveSpaceThreadFilter('u', 'blue')).toEqual({ empty: true })
  })
})
