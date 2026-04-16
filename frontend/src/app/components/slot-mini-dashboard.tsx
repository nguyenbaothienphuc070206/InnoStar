"use client";

import { motion } from "framer-motion";
import GlassCard from "./glass-card";
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
    <motion.aside
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="slotMiniDashboard"
      data-testid="slot-mini-dashboard"
    >
      <GlassCard className="slotMiniCard">
        <h4>Slot S{slot.id}</h4>
        <p>{status}</p>
        <p>{slot.available ? "Free now" : `Free in ${slot.predictedFreeMin ?? 12} min`} • {slot.distanceM ?? 150}m</p>
        <div className="slotMiniActions">
          <button onClick={onNavigate}>Go</button>
          <button onClick={onOpenLiveView}>View</button>
        </div>
      </GlassCard>
    </motion.aside>
  );
}
