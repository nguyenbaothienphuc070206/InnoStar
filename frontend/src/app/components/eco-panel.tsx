"use client";

import { motion } from "framer-motion";
import GlassCard from "./glass-card";

type EcoPanelProps = {
  status: string;
  co2SavedKg: number;
  greenScore: number;
  ecoLevel: string;
  ecoPoints: number;
  etaMinutes: number | null;
  finding: boolean;
  routeLoading: boolean;
  mobilityStats?: {
    evStations: number;
    bikeParking: number;
  };
  onFindNearest: () => void;
  onDrawRoute: () => void;
};

export default function EcoPanel({ co2SavedKg, ecoLevel, ecoPoints }: EcoPanelProps) {
  const co2Label = `${co2SavedKg >= 0 ? "+" : ""}${co2SavedKg.toFixed(1)}kg CO2`;

  return (
    <motion.aside
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 130 }}
      className="ecoPanelShell"
      data-testid="eco-sheet"
    >
      <GlassCard className="ecoPanel ecoPanelMini">
        <span className="ecoMiniLabel">Eco Journey</span>
        <div className="ecoMiniStatRow">
          <strong className="ecoMiniPrimary">{co2Label}</strong>
          <div className="ecoMiniMeta">
            <span>{ecoLevel}</span>
            <span>{ecoPoints} pts</span>
          </div>
        </div>
      </GlassCard>
    </motion.aside>
  );
}
