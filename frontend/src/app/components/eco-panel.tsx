"use client";

import { motion } from "framer-motion";
import { FormEvent, useState } from "react";

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
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);

  return (
    <>
      <div className="ecoPanelActions">
        <button onClick={() => setOpen((value) => !value)}>{open ? "Hide Panel" : "Show Panel"}</button>
        <button onClick={() => setMinimized((value) => !value)}>{minimized ? "Expand" : "Minimize"}</button>
      </div>

      {open ? (
        <motion.aside
          drag="y"
          dragMomentum={false}
          dragConstraints={{ top: -260, bottom: 320 }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: minimized ? 240 : 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="ecoPanel"
        >
          <h2>Eco Journey</h2>
          <p>Status: {status}</p>
          <p>CO2 saved: {co2SavedKg} kg</p>
          <p>Green Score: {greenScore}</p>
          <p className="ecoHighlight">You are greener than 82% users</p>
          <div className="ecoBadge">{ecoLevel} • {ecoPoints} pts</div>

          <div className="ecoPanelButtons">
            <button onClick={onFindParking}>Find Parking</button>
            <button onClick={onFindParking}>Green Route</button>
          </div>

          <form onSubmit={onSubmitReport} className="ecoReportForm">
            <input
              value={report}
              onChange={(event) => onReportChange(event.target.value)}
              placeholder="Report traffic, weather, slot status"
            />
            <button type="submit">Send</button>
          </form>
        </motion.aside>
      ) : null}
    </>
  );
}
