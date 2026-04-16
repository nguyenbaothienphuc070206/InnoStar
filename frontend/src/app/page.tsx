"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import EcoPanel from "./components/eco-panel";
import LayerControl from "./components/layer-control";
import TopBar from "./components/top-bar";
import { LayersState, RouteSuggestion, Slot } from "./components/types";

const MapView = dynamic(() => import("./components/map-view"), { ssr: false });

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api/v1";
const backendWsUrl = backendUrl.replace(/\/api\/v1\/?$/, "");
const cameraStreamUrl = process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || "http://localhost:8000/stream.m3u8";

const initialSlots: Slot[] = [
  { id: 1, type: "car", zone: "green", available: true, x: 20, y: 22, cameraOnline: true },
  { id: 2, type: "car", zone: "standard", available: false, x: 34, y: 38, cameraOnline: false },
  { id: 3, type: "bike", zone: "green", available: true, x: 58, y: 31, cameraOnline: true },
  { id: 4, type: "bike", zone: "standard", available: false, x: 67, y: 64, cameraOnline: false },
  { id: 5, type: "car", zone: "green", available: true, x: 79, y: 44, cameraOnline: true }
];

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [query, setQuery] = useState("Ben Thanh Market");
  const [username, setUsername] = useState("Eco Traveler");
  const [layers, setLayers] = useState<LayersState>({
    parking: true,
    camera: true,
    traffic: false,
    route: true
  });
  const [co2SavedKg, setCo2SavedKg] = useState(4.8);
  const [route, setRoute] = useState<RouteSuggestion | null>(null);
  const [ecoLevel, setEcoLevel] = useState("Eco Driver Lv.2");
  const [ecoPoints, setEcoPoints] = useState(260);
  const [report, setReport] = useState("");
  const [statusMessage, setStatusMessage] = useState("Realtime online");

  useEffect(() => {
    const cachedName = window.localStorage.getItem("greenpark-user");
    if (cachedName) {
      setUsername(cachedName);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("greenpark-user", username);
  }, [username]);

  useEffect(() => {
    let socket: Socket | undefined;

    try {
      socket = io(backendWsUrl, { transports: ["websocket"] });

      socket.on("connect", () => setStatusMessage("Realtime online"));
      socket.on("disconnect", () => setStatusMessage("Realtime disconnected"));
      socket.on("parking-update", (data: Slot[]) => {
        if (Array.isArray(data)) {
          requestAnimationFrame(() => {
            setSlots((prev) => {
              const byId = new Map(data.map((item) => [item.id, item]));
              return prev.map((slot) => {
                const next = byId.get(slot.id);
                return next ? { ...slot, ...next } : slot;
              });
            });
          });
        }
      });
    } catch {
      setStatusMessage("Realtime unavailable");
    }

    return () => {
      socket?.disconnect();
    };
  }, []);

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
      setCo2SavedKg((value) => Number((value + 0.35).toFixed(2)));
      setEcoPoints((value) => value + 16);
      setEcoLevel((level) => (ecoPoints + 16 >= 300 ? "Eco Driver Lv.3" : level));
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
        body: JSON.stringify({ message: report, user: username })
      });
      setReport("");
      setStatusMessage("Thanks for your community report");
    } catch {
      setStatusMessage("Could not send report");
    }
  }

  function toggleLayer(layer: keyof LayersState) {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
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
        profileName={username}
        onProfileNameChange={setUsername}
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
