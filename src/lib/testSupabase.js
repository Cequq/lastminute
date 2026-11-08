
import { supabase } from './supabase';

export async function testSupabase() {
  const tables = ['categories', 'businesses', 'deals'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(5);

    if (error) {
      console.error(`${table} алдаа:`, error.message);
    } else {
      console.log(`${table} амжилттай:`, data);
    }
  }
}
