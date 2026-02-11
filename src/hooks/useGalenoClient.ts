// Custom hook for using the Galeno client
// Automatically creates the right client based on the current node context

import { useMemo } from 'react';
import { useNode } from '../contexts/NodeContext';
import { createGalenoClient, GalenoClient } from '../lib/galeno-client';
import { toast } from 'sonner';

export function useGalenoClient(): GalenoClient {
  const { activeContext } = useNode();

  const client = useMemo(() => {
    try {
      return createGalenoClient(activeContext);
    } catch (error) {
      toast.error('Remote mode requires apiBaseUrl and authToken');
      // Fallback to local client
      return createGalenoClient({ mode: 'local', nodeName: 'Fallback' });
    }
  }, [activeContext]);

  return client;
}
