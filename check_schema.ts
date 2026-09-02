import { supabase } from './lib/supabase';
async function test() {
  const { data, error } = await supabase.rpc('query', { query_text: "SELECT column_name FROM information_schema.columns WHERE table_name = 'exam_summaries';" });
  console.log("Cols:", data, error);
}
test();
