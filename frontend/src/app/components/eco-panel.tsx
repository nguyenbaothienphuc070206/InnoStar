"use client";

import { motion } from "framer-motion";
import { FormEvent, useState } from "react";

type SheetState = "full" | "half" | "min";

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
  const [sheetState, setSheetState] = useState<SheetState>("half");
  const treeEquivalent = Math.max(1, Math.round(co2SavedKg / 2.4));

  const yMap: Record<SheetState, number> = {
    full: 0,
    half: 220,
    min: 410
  };

  return (
    <>
      <div className="ecoPanelActions">
        <button data-testid="panel-toggle" onClick={() => setOpen((value) => !value)}>{open ? "Hide Panel" : "Show Panel"}</button>
        <button data-testid="sheet-full" onClick={() => setSheetState("full")}>Full</button>
        <button data-testid="sheet-half" onClick={() => setSheetState("half")}>Half</button>
        <button data-testid="sheet-min" onClick={() => setSheetState("min")}>Mini</button>
      </div>

      {open ? (
        <motion.aside
          drag="y"
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={{ top: -30, bottom: 450 }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -80) {
              setSheetState("full");
              return;
            }
            if (info.offset.y > 120) {
              setSheetState("min");
              return;
            }
            setSheetState("half");
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: yMap[sheetState], opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          data-state={sheetState}
          data-testid="eco-sheet"
          className="ecoPanel"
        >
          <h2>Eco Journey</h2>
          <p>Status: {status}</p>
          <p className="ecoHighlight">You saved {co2SavedKg}kg CO2</p>
          <p className="ecoSub">Equivalent to planting {treeEquivalent} trees.</p>
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
