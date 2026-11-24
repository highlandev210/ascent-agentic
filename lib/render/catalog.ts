import { z } from 'zod'

import { schema } from './schema'

const iconName = z.enum(['related', 'edit', 'arrow-right']).optional()

export const catalog = schema.createCatalog({
  components: {
    Heading: {
      props: z.object({
        title: z.string(),
        icon: iconName
      }),
      description: 'A heading label with an optional icon'
    },
    Stack: {
      props: z
        .object({
          direction: z.enum(['vertical', 'horizontal']).optional(),
          gap: z.enum(['xs', 'sm', 'md', 'lg']).optional()
        })
        .partial(),
      description:
        'A layout container that stacks children vertically or horizontally'
    },
    Button: {
      props: z.object({
        text: z.string(),
        icon: iconName,
        variant: z
          .enum(['default', 'outline', 'ghost', 'link', 'secondary'])
          .optional()
      }),
      description:
        'A clickable button that emits a press action. Use variant="link" with icon="arrow-right" for inline follow-up suggestions.'
    },
    Grid: {
      props: z.object({
        columns: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4)
        ]),
        gap: z.enum(['xs', 'sm', 'md', 'lg']).optional(),
        responsive: z.boolean().optional()
      }),
      description:
        'A fixed-column CSS grid container, so cell widths are determined upfront while children stream in. With responsive, it collapses to one column on narrow screens.'
    },
    Image: {
      props: z.object({
        src: z.string(),
        sourceUrl: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        aspectRatio: z.enum(['1:1', '16:9', '4:3']).optional()
      }),
      description:
        'An inline image referencing a web source; click to expand with credit'
    },
    Card: {
      props: z
        .object({
          href: z.string().optional()
        })
        .partial(),
      description:
        'A bordered container for its children. With href, the whole card links to that page and shows its domain.'
    },
    Text: {
      props: z.object({
        text: z.string(),
        tone: z.enum(['default', 'muted']).optional(),
        weight: z.enum(['normal', 'semibold']).optional()
      }),
      description: 'A short run of text'
    },
    Badge: {
      props: z.object({
        text: z.string()
      }),
      description: 'A small label such as a price, location, date, or type'
    },
    Chart: {
      props: z.object({
        title: z.string().optional(),
        type: z.enum(['bar', 'line', 'donut']).default('bar'),
        data: z.array(
          z.object({
            label: z.string(),
            value: z.number(),
            secondaryValue: z.number().optional(),
            annotation: z.string().optional()
          })
        ),
        valuePrefix: z.string().optional(),
        valueSuffix: z.string().optional()
      }),
      description:
        'An interactive chart (bar, line, or donut) for financial metrics, funding rounds, valuations, or numerical comparisons.'
    },
    Timeline: {
      props: z.object({
        title: z.string().optional(),
        items: z.array(
          z.object({
            title: z.string(),
            date: z.string().optional(),
            value: z.string().optional(),
            description: z.string().optional(),
            badges: z.array(z.string()).optional()
          })
        )
      }),
      description:
        'A stepped vertical timeline for funding rounds, startup history, acquisition milestones, or event progressions.'
    },
    StatGrid: {
      props: z.object({
        stats: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
            subtext: z.string().optional(),
            trend: z.enum(['up', 'neutral', 'down']).optional()
          })
        )
      }),
      description:
        'A responsive grid of key financial or startup metric cards.'
    }
  },
  actions: {
    submitQuery: {
      params: z.object({
        query: z.string()
      }),
      description: 'Submit a follow-up query to the chat'
    }
  }
})
