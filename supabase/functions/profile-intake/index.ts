import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const DEMO_ORG_ID = Deno.env.get('DEMO_ORG_ID') ?? 'demo-org-001'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProfileIntakePayload {
  full_name?: string
  email?: string
  phone?: string
  source?: string
  talent_type?: string
  primary_skills?: string[]
  notes?: string
  raw_metadata?: Record<string, unknown>
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: ProfileIntakePayload
  try {
    payload = await req.json() as ProfileIntakePayload
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Validate required fields
  if (!payload.full_name || !payload.full_name.trim()) {
    return new Response(JSON.stringify({ error: 'full_name is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const now = new Date().toISOString()

  const profileRecord = {
    id: crypto.randomUUID(),
    organization_id: DEMO_ORG_ID,
    full_name: payload.full_name.trim(),
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    source: payload.source ?? 'Manual',
    talent_type: payload.talent_type ?? 'Other',
    status: 'New',
    primary_skills: payload.primary_skills ?? [],
    secondary_skills: [],
    certifications: [],
    domains: [],
    notes: payload.notes ?? null,
    is_shortlisted: false,
    is_favorite: false,
    is_active: true,
    raw_metadata: payload.raw_metadata ?? null,
    created_at: now,
    updated_at: now,
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('talent_profiles')
    .upsert(profileRecord, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    console.error('profile-intake upsert error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
