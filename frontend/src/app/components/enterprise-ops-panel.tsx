"use client";

import { useMemo, useState } from "react";
import GlassCard from "./glass-card";

type OpsState = "up" | "down" | "degraded" | "restricted";

type EnterpriseOpsPanelProps = {
  availabilityPct: number;
  cameraOnlinePct: number;
  etaMinutes: number | null;
  routeLoading: boolean;
  ecoPoints: number;
  opsHealth: {
    live: OpsState;
    ready: OpsState;
    health: OpsState;
    latencyMs: number | null;
    updatedAt: number | null;
  };
  incidents: string[];
};

function stateLabel(state: OpsState): string {
  if (state === "up") {
    return "UP";
  }
  if (state === "restricted") {
    return "AUTH";
  }
  if (state === "degraded") {
    return "DEG";
  }
  return "DOWN";
}

function latencyClass(latencyMs: number | null): string {
  if (latencyMs === null) {
    return "opsPill muted";
  }
  if (latencyMs <= 350) {
    return "opsPill ok";
  }
  if (latencyMs <= 900) {
    return "opsPill warn";
  }
  return "opsPill danger";
}

export default function EnterpriseOpsPanel({
  availabilityPct,
  cameraOnlinePct,
  etaMinutes,
  routeLoading,
  ecoPoints,
  opsHealth,
  incidents
}: EnterpriseOpsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const routeSla = useMemo(() => {
    if (routeLoading) {
      return { label: "Computing", className: "warn" };
    }
    if (etaMinutes === null) {
      return { label: "Idle", className: "muted" };
    }
    if (etaMinutes <= 8) {
      return { label: "SLA Gold", className: "ok" };
    }
    if (etaMinutes <= 14) {
      return { label: "SLA Standard", className: "warn" };
    }
    return { label: "SLA Risk", className: "danger" };
  }, [etaMinutes, routeLoading]);

  const updatedLabel = opsHealth.updatedAt ? new Date(opsHealth.updatedAt).toLocaleTimeString("vi-VN") : "--:--:--";

  return (
    <GlassCard className={`enterpriseOps ${collapsed ? "enterpriseOpsCollapsed" : ""}`}>
      <header className="opsHeader">
        <div>
          <h3>Enterprise Command</h3>
          <span>Runtime posture • {updatedLabel}</span>
        </div>
        <button type="button" data-testid="ops-toggle" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? "Expand" : "Compact"}
        </button>
      </header>

      {!collapsed ? (
        <>
          <section className="opsServiceGrid">
            <div className="opsServiceCard" data-testid="ops-live">
              <strong>Realtime</strong>
              <span className={`opsPill ${opsHealth.live === "up" ? "ok" : "danger"}`}>{stateLabel(opsHealth.live)}</span>
            </div>
            <div className="opsServiceCard" data-testid="ops-ready">
              <strong>Readiness</strong>
              <span className={`opsPill ${opsHealth.ready === "up" ? "ok" : "danger"}`}>{stateLabel(opsHealth.ready)}</span>
            </div>
            <div className="opsServiceCard" data-testid="ops-health">
              <strong>Health</strong>
              <span
                className={`opsPill ${
                  opsHealth.health === "up" ? "ok" : opsHealth.health === "restricted" ? "warn" : "danger"
                }`}
              >
                {stateLabel(opsHealth.health)}
              </span>
            </div>
            <div className="opsServiceCard" data-testid="ops-latency">
              <strong>API RTT</strong>
              <span className={latencyClass(opsHealth.latencyMs)}>{opsHealth.latencyMs ?? "--"}{opsHealth.latencyMs !== null ? "ms" : ""}</span>
            </div>
          </section>

          <section className="opsKpiGrid">
            <article>
              <p>Slot Availability</p>
              <strong>{availabilityPct}%</strong>
            </article>
            <article>
              <p>Camera Uptime</p>
              <strong>{cameraOnlinePct}%</strong>
            </article>
            <article>
              <p>Route SLA</p>
              <strong className={`opsText-${routeSla.className}`}>{routeSla.label}</strong>
            </article>
            <article>
              <p>Eco Points</p>
              <strong>{ecoPoints}</strong>
            </article>
          </section>

          <section className="opsIncidentFeed" data-testid="ops-incidents">
            <h4>Incident Feed</h4>
            <ul>
              {incidents.length ? (
                incidents.map((incident) => <li key={incident}>{incident}</li>)
              ) : (
                <li>All systems nominal. No active incidents.</li>
              )}
            </ul>
          </section>
        </>
      ) : null}
    </GlassCard>
  );
}
