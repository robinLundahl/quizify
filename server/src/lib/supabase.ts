import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

export const AVATARS_BUCKET = 'avatars'

export function getSupabase() {
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(url, key, { realtime: { transport: ws as any } })
}
