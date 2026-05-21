"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import GlassCard from "./glass-card";

type SystemState = "healthy" | "degraded" | "down";

type OpsIncident = {
  id: string;
  severity: "SEV1" | "SEV2" | "SEV3";
  message: string;
  source: string;
  status: "investigating" | "resolved";
  detectedAt: number;
};

export type AdminMode = "closed" | "compact" | "full";

type EnterpriseOpsPanelProps = {
  availabilityPct: number;
  cameraOnlinePct: number;
  etaMinutes: number | null;
  routeLoading: boolean;
  systemState: SystemState;
  metrics: {
    rtt: number;
    uptime: number;
    availability: number;
  };
  updatedAt: number;
  incidents: OpsIncident[];
  mode: AdminMode;
  onModeChange: (mode: AdminMode) => void;
  slo: {
    targetPct: number;
    uptime6hPct: number;
    errorBudgetRemainingPct: number;
    burnRate1h: number;
    burnRate6h: number;
  };
  executiveBrief: {
    totalJourneys: number;
    topDestinations: Array<{ name: string; count: number }>;
    carbonSavedKg: number;
    adoptionTrends: {
      walkPct: number;
      evPct: number;
      bikePct: number;
      motorbikePct: number;
    };
  };
};

function latencyClass(latencyMs: number): string {
  if (latencyMs <= 140) {
    return "opsPill ok";
  }
  if (latencyMs <= 185) {
    return "opsPill warn";
  }
  return "opsPill danger";
}

function statusMap(systemState: SystemState): { label: "UP" | "WARN" | "DOWN"; icon: string; className: string } {
  if (systemState === "healthy") {
    return { label: "UP", icon: "🟢", className: "ok" };
  }
  if (systemState === "degraded") {
    return { label: "WARN", icon: "🟡", className: "warn" };
  }
  return { label: "DOWN", icon: "🔴", className: "danger" };
}

export default function EnterpriseOpsPanel({
  availabilityPct,
  cameraOnlinePct,
  etaMinutes,
  routeLoading,
  systemState,
  metrics,
  updatedAt,
  incidents,
  mode,
  onModeChange,
  slo,
  executiveBrief
}: EnterpriseOpsPanelProps) {
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const stateUi = statusMap(systemState);

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

  const updatedLabel = new Date(updatedAt).toLocaleTimeString("vi-VN");

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => !acknowledged[incident.id]),
    [acknowledged, incidents]
  );

  const hasInvestigatingIncident = activeIncidents.some((incident) => incident.status === "investigating");

  const summaryText =
    systemState === "healthy"
      ? "All systems operational."
      : systemState === "degraded"
        ? "Minor performance degradation detected."
        : "Multiple services unavailable. Investigating.";

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
      "incident_status",
      "incident_source",
      "incident_message",
      "incident_detected_at"
    ];

    const base = [
      new Date().toISOString(),
      String(availabilityPct),
      String(cameraOnlinePct),
      etaMinutes === null ? "" : String(etaMinutes),
      stateUi.label,
      stateUi.label,
      stateUi.label,
      String(Math.round(metrics.rtt)),
      String(slo.targetPct),
      String(slo.uptime6hPct),
      String(slo.errorBudgetRemainingPct),
      String(slo.burnRate1h),
      String(slo.burnRate6h)
    ];

    const rows = (activeIncidents.length ? activeIncidents : [null]).map((incident) => {
      const incidentCols = incident
        ? [incident.id, incident.severity, incident.status, incident.source, incident.message, new Date(incident.detectedAt).toISOString()]
        : ["", "", "", "", "", ""];
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

  function exportExecutiveBriefPdf() {
    const report = new jsPDF({ unit: "pt", format: "a4" });
    const left = 52;
    let y = 62;

    report.setFont("helvetica", "bold");
    report.setFontSize(18);
    report.text("Weekly Green Mobility Report", left, y);

    y += 24;
    report.setFont("helvetica", "normal");
    report.setFontSize(10);
    report.text(`Generated at: ${new Date().toLocaleString("vi-VN")}`, left, y);

    y += 28;
    report.setFont("helvetica", "bold");
    report.setFontSize(13);
    report.text("Executive Summary", left, y);

    y += 20;
    report.setFont("helvetica", "normal");
    report.setFontSize(11);
    report.text(`Total journeys: ${executiveBrief.totalJourneys}`, left, y);
    y += 16;
    report.text(`Carbon saved: ${executiveBrief.carbonSavedKg.toFixed(1)} kg CO2`, left, y);
    y += 16;
    report.text(`Congestion reduced: ${availabilityPct}% city-wide availability signal`, left, y);

    y += 28;
    report.setFont("helvetica", "bold");
    report.setFontSize(13);
    report.text("Top destinations", left, y);

    y += 18;
    report.setFont("helvetica", "normal");
    report.setFontSize(11);
    if (executiveBrief.topDestinations.length === 0) {
      report.text("No destination activity yet.", left, y);
      y += 16;
    } else {
      executiveBrief.topDestinations.slice(0, 5).forEach((item, index) => {
        report.text(`${index + 1}. ${item.name} (${item.count} journeys)`, left, y);
        y += 16;
      });
    }

    y += 12;
    report.setFont("helvetica", "bold");
    report.setFontSize(13);
    report.text("Adoption trends", left, y);

    y += 18;
    report.setFont("helvetica", "normal");
    report.setFontSize(11);
    report.text(`Walk: ${executiveBrief.adoptionTrends.walkPct}%`, left, y);
    y += 16;
    report.text(`EV: ${executiveBrief.adoptionTrends.evPct}%`, left, y);
    y += 16;
    report.text(`Bike: ${executiveBrief.adoptionTrends.bikePct}%`, left, y);
    y += 16;
    report.text(`Motorbike: ${executiveBrief.adoptionTrends.motorbikePct}%`, left, y);

    y += 24;
    report.setFont("helvetica", "italic");
    report.setFontSize(10);
    report.text("GreenPark AI - Executive Brief Mode", left, y);

    report.save(`weekly-green-mobility-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  if (mode === "compact") {
    return (
      <GlassCard className="enterpriseOps enterpriseOpsCompact">
        <div className="opsCompactStack" data-testid="ops-compact">
          <button type="button" data-testid="ops-open" onClick={() => onModeChange("full")}>⚡</button>
          <span>{stateUi.icon}</span>
          <span className={`opsPill ${stateUi.className}`}>{stateUi.label}</span>
          <button type="button" data-testid="ops-close" onClick={() => onModeChange("closed")}>✕</button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="enterpriseOps">
      <header className="opsHeader">
        <div>
          <h3>Enterprise Command</h3>
          <span>Runtime posture • {updatedLabel}</span>
        </div>
        <div className="opsModeButtons">
          <button type="button" data-testid="ops-compact-btn" onClick={() => onModeChange("compact")}>Compact</button>
          <button type="button" data-testid="ops-close" onClick={() => onModeChange("closed")}>Close</button>
        </div>
      </header>

      {hasInvestigatingIncident ? (
        <div className="opsAlertPulse" data-testid="ops-alert">
          🚨 Incident detected
        </div>
      ) : null}

      <section className="opsServiceGrid">
        <div className="opsServiceCard" data-testid="ops-live">
          <strong>Realtime</strong>
          <span className={`opsPill ${stateUi.className}`}>{stateUi.icon} {stateUi.label}</span>
        </div>
        <div className="opsServiceCard" data-testid="ops-ready">
          <strong>Readiness</strong>
          <span className={`opsPill ${stateUi.className}`}>{stateUi.icon} {stateUi.label}</span>
        </div>
        <div className="opsServiceCard" data-testid="ops-health">
          <strong>Health</strong>
          <span className={`opsPill ${stateUi.className}`}>{stateUi.icon} {stateUi.label}</span>
        </div>
        <div className="opsServiceCard" data-testid="ops-latency">
          <strong>API RTT</strong>
          <span className={latencyClass(metrics.rtt)}>{Math.round(metrics.rtt)}ms</span>
        </div>
      </section>

      <section className="opsKpiGrid">
        <article>
          <p>Slot Availability</p>
          <strong className="metricValue">{availabilityPct}%</strong>
        </article>
        <article>
          <p>Camera Uptime</p>
          <strong className="metricValue">{cameraOnlinePct}%</strong>
        </article>
        <article>
          <p>Route SLA</p>
          <strong className={`opsText-${routeSla.className}`}>{routeSla.label}</strong>
        </article>
        <article>
          <p>API Uptime</p>
          <strong className="metricValue">{metrics.uptime.toFixed(2)}%</strong>
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
          <div className="opsExportActions">
            <button type="button" data-testid="ops-export-pdf" onClick={exportExecutiveBriefPdf}>
              Executive Brief PDF
            </button>
            <button type="button" data-testid="ops-export-csv" onClick={exportOpsCsv}>
              Export CSV
            </button>
          </div>
        </div>
        <p className={`opsSystemSummary opsText-${stateUi.className}`}>{summaryText}</p>
        <ul>
          {activeIncidents.length ? (
            activeIncidents.map((incident) => (
              <li key={incident.id} className="opsIncidentItem">
                <div className="opsIncidentMetaRow">
                  <span className={`opsSeverity ${incident.severity.toLowerCase()}`}>{incident.severity}</span>
                  <span>{incident.source}</span>
                  <span>{new Date(incident.detectedAt).toLocaleTimeString("vi-VN")}</span>
                </div>
                <p>
                  {incident.message} — <span className={incident.status === "resolved" ? "opsText-ok" : "opsText-warn"}>{incident.status}</span>
                </p>
                {incident.status === "investigating" ? (
                  <button type="button" data-testid={`ack-${incident.id}`} onClick={() => ackIncident(incident.id)}>
                    Acknowledge
                  </button>
                ) : null}
              </li>
            ))
          ) : (
            <li>{summaryText}</li>
          )}
        </ul>
      </section>
    </GlassCard>
  );
}
