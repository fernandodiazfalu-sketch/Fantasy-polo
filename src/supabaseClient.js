import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xbvurlfzhejipnwmoqdn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_W3-18BJC-EPENAIPZGVVbQ_6GpBPobh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
