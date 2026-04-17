"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import CameraListPanel from "./components/camera-list-panel";
import CameraAIOverlay from "./components/camera-ai-overlay";
import EcoPanel from "./components/eco-panel";
import GlassCard from "./components/glass-card";
import LayerControl from "./components/layer-control";
import SlotMiniDashboard from "./components/slot-mini-dashboard";
import TopBar from "./components/top-bar";
import { RouteSuggestion, Slot } from "./components/types";
import { useDebouncedValue } from "./hooks/use-debounced-value";
import { useMapStore } from "./store/use-map-store";

const MapView = dynamic(() => import("./components/map-view"), { ssr: false });

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api/v1";
const backendWsUrl = backendUrl.replace(/\/api\/v1\/?$/, "");
const cameraStreamUrl = process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || "http://localhost:8000/stream.m3u8";
const userLocation: [number, number] = [10.772, 106.698];

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export default function Home() {
  const [routeLoading, setRouteLoading] = useState(false);
  const [cameraOffline, setCameraOffline] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);

  const {
    slots,
    query,
    profileName,
    layers,
    co2SavedKg,
    route,
    ecoLevel,
    ecoPoints,
    report,
    statusMessage,
    selectedSlot,
    setQuery,
    setProfileName,
    setReport,
    setRoute,
    setStatusMessage,
    setSelectedSlot,
    toggleLayer,
    bumpEco,
    mergeRealtimeSlots
  } = useMapStore();

  const debouncedQuery = useDebouncedValue(query, 280);

  useEffect(() => {
    const cachedName = window.localStorage.getItem("greenpark-user");
    if (cachedName) {
      setProfileName(cachedName);
    }
  }, [setProfileName]);

  useEffect(() => {
    window.localStorage.setItem("greenpark-user", profileName);
  }, [profileName]);

  useEffect(() => {
    let socket: Socket | undefined;

    try {
      socket = io(backendWsUrl, { transports: ["websocket"] });

      socket.on("connect", () => setStatusMessage("Realtime online"));
      socket.on("disconnect", () => setStatusMessage("Realtime disconnected"));
      socket.on("parking-update", (data: Slot[]) => {
        if (Array.isArray(data)) {
          requestAnimationFrame(() => {
            mergeRealtimeSlots(data);
          });
        }
      });
    } catch {
      setStatusMessage("Realtime unavailable");
    }

    return () => {
      socket?.disconnect();
    };
  }, [mergeRealtimeSlots, setStatusMessage]);

  useEffect(() => {
    if (selectedSlot || slots.length === 0) {
      return;
    }

    const nearest = slots.reduce<Slot | null>((best, slot) => {
      if (!slot.available || typeof slot.lat !== "number" || typeof slot.lng !== "number") {
        return best;
      }

      if (!best) {
        return slot;
      }

      const bestDistance = distance(userLocation, [best.lat ?? userLocation[0], best.lng ?? userLocation[1]]);
      const currentDistance = distance(userLocation, [slot.lat, slot.lng]);
      return currentDistance < bestDistance ? slot : best;
    }, null);

    if (nearest) {
      setSelectedSlot(nearest);
    }
  }, [selectedSlot, setSelectedSlot, slots]);

  useEffect(() => {
    if (!selectedSlot) {
      setRouteProgress(0);
      return;
    }

    setRouteProgress(0);
    const timer = window.setInterval(() => {
      setRouteProgress((value) => {
        const next = value + 0.04;
        if (next >= 1) {
          window.clearInterval(timer);
          return 1;
        }
        return next;
      });
    }, 50);

    return () => window.clearInterval(timer);
  }, [selectedSlot]);

  const stats = useMemo(() => {
    const available = slots.filter((slot) => slot.available).length;
    const greenAvailable = slots.filter((slot) => slot.available && slot.zone === "green").length;
    const score = Math.round((greenAvailable / Math.max(1, slots.length)) * 100);
    return { available, greenAvailable, score };
  }, [slots]);

  const preferredArea = "District 1";
  const nearbyAvailableSlots = useMemo(() => {
    const thresholdX = preferredArea === "District 1" ? 55 : 100;
    return slots.filter((slot) => slot.x <= thresholdX && slot.available);
  }, [slots]);

  const recommendedSlots = useMemo(() => {
    return [...nearbyAvailableSlots].sort((a, b) => (a.distanceM ?? 9999) - (b.distanceM ?? 9999)).slice(0, 2);
  }, [nearbyAvailableSlots]);

  const fallbackRoute = useMemo<Array<[number, number]>>(() => {
    if (!selectedSlot || typeof selectedSlot.lat !== "number" || typeof selectedSlot.lng !== "number") {
      return [];
    }

    const destination: [number, number] = [selectedSlot.lat, selectedSlot.lng];
    const animatedPoint: [number, number] = [
      userLocation[0] + (destination[0] - userLocation[0]) * routeProgress,
      userLocation[1] + (destination[1] - userLocation[1]) * routeProgress
    ];

    return [userLocation, animatedPoint];
  }, [routeProgress, selectedSlot]);

  const routePath = route?.path?.length ? route.path : fallbackRoute;

  async function findParking() {
    setRouteLoading(true);
    try {
      setStatusMessage("Analyzing best parking route...");
      const response = await fetch(`${backendUrl}/parking/route?destination=${encodeURIComponent(query)}`);
      const data = (await response.json()) as RouteSuggestion;
      setRoute(data);
      bumpEco(16, 0.35);
      setStatusMessage(`Best route ready: ${data.etaMinutes} min ETA`);
    } catch {
      setStatusMessage("Route API unavailable");
    } finally {
      setRouteLoading(false);
    }
  }

  async function navigateToSelectedSlot() {
    if (!selectedSlot) {
      return;
    }
    setQuery(`Slot S${selectedSlot.id}`);
    await findParking();
  }

  function openSelectedLiveView() {
    if (!selectedSlot) {
      return;
    }
    setStatusMessage(`Live view focused on S${selectedSlot.id}`);
  }

  const treeEquivalent = Math.max(0.1, Number((co2SavedKg / 21).toFixed(2)));
  const selectedSlotStatus = selectedSlot
    ? selectedSlot.available
      ? "Available now"
      : selectedSlot.soon || (selectedSlot.predictedFreeMin ?? 99) <= 10
        ? `Likely free in ${selectedSlot.predictedFreeMin ?? 8} min`
        : "Currently full"
    : "Tap a slot marker to inspect";

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    if (!report.trim()) return;

    try {
      await fetch(`${backendUrl}/parking/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: report, user: profileName })
      });
      setReport("");
      setStatusMessage("Thanks for your community report");
    } catch {
      setStatusMessage("Could not send report");
    }
  }

  return (
    <main className="platformShell pt-safe pb-safe">
      <MapView
        slots={slots}
        layers={layers}
        selectedSlotId={selectedSlot?.id ?? null}
        userLocation={userLocation}
        routePath={routePath}
        onSlotClick={(slot) => {
          setSelectedSlot(slot);
          const soonFree = !slot.available && (slot.soon || (slot.predictedFreeMin ?? 99) <= 10);
          const state = slot.available ? "available" : soonFree ? `free in ~${slot.predictedFreeMin ?? 8} min` : "full";
          setStatusMessage(`S${slot.id} ${state}`);
        }}
      />

      <div className="mapAtmosphereOverlay" aria-hidden />

      <TopBar
        query={query}
        onQueryChange={setQuery}
        greenScore={route?.score ?? stats.score}
        profileName={profileName}
        onProfileNameChange={setProfileName}
      />

      <LayerControl layers={layers} onToggle={toggleLayer} />

      <EcoPanel
        status={statusMessage}
        co2SavedKg={co2SavedKg}
        greenScore={route?.score ?? stats.score}
        ecoLevel={ecoLevel}
        ecoPoints={ecoPoints}
        report={report}
        onReportChange={setReport}
        onSubmitReport={submitReport}
        onFindParking={findParking}
      />

      <SlotMiniDashboard slot={selectedSlot} onNavigate={navigateToSelectedSlot} onOpenLiveView={openSelectedLiveView} />

      <GlassCard className="liveCameraCard">
        <h3>Live View</h3>
        {routeLoading ? <p className="loadingHint" data-testid="route-loading">Analyzing best parking...</p> : null}
        <div className="liveCameraFrame">
          <video
            src={cameraStreamUrl}
            controls
            autoPlay
            className="liveCameraVideo"
            onError={() => setCameraOffline(true)}
            onCanPlay={() => setCameraOffline(false)}
          />
          <CameraAIOverlay active={Boolean(selectedSlot)} seed={selectedSlot?.id ?? 0} />
          {selectedSlot ? <span className="aiOverlayTag" data-testid="ai-overlay-tag">AI Tracking S{selectedSlot.id}</span> : null}
        </div>
        {cameraOffline ? <p className="cameraError">Camera offline</p> : null}
        <p className="cameraHint">
          Markers: {stats.available}/{slots.length} available • Recommended: {recommendedSlots.length} • {selectedSlotStatus}
        </p>
        <CameraListPanel slots={slots} searchTerm={debouncedQuery} />
        <div className="recommendCard">
          <p>Recommended for you</p>
          {recommendedSlots.length > 0 ? (
            <>
              {recommendedSlots.map((slot) => (
                <div key={slot.id} className="recommendItem">
                  <strong>{`S${slot.id} in ${slot.distanceM ?? 150}m`}</strong>
                  <button
                    data-testid={`inspect-slot-${slot.id}`}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setStatusMessage(`S${slot.id} selected`);
                    }}
                  >
                    Inspect
                  </button>
                </div>
              ))}
            </>
          ) : (
            <strong>No parking available nearby</strong>
          )}
          <span>Impact: {co2SavedKg}kg CO2 saved, equivalent to {treeEquivalent} tree-months.</span>
        </div>
      </GlassCard>
    </main>
  );
}
