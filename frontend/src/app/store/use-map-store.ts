"use client";

import { create } from "zustand";
import { LayersState, RouteSuggestion, Slot } from "../components/types";

type MapState = {
  slots: Slot[];
  layers: LayersState;
  route: RouteSuggestion | null;
  report: string;
  statusMessage: string;
  co2SavedKg: number;
  ecoLevel: string;
  ecoPoints: number;
  query: string;
  profileName: string;
  setQuery: (value: string) => void;
  setProfileName: (value: string) => void;
  setReport: (value: string) => void;
  setRoute: (value: RouteSuggestion | null) => void;
  setStatusMessage: (value: string) => void;
  toggleLayer: (layer: keyof LayersState) => void;
  bumpEco: (points: number, co2: number) => void;
  mergeRealtimeSlots: (incoming: Slot[]) => void;
};

const initialSlots: Slot[] = [
  { id: 1, type: "car", zone: "green", available: true, x: 20, y: 22, cameraOnline: true },
  { id: 2, type: "car", zone: "standard", available: false, x: 34, y: 38, cameraOnline: false },
  { id: 3, type: "bike", zone: "green", available: true, x: 58, y: 31, cameraOnline: true },
  { id: 4, type: "bike", zone: "standard", available: false, x: 67, y: 64, cameraOnline: false },
  { id: 5, type: "car", zone: "green", available: true, x: 79, y: 44, cameraOnline: true }
];

export const useMapStore = create<MapState>((set) => ({
  slots: initialSlots,
  layers: {
    parking: true,
    camera: true,
    traffic: false,
    route: true
  },
  route: null,
  report: "",
  statusMessage: "Realtime online",
  co2SavedKg: 4.8,
  ecoLevel: "Eco Driver Lv.2",
  ecoPoints: 260,
  query: "Ben Thanh Market",
  profileName: "Eco Traveler",
  setQuery: (value) => set({ query: value }),
  setProfileName: (value) => set({ profileName: value }),
  setReport: (value) => set({ report: value }),
  setRoute: (value) => set({ route: value }),
  setStatusMessage: (value) => set({ statusMessage: value }),
  toggleLayer: (layer) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layer]: !state.layers[layer]
      }
    })),
  bumpEco: (points, co2) =>
    set((state) => {
      const nextPoints = state.ecoPoints + points;
      return {
        ecoPoints: nextPoints,
        co2SavedKg: Number((state.co2SavedKg + co2).toFixed(2)),
        ecoLevel: nextPoints >= 300 ? "Eco Driver Lv.3" : state.ecoLevel
      };
    }),
  mergeRealtimeSlots: (incoming) =>
    set((state) => {
      const byId = new Map(incoming.map((item) => [item.id, item]));
      return {
        slots: state.slots.map((slot) => {
          const next = byId.get(slot.id);
          return next ? { ...slot, ...next } : slot;
        })
      };
    })
}));
