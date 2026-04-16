"use client";

import { motion } from "framer-motion";
import { FormEvent, useState } from "react";
import GlassCard from "./glass-card";

type EcoPanelProps = {
  status: string;
  co2SavedKg: number;
  greenScore: number;
  ecoLevel: string;
  ecoPoints: number;
  report: string;
  onReportChange: (value: string) => void;
  onSubmitReport: (event: FormEvent) => Promise<void>;
  onFindParking: () => Promise<void>;
};

export default function EcoPanel({
  status,
  co2SavedKg,
  greenScore,
  ecoLevel,
  ecoPoints,
  report,
  onReportChange,
  onSubmitReport,
  onFindParking
}: EcoPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const treeEquivalent = Math.max(1, Math.round(co2SavedKg / 2.4));

  return (
    <motion.aside
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120 }}
      className="ecoPanelShell"
      data-testid="eco-sheet"
    >
      <GlassCard className={`ecoPanel ${collapsed ? "ecoPanelCollapsed" : ""}`}>
        <div className="ecoHeader">
          <h2 className="ecoTitle">Eco Journey</h2>
          <button data-testid="panel-compact" className="ecoCollapseButton" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? "Expand" : "Minimize"}
          </button>
        </div>

        {!collapsed ? (
          <div className="ecoBody">
            <p className="ecoStatus">● {status}</p>

            <div className="ecoQuickStats">🌱 {co2SavedKg}kg CO2</div>
            <div className="ecoSub">≈ {treeEquivalent} trees planted</div>

            <div className="ecoScoreRow">
              <span>Score</span>
              <strong>{greenScore}</strong>
            </div>

            <div className="ecoRank">Top 82% users</div>
            <div className="ecoBadge">{ecoLevel} • {ecoPoints} pts</div>

            <div className="ecoPanelButtons">
              <button onClick={onFindParking}>Find</button>
              <button onClick={onFindParking}>Route</button>
            </div>

            <form onSubmit={onSubmitReport} className="ecoReportForm">
              <input value={report} onChange={(event) => onReportChange(event.target.value)} placeholder="Report status" />
              <button type="submit">Send</button>
            </form>
          </div>
        ) : null}
      </GlassCard>
    </motion.aside>
  );
}
