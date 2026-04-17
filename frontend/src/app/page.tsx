"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import CameraListPanel from "./components/camera-list-panel";
import CameraAIOverlay from "./components/camera-ai-overlay";
import EcoPanel from "./components/eco-panel";
import GlassCard from "./components/glass-card";
import LayerControl from "./components/layer-control";
import SlotMiniDashboard from "./components/slot-mini-dashboard";
import TopBar from "./components/top-bar";
import { Slot } from "./components/types";
import { useDebouncedValue } from "./hooks/use-debounced-value";
import { useMapStore } from "./store/use-map-store";

const MapView = dynamic(() => import("./components/map-view"), { ssr: false });

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api/v1";
const backendWsUrl = backendUrl.replace(/\/api\/v1\/?$/, "");
const cameraStreamUrl = process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || "http://localhost:8000/stream.m3u8";
const userLocation: [number, number] = [10.772, 106.698];

type RouteOption = {
  coords: Array<[number, number]>;
  durationMin: number;
  distanceKm: number;
  steps: string[];
};

type RouteSegment = {
  positions: Array<[number, number]>;
  color: string;
};

type StoryCharacter = "coba" | "driver" | "youth";

type StoryMessage = {
  character: StoryCharacter;
  text: string;
};

type StoryContext = "find" | "route" | "inspect" | "available" | "soon" | "full";

const storybook: Record<StoryCharacter, Record<StoryContext, string[]>> = {
  coba: {
    find: [
      "Ba tim duoc diem do xe kha dep roi, minh di thong dong la vua.",
      "Diem nay dung nhip lam, do xe xong di bo ngam pho cho tron ven."
    ],
    route: [
      "Lo trinh nay dep va ngan, vua tiet kiem thoi gian vua giu nhip em ai.",
      "Di tuyen nay nhe, thong thoang hon va den noi rat on dinh."
    ],
    inspect: [
      "Goc nay co net xua de thuong, minh do xe gon roi thong dong tham quan.",
      "Chon cho nay duoc do, tu day di bo ra khu pho co rat hop."
    ],
    available: [
      "Cho nay trong san, minh ghe vao la co the gui ngay.",
      "Con cho trong dep qua, tranh thu do xe truoc khi dong hon nha."
    ],
    soon: [
      "Cho nay sap trong, doi mot chut la minh vao duoc ngay.",
      "Minh toi dung luc do, bai nay sap xoay vong co cho."
    ],
    full: [
      "Khu nay dang dong, minh doi tuyen ke ben cho thong thoang hon nhe.",
      "Tam nay kin cho roi, ba de xuat re sang tuyen phia ngoai de de tho hon."
    ]
  },
  driver: {
    find: [
      "Em lock duoc bai gan nhat roi, vao nhanh la dep.",
      "Co cho roi nha, minh cham diem nay la tiet kiem thoi gian nhat."
    ],
    route: [
      "Lay route nay nhe, de quay dau va den nhanh hon.",
      "Tuyen nay ngan nhat hien tai, den noi gon le luon."
    ],
    inspect: [
      "Spot nay ok, de vao de ra va kha an toan.",
      "Nhin duoc do, banh xe vao guong la vua khit."
    ],
    available: [
      "Con trong tot, minh vao gui luon cho khoi mat luot.",
      "Bai nay dang thoang, chot nhanh la dep."
    ],
    soon: [
      "Sap trong roi, doi tam vai phut la co suat.",
      "Canh nay sap nhich, minh canh nhip roi chen vao la vua."
    ],
    full: [
      "Bai nay full roi, em doi huong qua bai thu hai cho nhanh.",
      "Dong xe qua, tranh mat thoi gian minh chuyen sang diem du phong nhe."
    ]
  },
  youth: {
    find: [
      "Co spot vui roi, do xe xong la di chill duoc lien.",
      "Yeh tim thay cho hop ly, vao day la dung vibe luon."
    ],
    route: [
      "Di line nay cho cool, vua nhanh vua dung gu city walk.",
      "Route nay on nha, do xong la co nguyen khu local de kham pha."
    ],
    inspect: [
      "Spot nay nhin duoc nha, dung chat local chill zone.",
      "Check cho nay ok, tu day luon co nhieu hem hay de di bo."
    ],
    available: [
      "Con slot trong ne, tranh thu vao la dep.",
      "Qua ngon, cho nay trong san nha!"
    ],
    soon: [
      "Sap co cho roi, dung doi xiu la chen vao duoc.",
      "Bai nay dang quay vong nhanh, canh xiu la co slot."
    ],
    full: [
      "Cho nay kin roi, minh lua qua spot khac cho do ket.",
      "Dong qua roi, re sang bai ben cho do tho de choi tiep."
    ]
  }
};

const storyIcon: Record<StoryCharacter, string> = {
  coba: "🎭",
  driver: "🚕",
  youth: "🧢"
};

function pickStory(character: StoryCharacter, context: StoryContext): StoryMessage {
  const lines = storybook[character][context];
  const text = lines[Math.floor(Math.random() * lines.length)];
  return { character, text };
}

function resolveAreaName(slot: Slot): string {
  if (slot.zone === "green") {
    return "Le Loi";
  }

  if (typeof slot.lng === "number") {
    if (slot.lng < 106.697) {
      return "Ben Thanh";
    }
    if (slot.lng > 106.703) {
      return "Nguyen Hue";
    }
  }

  return "Sai Gon center";
}

function withAreaFlavor(base: StoryMessage, slot: Slot): StoryMessage {
  const area = resolveAreaName(slot);
  const addOn = base.character === "driver" ? ` Huong ${area} dang hop nhat.` : ` Khu ${area} dang len mood rat dep.`;
  return {
    ...base,
    text: `${base.text}${addOn}`
  };
}

function slotStoryContext(slot: Slot): StoryContext {
  if (slot.available) {
    return "available";
  }
  if (slot.soon || (slot.predictedFreeMin ?? 99) <= 10) {
    return "soon";
  }
  return "full";
}

function pickCharacterForSlot(slot: Slot): StoryCharacter {
  if (slot.zone === "green") {
    return "coba";
  }
  if ((slot.distanceM ?? 9999) < 220) {
    return "driver";
  }
  return "youth";
}

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export default function Home() {
  const [routeLoading, setRouteLoading] = useState(false);
  const [cameraOffline, setCameraOffline] = useState(false);
  const [routeFocusToken, setRouteFocusToken] = useState(0);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [activeRoute, setActiveRoute] = useState(0);
  const [turnSteps, setTurnSteps] = useState<string[]>([]);
  const [displayRoute, setDisplayRoute] = useState<Array<[number, number]>>([]);
  const [fadingRoute, setFadingRoute] = useState(false);
  const [finding, setFinding] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [story, setStory] = useState<StoryMessage | null>(null);
  const storyLayerHydratedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

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
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!story) {
      return;
    }

    const timer = window.setTimeout(() => setStory(null), 5000);
    return () => window.clearTimeout(timer);
  }, [story]);

  useEffect(() => {
    if (!layers.story && story) {
      setStory(null);
    }
  }, [layers.story, story]);

  useEffect(() => {
    if (storyLayerHydratedRef.current) {
      return;
    }

    const savedStoryLayer = window.localStorage.getItem("greenpark-layer-story");
    if (savedStoryLayer === "off" && layers.story) {
      toggleLayer("story");
    }
    storyLayerHydratedRef.current = true;
  }, [layers.story, toggleLayer]);

  useEffect(() => {
    if (!storyLayerHydratedRef.current) {
      return;
    }
    window.localStorage.setItem("greenpark-layer-story", layers.story ? "on" : "off");
  }, [layers.story]);

  function emitStory(character: StoryCharacter, context: StoryContext) {
    if (!layers.story) {
      return;
    }
    setStory(pickStory(character, context));
  }

  function emitStoryForSlot(slot: Slot, character: StoryCharacter, context: StoryContext) {
    if (!layers.story) {
      return;
    }
    setStory(withAreaFlavor(pickStory(character, context), slot));
  }

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

  const activeRoutePath = routes[activeRoute]?.coords;

  useEffect(() => {
    if (!activeRoutePath || activeRoutePath.length < 2) {
      setDisplayRoute([]);
      return;
    }

    let index = 2;
    setDisplayRoute(activeRoutePath.slice(0, 2));

    const timer = window.setInterval(() => {
      index += 5;
      setDisplayRoute(activeRoutePath.slice(0, Math.min(index, activeRoutePath.length)));

      if (index >= activeRoutePath.length) {
        window.clearInterval(timer);
      }
    }, 10);

    return () => window.clearInterval(timer);
  }, [activeRoutePath]);

  const routePath = activeRoutePath?.length ? activeRoutePath : route?.path?.length ? route.path : [];

  const routeSegments = useMemo<RouteSegment[]>(() => {
    if (!layers.traffic || !displayRoute || displayRoute.length < 2) {
      return [];
    }

    return displayRoute.slice(1).map((point, index) => {
      const prev = displayRoute[index];
      const levelSeed = (index * 37 + activeRoute * 17) % 100;
      const color = levelSeed > 66 ? "#ff4f4f" : levelSeed > 33 ? "#ffc34d" : "#5dff34";
      return {
        positions: [prev, point],
        color
      };
    });
  }, [activeRoute, displayRoute, layers.traffic]);

  function findNearestSlot(): Slot | null {
    return slots.reduce<Slot | null>((best, slot) => {
      if (typeof slot.lat !== "number" || typeof slot.lng !== "number") {
        return best;
      }

      const isFull = !slot.available && !slot.soon;
      if (isFull) {
        return best;
      }

      if (!best || typeof best.lat !== "number" || typeof best.lng !== "number") {
        return slot;
      }

      const currentDistance = distance(userLocation, [slot.lat, slot.lng]);
      const bestDistance = distance(userLocation, [best.lat, best.lng]);
      return currentDistance < bestDistance ? slot : best;
    }, null);
  }

  function handleFindNearest() {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    setFinding(true);
    setStatusMessage("Analyzing best parking...");

    window.setTimeout(() => {
      const nearest = findNearestSlot();
      if (!nearest || typeof nearest.lat !== "number" || typeof nearest.lng !== "number") {
        setStatusMessage("No nearby non-full slot found");
        setFinding(false);
        return;
      }

      setSelectedSlot(nearest);
      const rawDistance = distance(userLocation, [nearest.lat, nearest.lng]);
      const computedEta = Math.max(1, Math.round(rawDistance * 130));
      setEtaMinutes(computedEta);
      setRoutes([]);
      setDisplayRoute([]);
      setTurnSteps([]);
      setActiveRoute(0);
      setRoute(null);
      setStatusMessage(`Nearest slot found: S${nearest.id}`);
      emitStory("driver", "find");
      setFinding(false);
    }, 800);
  }

  async function requestOsrmRoutes() {
    if (!selectedSlot || typeof selectedSlot.lat !== "number" || typeof selectedSlot.lng !== "number") {
      setStatusMessage("Pick a slot first (tap marker or Find)");
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setFadingRoute(true);
    window.setTimeout(() => {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setRoutes([]);
      setDisplayRoute([]);
      setTurnSteps([]);
      setActiveRoute(0);
      setRoute(null);
      setFadingRoute(false);
    }, 200);

    setRouteLoading(true);
    try {
      setStatusMessage("Finding best route...");

      const osrmUrl =
        `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};` +
        `${selectedSlot.lng},${selectedSlot.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;

      const response = await fetch(osrmUrl, { signal: controller.signal });
      const data = (await response.json()) as {
        routes?: Array<{
          duration: number;
          distance: number;
          geometry: { coordinates: Array<[number, number]> };
          legs: Array<{ steps: Array<{ maneuver?: { instruction?: string }; name?: string }> }>;
        }>;
      };

      const parsedRoutes: RouteOption[] =
        data.routes?.map((routeItem) => ({
          coords: routeItem.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          durationMin: Math.max(1, Math.round(routeItem.duration / 60)),
          distanceKm: Math.max(1, Math.round(routeItem.distance / 1000)),
          steps:
            routeItem.legs?.[0]?.steps?.map((step) => step.maneuver?.instruction || step.name || "Continue straight") ?? []
        })) ?? [];

      if (!parsedRoutes.length) {
        setStatusMessage("No route found from routing engine");
        throw new Error("OSRM route not found");
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRoutes(parsedRoutes);
      setActiveRoute(0);
      setTurnSteps(parsedRoutes[0].steps);
      setEtaMinutes(parsedRoutes[0].durationMin);
      setRoute(null);
      setRouteFocusToken((value) => value + 1);
      bumpEco(16, 0.35);
      setStatusMessage(`Route ready: ${parsedRoutes[0].durationMin} min • ${parsedRoutes[0].distanceKm} km`);
      emitStory("coba", "route");
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRoutes([]);
      setDisplayRoute([]);
      setTurnSteps([]);
      setStatusMessage("Routing engine unavailable");
    } finally {
      if (requestId === requestIdRef.current) {
        setRouteLoading(false);
      }
    }
  }

  function handleDrawRoute() {
    void requestOsrmRoutes();
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

    setReport("");
    setReportSent(true);
    setStatusMessage("Report sent successfully");
    window.setTimeout(() => setReportSent(false), 2000);
  }

  return (
    <main className="platformShell pt-safe pb-safe">
      <MapView
        slots={slots}
        layers={layers}
        selectedSlotId={selectedSlot?.id ?? null}
        userLocation={userLocation}
        routeFocusToken={routeFocusToken}
        routeSegments={routeSegments}
        routePath={displayRoute.length > 0 ? displayRoute : routePath}
        routeOpacity={fadingRoute ? 0 : 1}
        onSlotClick={(slot) => {
          if (abortRef.current) {
            abortRef.current.abort();
          }
          setSelectedSlot(slot);
          setRoutes([]);
          setDisplayRoute([]);
          setTurnSteps([]);
          setEtaMinutes(null);
          setRoute(null);
          setFadingRoute(false);
          setRouteLoading(false);
          const soonFree = !slot.available && (slot.soon || (slot.predictedFreeMin ?? 99) <= 10);
          const state = slot.available ? "available" : soonFree ? `free in ~${slot.predictedFreeMin ?? 8} min` : "full";
          setStatusMessage(`S${slot.id} ${state}`);
          emitStoryForSlot(slot, pickCharacterForSlot(slot), slotStoryContext(slot));
        }}
      />

      {routeLoading ? (
        <div className="topLoadingBar" data-testid="route-loading-bar">
          <span />
        </div>
      ) : null}

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
        etaMinutes={etaMinutes}
        finding={finding}
        routeLoading={routeLoading}
        reportSent={reportSent}
        report={report}
        onReportChange={setReport}
        onSubmitReport={submitReport}
        onFindNearest={handleFindNearest}
        onDrawRoute={handleDrawRoute}
      />

      <SlotMiniDashboard slot={selectedSlot} onNavigate={handleDrawRoute} onOpenLiveView={openSelectedLiveView} routeLoading={routeLoading} />

      {routeLoading ? <div className="routeLoadingBanner">Finding best route...</div> : null}

      {story ? (
        <div className="storyBubble" data-testid="story-bubble">
          <span className="storyIcon" aria-hidden>{storyIcon[story.character]}</span>
          <p>{story.text}</p>
        </div>
      ) : null}

      {routes.length > 0 ? (
        <div className="routeOptionsBar" data-testid="route-options">
          {routes.map((option, index) => {
            const ecoIndex = routes.reduce((best, item, idx) => (item.distanceKm < routes[best].distanceKm ? idx : best), 0);
            const active = index === activeRoute;

            return (
              <button
                key={`${option.durationMin}-${option.distanceKm}-${index}`}
                className={`routeOptionItem ${active ? "active" : ""}`}
                disabled={routeLoading}
                onClick={() => {
                  setActiveRoute(index);
                  setTurnSteps(option.steps);
                  setEtaMinutes(option.durationMin);
                  setRouteFocusToken((value) => value + 1);
                }}
              >
                {option.durationMin} min • {option.distanceKm} km {index === ecoIndex ? "🌱" : ""}
              </button>
            );
          })}
        </div>
      ) : null}

      {turnSteps.length > 0 ? (
        <aside className="directionsPanel" data-testid="turn-directions">
          <h3>Directions</h3>
          <ul>
            {turnSteps.map((step, index) => (
              <li key={`${step}-${index}`}>• {step}</li>
            ))}
          </ul>
        </aside>
      ) : null}

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
                      emitStoryForSlot(slot, "youth", "inspect");
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
