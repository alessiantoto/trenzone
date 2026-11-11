import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/admin'
  const isSafePath = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes(':')
  const next = isSafePath ? rawNext : '/admin'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('Supabase Auth Error:', error.message)
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`)
}
