"use client";

import { create } from "zustand";
import { LayersState, RouteSuggestion, Slot, SlotDiff } from "../components/types";

const STATE_STABILITY_WINDOW_MS = 2500;
const lastSlotStateUpdateAt = new Map<number, number>();

type MapState = {
  slots: Slot[];
  selectedSlot: Slot | null;
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
  setSelectedSlot: (value: Slot | null) => void;
  toggleLayer: (layer: keyof LayersState) => void;
  bumpEco: (points: number, co2: number) => void;
  mergeRealtimeSlots: (incoming: Slot[]) => void;
  applyRealtimeDiff: (diff: SlotDiff[]) => void;
};

function generateSlots(count = 60): Slot[] {
  return Array.from({ length: count }, (_, index) => {
    const statusSeed = Math.random();
    const available = statusSeed <= 0.33;
    const soon = !available && statusSeed <= 0.66;
    const x = Math.round(Math.random() * 100);
    const y = Math.round(Math.random() * 100);
    const lat = 10.768 + Math.random() * 0.014;
    const lng = 106.691 + Math.random() * 0.015;

    return {
      id: index + 1,
      type: Math.random() > 0.25 ? "car" : "bike",
      zone: Math.random() > 0.45 ? "green" : "standard",
      available,
      soon,
      predictedFreeMin: available ? 0 : soon ? 4 + Math.round(Math.random() * 6) : 14 + Math.round(Math.random() * 9),
      distanceM: 80 + Math.round(Math.random() * 420),
      x,
      y,
      lat,
      lng,
      cameraOnline: Math.random() > 0.32,
      updatedAt: new Date(Date.now() - Math.round(Math.random() * 100000)).toISOString()
    };
  });
}

const initialSlots: Slot[] = generateSlots(60);

function maybeSoon(slot: Slot): boolean {
  if (slot.available) {
    return false;
  }
  if (typeof slot.predictedFreeMin === "number") {
    return slot.predictedFreeMin <= 10;
  }
  return Math.random() > 0.5;
}

function slotChanged(prev: Slot, next: Slot): boolean {
  return (
    prev.status !== next.status ||
    prev.available !== next.available ||
    prev.soon !== next.soon ||
    prev.predictedFreeMin !== next.predictedFreeMin ||
    prev.distanceM !== next.distanceM ||
    prev.cameraOnline !== next.cameraOnline ||
    prev.updatedAt !== next.updatedAt ||
    prev.lat !== next.lat ||
    prev.lng !== next.lng
  );
}

export const useMapStore = create<MapState>((set) => ({
  slots: initialSlots,
  selectedSlot: null,
  layers: {
    parking: true,
    camera: true,
    traffic: false,
    heat: true,
    route: true,
    story: true
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
  setSelectedSlot: (value) => set({ selectedSlot: value }),
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
      let hasChanges = false;

      const nextSlots = state.slots.map((slot) => {
        const next = byId.get(slot.id);
        if (!next) {
          return slot;
        }

        const now = Date.now();
        const last = lastSlotStateUpdateAt.get(slot.id) ?? 0;
        const stateFlip = slot.available !== next.available || slot.cameraOnline !== next.cameraOnline;
        if (stateFlip && now - last < STATE_STABILITY_WINDOW_MS) {
          return slot;
        }

        const merged: Slot = {
          ...slot,
          ...next,
          soon: typeof next.soon === "boolean" ? next.soon : maybeSoon({ ...slot, ...next })
        };

        if (slotChanged(slot, merged)) {
          hasChanges = true;
          lastSlotStateUpdateAt.set(slot.id, now);
        }
        return merged;
      });

      if (!hasChanges) {
        return state;
      }

      return {
        slots: nextSlots
      };
    }),
  applyRealtimeDiff: (diff) =>
    set((state) => {
      if (!Array.isArray(diff) || diff.length === 0) {
        return state;
      }

      const byId = new Map(
        diff.map((item) => [Number(item.id.replace(/^S/i, "")), item])
      );
      let hasChanges = false;

      const nextSlots = state.slots.map((slot) => {
        const update = byId.get(slot.id);
        if (!update) {
          return slot;
        }

        const now = Date.now();
        const last = lastSlotStateUpdateAt.get(slot.id) ?? 0;
        const stateFlip = slot.available !== !update.occupied || slot.cameraOnline !== update.cameraOnline;
        if (stateFlip && now - last < STATE_STABILITY_WINDOW_MS) {
          return slot;
        }

        const merged: Slot = {
          ...slot,
          status: update.status ?? (!update.occupied ? "free" : update.soon ? "reserved" : "occupied"),
          available: !update.occupied,
          soon: update.soon,
          predictedFreeMin: update.predictedFreeMin,
          cameraOnline: update.cameraOnline,
          distanceM: update.distanceM,
          updatedAt: update.updatedAt
        };

        if (slotChanged(slot, merged)) {
          hasChanges = true;
          lastSlotStateUpdateAt.set(slot.id, now);
        }
        return merged;
      });

      if (!hasChanges) {
        return state;
      }

      return { slots: nextSlots };
    })
}));
