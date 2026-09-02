import { supabase } from './lib/supabase';
async function test() {
  const { data: { user } } = await supabase.auth.getUser();
  console.log("User:", user?.id);
  // Try inserting
  const { data, error } = await supabase.from('exam_summaries').insert([{ 
    exam_code: 'TEST', 
    school_name: 'TEST',
    exam_subject: 'TEST',
    exam_date: '2023-01-01',
    total_participants: 0,
    average_score: 0,
    highest_score: 0,
    lowest_score: 0,
    passing_rate: 0,
    question_stats: []
  }]).select();
  console.log("Error:", error);
}
test();
