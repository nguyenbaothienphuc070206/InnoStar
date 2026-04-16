"use client";

import { FormEvent, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import EcoPanel from "./components/eco-panel";
import LayerControl from "./components/layer-control";
import TopBar from "./components/top-bar";
import { RouteSuggestion, Slot } from "./components/types";
import { useMapStore } from "./store/use-map-store";

const MapView = dynamic(() => import("./components/map-view"), { ssr: false });

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api/v1";
const backendWsUrl = backendUrl.replace(/\/api\/v1\/?$/, "");
const cameraStreamUrl = process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || "http://localhost:8000/stream.m3u8";

export default function Home() {
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
    setQuery,
    setProfileName,
    setReport,
    setRoute,
    setStatusMessage,
    toggleLayer,
    bumpEco,
    mergeRealtimeSlots
  } = useMapStore();

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

  const stats = useMemo(() => {
    const available = slots.filter((slot) => slot.available).length;
    const greenAvailable = slots.filter((slot) => slot.available && slot.zone === "green").length;
    const score = Math.round((greenAvailable / Math.max(1, slots.length)) * 100);
    return { available, greenAvailable, score };
  }, [slots]);

  const preferredArea = "District 1";
  const recommendedSlots = useMemo(() => {
    const thresholdX = preferredArea === "District 1" ? 55 : 100;
    return slots.filter((slot) => slot.x <= thresholdX && slot.available);
  }, [slots]);

  async function findParking() {
    try {
      const response = await fetch(`${backendUrl}/parking/route?destination=${encodeURIComponent(query)}`);
      const data = (await response.json()) as RouteSuggestion;
      setRoute(data);
      bumpEco(16, 0.35);
    } catch {
      setStatusMessage("Route API unavailable");
    }
  }

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
    <main className="platformShell">
      <MapView
        slots={slots}
        layers={layers}
        routePath={route?.path || []}
        onSlotClick={(slot) => setStatusMessage(`S${slot.id} ${slot.available ? "available" : "full"}`)}
      />

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

      <aside className="liveCameraCard">
        <h3>Live View</h3>
        <video src={cameraStreamUrl} controls autoPlay className="liveCameraVideo" />
        <p className="cameraHint">Markers: {stats.available}/{slots.length} available • Recommended: {recommendedSlots.length}</p>
      </aside>
    </main>
  );
}
