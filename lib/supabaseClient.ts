import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dxqqgptjpprqlahwdaxi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4cXFncHRqcHBycWxhaHdkYXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjU1NzgsImV4cCI6MjA3NjgwMTU3OH0.poL-1kf1tI-H4idbFltLFonoCWzR0Evjf1FkgTT8Tu4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
