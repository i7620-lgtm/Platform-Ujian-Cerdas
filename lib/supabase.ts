
import { createClient } from '@supabase/supabase-js';

// Menggunakan kredensial yang Anda berikan
const supabaseUrl = 'https://fidxmkjpdlfawagawrrm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZHhta2pwZGxmYXdhZ2F3cnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDgzNjksImV4cCI6MjA4NTMyNDM2OX0.X-ln0rn5tpGgrCpPxiv-FkfPuvAAmORdNRaqwa9RetM';

export const supabase = createClient(supabaseUrl, supabaseKey);
