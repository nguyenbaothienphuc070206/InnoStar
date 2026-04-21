"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
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
  onFindNearest: () => void;
  onDrawRoute: () => void;
};

type SnapTarget = "mini" | "half" | "full";

export default function EcoPanel({
  status,
  co2SavedKg,
  greenScore,
  ecoLevel,
  ecoPoints,
  etaMinutes,
  finding,
  routeLoading,
  onFindNearest,
  onDrawRoute
}: EcoPanelProps) {
  const [viewportHeight, setViewportHeight] = useState(900);
  const [sheetHeight, setSheetHeight] = useState(280);
  const [dragging, setDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);
  const dragLastYRef = useRef(0);
  const dragLastTsRef = useRef(0);
  const dragVelocityRef = useRef(0);
  const treeEquivalent = Math.max(1, Math.round(co2SavedKg / 2.4));

  const snapPoints = useMemo(() => {
    const mini = 84;
    const half = Math.round(viewportHeight * 0.4);
    const full = Math.round(viewportHeight * 0.75);
    return { mini, half, full };
  }, [viewportHeight]);

  const visibleHeight = Math.max(snapPoints.mini, Math.min(snapPoints.full, sheetHeight));
  const translateY = Math.max(0, snapPoints.full - visibleHeight);
  const isMini = visibleHeight <= snapPoints.mini + 4;

  function clampHeight(value: number) {
    return Math.max(snapPoints.mini, Math.min(snapPoints.full, value));
  }

  function nearestSnap(value: number) {
    const candidates = [snapPoints.mini, snapPoints.half, snapPoints.full];
    return candidates.reduce((best, current) => (Math.abs(current - value) < Math.abs(best - value) ? current : best), snapPoints.half);
  }

  function setSnap(target: SnapTarget) {
    if (target === "mini") {
      setSheetHeight(snapPoints.mini);
      return;
    }
    if (target === "full") {
      setSheetHeight(snapPoints.full);
      return;
    }
    setSheetHeight(snapPoints.half);
  }

  function snapLabel(value: number) {
    if (value <= snapPoints.mini + 4) {
      return "Mini";
    }
    if (value >= snapPoints.full - 4) {
      return "Full";
    }
    return "Half";
  }

  function dragStart(clientY: number) {
    setDragging(true);
    dragStartYRef.current = clientY;
    dragStartHeightRef.current = visibleHeight;
    dragLastYRef.current = clientY;
    dragLastTsRef.current = Date.now();
    dragVelocityRef.current = 0;
  }

  function dragMove(clientY: number) {
    if (!dragging) {
      return;
    }
    const now = Date.now();
    const delta = dragStartYRef.current - clientY;
    const nextHeight = clampHeight(dragStartHeightRef.current + delta);
    const dt = Math.max(1, now - dragLastTsRef.current);
    dragVelocityRef.current = ((dragLastYRef.current - clientY) / dt) * 16;
    dragLastYRef.current = clientY;
    dragLastTsRef.current = now;
    setSheetHeight(nextHeight);
  }

  function dragEnd() {
    if (!dragging) {
      return;
    }
    setDragging(false);

    if (dragVelocityRef.current > 18) {
      setSnap("full");
      return;
    }

    if (dragVelocityRef.current < -18) {
      setSnap("mini");
      return;
    }

    setSheetHeight(nearestSnap(visibleHeight));
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncViewport = () => {
      const nextViewport = window.innerHeight;
      setViewportHeight(nextViewport);
      const mini = 84;
      const half = Math.round(nextViewport * 0.4);
      const full = Math.round(nextViewport * 0.75);
      setSheetHeight((current) => {
        if (current <= mini + 4) {
          return mini;
        }
        if (current >= full - 4) {
          return full;
        }
        return Math.max(mini, Math.min(full, half));
      });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (finding) {
      setSnap("half");
    }
  }, [finding, snapPoints.half]);

  useEffect(() => {
    if (routeLoading) {
      setSnap("mini");
    }
  }, [routeLoading, snapPoints.mini]);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => dragMove(event.clientY);
    const onMouseUp = () => dragEnd();
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        dragMove(event.touches[0].clientY);
      }
    };
    const onTouchEnd = () => dragEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, visibleHeight, snapPoints.half, snapPoints.full, snapPoints.mini]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        return;
      }

      if (event.key === "Escape") {
        setSnap("mini");
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "f") {
        setSnap("full");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [snapPoints.full, snapPoints.mini]);

  return (
    <motion.aside
      initial={{ y: 26, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 130 }}
      className="ecoPanelShell"
      data-testid="eco-sheet"
    >
      <GlassCard
        className="ecoPanel"
        style={{
          height: `${snapPoints.full}px`,
          transform: `translateY(${translateY}px)`,
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)"
        }}
      >
        <div
          className={`ecoDragHandle ${dragging ? "dragging" : ""}`}
          role="slider"
          tabIndex={0}
          data-testid="eco-drag-handle"
          aria-label="Resize eco panel"
          aria-orientation="vertical"
          aria-valuemin={snapPoints.mini}
          aria-valuemax={snapPoints.full}
          aria-valuenow={visibleHeight}
          aria-valuetext={snapLabel(visibleHeight)}
          onMouseDown={(event) => dragStart(event.clientY)}
          onTouchStart={(event) => {
            if (event.touches.length > 0) {
              dragStart(event.touches[0].clientY);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "PageUp") {
              event.preventDefault();
              setSnap(event.shiftKey ? "full" : "half");
              return;
            }
            if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === "Escape") {
              event.preventDefault();
              setSnap("mini");
              return;
            }
            if (event.key === "Home") {
              event.preventDefault();
              setSnap("mini");
              return;
            }
            if (event.key === "End") {
              event.preventDefault();
              setSnap("full");
            }
          }}
        >
          <div className="ecoDragBar" />
        </div>

        <div className="ecoHeader">
          <h2 className="ecoTitle">Eco Journey</h2>
          <button data-testid="panel-compact" className="ecoCollapseButton" onClick={() => setSnap(isMini ? "half" : "mini")}>
            {isMini ? "Expand" : "Minimize"}
          </button>
        </div>

        <div className="ecoBodyWrap">
          <div className="ecoBody">
            <p className="ecoStatus">● {status}</p>

            <div className="ecoQuickStats">🌱 {co2SavedKg}kg CO2</div>
            <div className="ecoSub">≈ {treeEquivalent} trees planted</div>

            <div className="ecoScoreRow">
              <span>Score</span>
              <strong>{greenScore}</strong>
            </div>

            <div className="ecoBadge" title={`${ecoLevel} - ${ecoPoints} pts`}>{ecoLevel} • {ecoPoints} pts</div>

            <div className="ecoPanelButtons">
              <button
                onClick={() => {
                  setSnap("half");
                  onFindNearest();
                }}
              >
                Find
              </button>
              <button
                onClick={() => {
                  setSnap("mini");
                  onDrawRoute();
                }}
                disabled={routeLoading}
              >
                Route
              </button>
            </div>

            {finding ? <p className="loadingHint">Analyzing best parking...</p> : null}
            {etaMinutes ? <p className="ecoEta">ETA: ~{Math.max(1, etaMinutes)} min</p> : null}
          </div>
        </div>
      </GlassCard>
    </motion.aside>
  );
}
