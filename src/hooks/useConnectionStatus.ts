import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple health check query
        const { error } = await supabase
          .from('assignments_staging')
          .select('id')
          .limit(1);
        
        const connected = !error;
        setIsConnected(connected);
        setLastCheck(new Date());
        
        if (!connected) {
          console.warn('Supabase connection check failed:', error);
        }
      } catch (err) {
        console.error('Connection check error:', err);
        setIsConnected(false);
        setLastCheck(new Date());
      }
    };

    // Check immediately
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return { isConnected, lastCheck };
}