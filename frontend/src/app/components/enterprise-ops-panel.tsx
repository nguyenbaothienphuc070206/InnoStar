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
  incidents: Array<{
    id: string;
    severity: "SEV1" | "SEV2" | "SEV3";
    message: string;
    source: string;
    detectedAt: number;
  }>;
  slo: {
    targetPct: number;
    uptime6hPct: number;
    errorBudgetRemainingPct: number;
    burnRate1h: number;
    burnRate6h: number;
  };
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
  incidents,
  slo
}: EnterpriseOpsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

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

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => !acknowledged[incident.id]),
    [acknowledged, incidents]
  );

  function ackIncident(id: string) {
    setAcknowledged((current) => ({
      ...current,
      [id]: true
    }));
  }

  function exportOpsCsv() {
    const headers = [
      "generated_at",
      "availability_pct",
      "camera_uptime_pct",
      "route_eta_min",
      "ops_live",
      "ops_ready",
      "ops_health",
      "ops_latency_ms",
      "slo_target_pct",
      "slo_uptime_6h_pct",
      "error_budget_remaining_pct",
      "burn_rate_1h",
      "burn_rate_6h",
      "incident_id",
      "incident_severity",
      "incident_source",
      "incident_message",
      "incident_detected_at"
    ];

    const base = [
      new Date().toISOString(),
      String(availabilityPct),
      String(cameraOnlinePct),
      etaMinutes === null ? "" : String(etaMinutes),
      opsHealth.live,
      opsHealth.ready,
      opsHealth.health,
      opsHealth.latencyMs === null ? "" : String(opsHealth.latencyMs),
      String(slo.targetPct),
      String(slo.uptime6hPct),
      String(slo.errorBudgetRemainingPct),
      String(slo.burnRate1h),
      String(slo.burnRate6h)
    ];

    const rows = (activeIncidents.length ? activeIncidents : [null]).map((incident) => {
      const incidentCols = incident
        ? [incident.id, incident.severity, incident.source, incident.message, new Date(incident.detectedAt).toISOString()]
        : ["", "", "", "", ""];
      return [...base, ...incidentCols]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `enterprise-ops-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

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

          <section className="opsSloGrid" data-testid="ops-slo">
            <article>
              <p>SLO Target</p>
              <strong>{slo.targetPct}%</strong>
            </article>
            <article>
              <p>Uptime 6h</p>
              <strong>{slo.uptime6hPct}%</strong>
            </article>
            <article>
              <p>Error Budget</p>
              <strong className={slo.errorBudgetRemainingPct < 35 ? "opsText-danger" : "opsText-ok"}>
                {slo.errorBudgetRemainingPct}%
              </strong>
            </article>
            <article>
              <p>Burn 1h / 6h</p>
              <strong className={slo.burnRate1h > 2 ? "opsText-danger" : slo.burnRate1h > 1 ? "opsText-warn" : "opsText-ok"}>
                {slo.burnRate1h}x / {slo.burnRate6h}x
              </strong>
            </article>
          </section>

          <section className="opsIncidentFeed" data-testid="ops-incidents">
            <div className="opsIncidentHeader">
              <h4>Incident Feed</h4>
              <button type="button" data-testid="ops-export-csv" onClick={exportOpsCsv}>
                Export CSV
              </button>
            </div>
            <ul>
              {activeIncidents.length ? (
                activeIncidents.map((incident) => (
                  <li key={incident.id} className="opsIncidentItem">
                    <div className="opsIncidentMetaRow">
                      <span className={`opsSeverity ${incident.severity.toLowerCase()}`}>{incident.severity}</span>
                      <span>{incident.source}</span>
                      <span>{new Date(incident.detectedAt).toLocaleTimeString("vi-VN")}</span>
                    </div>
                    <p>{incident.message}</p>
                    <button type="button" data-testid={`ack-${incident.id}`} onClick={() => ackIncident(incident.id)}>
                      Acknowledge
                    </button>
                  </li>
                ))
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
