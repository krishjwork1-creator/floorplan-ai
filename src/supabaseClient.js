import { createClient } from '@supabase/supabase-js'

// REPLACE WITH YOUR ACTUAL SUPABASE KEYS
const supabaseUrl = 'https://wkmzzdkyqnlkikuceoyv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbXp6ZGt5cW5sa2lrdWNlb3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTkwMzQsImV4cCI6MjA4NjAzNTAzNH0.0_1ideJKmq5yBIwEAMEed2asuoUqSl762Y2AhSXgrqg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)