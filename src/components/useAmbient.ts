import { useReducedMotion } from 'framer-motion';
import { useStore } from '../data/store';

/** Animações ambientes (nuvens, pétalas, borboletas): respeitam a configuração e o sistema. */
export function useAmbient() {
  const { data } = useStore();
  const osReduce = useReducedMotion();
  const rm = data.settings.reducedMotion;
  if (data.settings.ambient === false) return false;
  if (rm === 'on') return false;
  if (rm === 'system' && osReduce) return false;
  return true;
}
