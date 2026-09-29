/**
 * Per-device display preferences that are not game progress (so Reset
 * Progress keeps them): the map view.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MapView } from '@/components/map/projection';

interface ViewPrefs {
  mapView: MapView;
  setMapView: (view: MapView) => void;
}

export const useViewPrefs = create<ViewPrefs>()(
  persist(
    (set) => ({
      mapView: 'iso',
      setMapView: (mapView) => set({ mapView }),
    }),
    {
      name: 'miningpuzzle.viewPrefs',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const view = (persisted as { mapView?: unknown } | undefined)?.mapView;
        return { ...current, mapView: view === 'top' || view === 'iso' ? view : current.mapView };
      },
    },
  ),
);
