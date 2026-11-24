'use client'

import { defineRegistry } from '@json-render/react'

import { Badge } from './components/badge'
import { Button } from './components/button'
import { Card } from './components/card'
import { Chart } from './components/chart'
import { Grid } from './components/grid'
import { Heading } from './components/heading'
import { Image } from './components/image'
import { Stack } from './components/stack'
import { StatGrid } from './components/stat-grid'
import { Text } from './components/text'
import { Timeline } from './components/timeline'
import { catalog } from './catalog'

export const { registry } = defineRegistry(catalog, {
  components: {
    Heading,
    Stack,
    Button,
    Grid,
    Image,
    Card,
    Text,
    Badge,
    Chart,
    Timeline,
    StatGrid
  },
  actions: {
    submitQuery: async () => {
      // Handled by ActionProvider at runtime
    }
  }
})
