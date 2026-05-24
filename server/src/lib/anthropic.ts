import Anthropic from '@anthropic-ai/sdk'

function createClient() {
  return new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })
}

const g = globalThis as unknown as { anthropic?: Anthropic }
export const anthropic = g.anthropic ?? createClient()
if (process.env['NODE_ENV'] !== 'production') g.anthropic = anthropic
