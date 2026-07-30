import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dlslommazbasfpwupsbp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qLa99m1wWcuYX-lTrL3kgQ_C471SjOc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);