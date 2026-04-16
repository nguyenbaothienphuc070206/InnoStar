"use client";

import { Slot } from "./types";

type SlotMiniDashboardProps = {
  slot: Slot | null;
  onNavigate: () => void;
  onOpenLiveView: () => void;
};

export default function SlotMiniDashboard({ slot, onNavigate, onOpenLiveView }: SlotMiniDashboardProps) {
  if (!slot) {
    return null;
  }

  const status = slot.available ? "Available" : (slot.predictedFreeMin ?? 0) <= 10 ? "Likely free soon" : "Full";

  return (
    <aside className="slotMiniDashboard" data-testid="slot-mini-dashboard">
      <h4>Slot S{slot.id}</h4>
      <p>Status: {status}</p>
      <p>Estimated free: {slot.available ? "Now" : `${slot.predictedFreeMin ?? 12} min`}</p>
      <p>Distance: {slot.distanceM ?? 150} m</p>
      <div className="slotMiniActions">
        <button onClick={onNavigate}>Navigate</button>
        <button onClick={onOpenLiveView}>Live View</button>
      </div>
    </aside>
  );
}
