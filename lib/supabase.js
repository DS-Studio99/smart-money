import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isConfigured = SUPABASE_URL && SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20

// Mock auth object for when Supabase is not configured
const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (cb) => {
        return { data: { subscription: { unsubscribe: () => { } } } }
    },
    signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured. Please add your Supabase URL and Anon Key to .env.local' } }),
    signUp: async () => ({ data: null, error: { message: 'Supabase not configured. Please add your Supabase URL and Anon Key to .env.local' } }),
    signOut: async () => ({ error: null }),
}

// Mock database query builder
const mockQueryBuilder = {
    select: () => mockQueryBuilder,
    eq: () => mockQueryBuilder,
    gte: () => mockQueryBuilder,
    lte: () => mockQueryBuilder,
    order: () => mockQueryBuilder,
    single: async () => ({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    [Symbol.iterator]: function* () { },
}
Object.defineProperty(mockQueryBuilder, 'then', {
    value: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
    writable: true,
})

const mockFrom = () => ({
    select: (cols) => ({ ...mockQueryBuilder, [Symbol.toPrimitive]: () => Promise.resolve([]) }),
    insert: (data) => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Configure Supabase first' } }) }) }),
    upsert: (data) => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    update: (data) => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
})

// Real or mock Supabase client
let _supabase = null

if (isConfigured) {
    try {
        _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                storageKey: 'smart-money-auth-token',
            }
        })
    } catch (err) {
        console.warn('[supabase] Failed to initialize:', err.message)
    }
}

export const supabase = _supabase || {
    auth: mockAuth,
    from: mockFrom,
}
