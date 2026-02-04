import { useConfigContext } from '../contexts/ConfigContext';

export function useConfig() {
    return useConfigContext();
}
