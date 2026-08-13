const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearNews() {
  console.log('Clearing old failed news from Supabase...');
  const { data, error } = await supabase
    .from('news')
    .delete()
    .neq('id', 0); // deletes all rows

  if (error) {
    console.error('Error clearing news:', error);
  } else {
    console.log('Successfully cleared the news table. Ready for a fresh sync!');
  }
}

clearNews();
