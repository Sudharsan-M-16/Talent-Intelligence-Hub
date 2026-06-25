import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Gracefully handle missing env vars (demo mode)
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export const isSupabaseReady = !!supabase

/** Upload a file to a Supabase Storage bucket */
export async function uploadFile(
  bucket: 'resumes' | 'avatars' | 'documents',
  path: string,
  file: File
): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) { console.error('Upload error:', error); return null }
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return urlData.publicUrl
}

/** Get a signed URL for private bucket access */
export async function getSignedUrl(
  bucket: 'resumes' | 'documents',
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}
