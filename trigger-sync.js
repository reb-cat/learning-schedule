// Temporary script to trigger sync
import { supabase } from "./src/integrations/supabase/client.js";

const runSync = async () => {
  console.log('Starting Canvas sync...');
  
  const { data, error } = await supabase.functions.invoke('daily-canvas-sync', {
    body: { studentName: undefined } // Sync all students
  });

  if (error) {
    console.error('Sync failed:', error);
  } else {
    console.log('Sync completed:', data);
  }
};

runSync();