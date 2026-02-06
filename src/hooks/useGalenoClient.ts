// Custom hook for using the Galeno client
// Automatically creates the right client based on the current node context

import { useMemo } from 'react';
import { useNode } from '../contexts/NodeContext';
import { createGalenoClient, GalenoClient } from '../lib/galeno-client';

export function useGalenoClient(): GalenoClient {
  const { activeContext } = useNode();

  const client = useMemo(() => {
    return createGalenoClient(activeContext);
  }, [activeContext]);

  return client;
}
