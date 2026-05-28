"use client";

import { motion } from "framer-motion";
import GlassCard from "./glass-card";
import { Slot } from "./types";

type SlotMiniDashboardProps = {
  slot: Slot | null;
  onNavigate: () => void;
  onOpenLiveView: () => void;
  routeLoading: boolean;
};

export default function SlotMiniDashboard({ slot }: SlotMiniDashboardProps) {
  if (!slot) {
    return null;
  }

  return (
    <motion.aside
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="slotMiniDashboard"
      data-testid="slot-mini-dashboard"
    >
      <GlassCard className="slotMiniCard">
        <p className="slotPersonaKicker">Selected parking</p>
        <h4>{`Slot S${slot.id}`}</h4>
        <p className="slotPersonaSummary">{slot.available ? "Currently available" : slot.soon ? "Likely free soon" : "Check nearby options"}</p>
      </GlassCard>
    </motion.aside>
  );
}
