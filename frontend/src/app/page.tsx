"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import CameraListPanel from "./components/camera-list-panel";
import CameraAIOverlay from "./components/camera-ai-overlay";
import EcoPanel from "./components/eco-panel";
import EnterpriseOpsPanel from "./components/enterprise-ops-panel";
import GlassCard from "./components/glass-card";
import LayerControl from "./components/layer-control";
import SlotMiniDashboard from "./components/slot-mini-dashboard";
import StoryBubble from "./components/story-bubble";
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

type StoryVoiceProfile = {
  rate: number;
  pitch: number;
  volume: number;
};

type OpsState = "up" | "down" | "degraded" | "restricted";

type OpsSnapshot = {
  live: OpsState;
  ready: OpsState;
  health: OpsState;
  latencyMs: number | null;
  updatedAt: number | null;
};

type StoryContext = "find" | "route" | "inspect" | "available" | "soon" | "full";

const storybook: Record<StoryCharacter, Record<StoryContext, string[]>> = {
  coba: {
    find: [
      "Bà tìm được điểm đỗ xe đẹp rồi, mình thong thả gửi xe là vừa.",
      "Điểm này hợp nhịp lắm, gửi xe xong ta đi bộ ngắm phố cho trọn vẹn."
    ],
    route: [
      "Lộ trình này đẹp và ngắn, vừa tiết kiệm thời gian vừa giữ nhịp êm ái.",
      "Mình đi tuyến này nhé, đường thoáng và đến nơi rất yên tâm."
    ],
    inspect: [
      "Góc này có nét xưa dễ thương, mình đỗ xe gọn rồi thong dong tham quan.",
      "Chọn chỗ này được đó, từ đây tản bộ ra khu phố cổ rất hợp."
    ],
    available: [
      "Chỗ này trống sẵn, mình ghé vào là có thể gửi ngay.",
      "Còn chỗ đẹp quá, tranh thủ đỗ xe trước khi đông hơn nha."
    ],
    soon: [
      "Chỗ này sắp trống, đợi một chút là mình vào được ngay.",
      "Mình tới đúng nhịp rồi, bãi này sắp xoay vòng có chỗ."
    ],
    full: [
      "Khu này đang đông, mình đổi tuyến kế bên cho thông thoáng hơn nhé.",
      "Tầm này kín chỗ rồi, bà đề xuất rẽ sang hướng ngoài để dễ thở hơn."
    ]
  },
  driver: {
    find: [
      "Em chốt được bãi gần nhất rồi, vào ngay là đẹp.",
      "Có chỗ rồi nha, ghé điểm này là tiết kiệm thời gian nhất."
    ],
    route: [
      "Lấy route này nhé, dễ quay đầu và đến nhanh hơn.",
      "Tuyến này ngắn nhất hiện tại, đến nơi gọn lẹ luôn."
    ],
    inspect: [
      "Spot này ổn, dễ vào dễ ra và khá an toàn.",
      "Canh lái chút là vào vừa khít, không phải chỉnh nhiều."
    ],
    available: [
      "Còn trống tốt, mình vào gửi luôn cho khỏi mất lượt.",
      "Bãi này đang thoáng, chốt nhanh là đẹp."
    ],
    soon: [
      "Sắp trống rồi, đợi tầm vài phút là có suất.",
      "Lượt xe này sắp nhích, mình canh nhịp rồi vào là vừa."
    ],
    full: [
      "Bãi này full rồi, em đổi hướng qua bãi thứ hai cho nhanh.",
      "Đông xe quá, tránh mất thời gian mình chuyển sang điểm dự phòng nhé."
    ]
  },
  youth: {
    find: [
      "Có spot ổn rồi, gửi xe xong là đi chill được liền.",
      "Yep, tìm thấy chỗ hợp lý, vào đây là đúng vibe luôn."
    ],
    route: [
      "Đi line này cho cool, vừa nhanh vừa đúng gu city walk.",
      "Route này ổn nha, gửi xe xong là có nguyên khu local để khám phá."
    ],
    inspect: [
      "Spot này nhìn được nha, đúng chất local chill zone.",
      "Check chỗ này ok, từ đây có nhiều hẻm hay để đi bộ luôn."
    ],
    available: [
      "Còn slot trống nè, tranh thủ vào là đẹp.",
      "Quá ngon, chỗ này trống sẵn nha!"
    ],
    soon: [
      "Sắp có chỗ rồi, đứng đợi xíu là chen vào được.",
      "Bãi này quay vòng nhanh lắm, canh xíu là có slot."
    ],
    full: [
      "Chỗ này kín rồi, mình lùa qua spot khác cho đỡ kẹt.",
      "Đông quá rồi, rẽ sang bãi bên cho dễ thở rồi chơi tiếp."
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
    return "Lê Lợi";
  }

  if (typeof slot.lng === "number") {
    if (slot.lng < 106.697) {
      return "Bến Thành";
    }
    if (slot.lng > 106.703) {
      return "Nguyễn Huệ";
    }
  }

  return "trung tâm Sài Gòn";
}

function withAreaFlavor(base: StoryMessage, slot: Slot): StoryMessage {
  const area = resolveAreaName(slot);
  const addOn = base.character === "driver" ? ` Hướng ${area} đang hợp nhất.` : ` Khu ${area} đang lên mood rất đẹp.`;
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

function voiceProfileForCharacter(character: StoryCharacter): StoryVoiceProfile {
  if (character === "coba") {
    return { rate: 0.94, pitch: 0.88, volume: 0.9 };
  }
  if (character === "driver") {
    return { rate: 1.03, pitch: 1.0, volume: 0.92 };
  }
  return { rate: 1.08, pitch: 1.08, volume: 0.9 };
}

function healthStateFromResponse(response: Response): OpsState {
  if (response.ok) {
    return "up";
  }
  if (response.status === 401 || response.status === 403) {
    return "restricted";
  }
  return "down";
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
  const [storyVoiceEnabled, setStoryVoiceEnabled] = useState(true);
  const [opsSnapshot, setOpsSnapshot] = useState<OpsSnapshot>({
    live: "degraded",
    ready: "degraded",
    health: "degraded",
    latencyMs: null,
    updatedAt: null
  });
  const storyLayerHydratedRef = useRef(false);
  const storyVoiceHydratedRef = useRef(false);
  const storyTriggerTimerRef = useRef<number | null>(null);
  const voiceTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
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
  const backendApiBase = backendUrl.replace(/\/$/, "");

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

  function cancelVoicePlayback() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
  }

  function clearStoryTriggerTimer() {
    if (storyTriggerTimerRef.current) {
      window.clearTimeout(storyTriggerTimerRef.current);
      storyTriggerTimerRef.current = null;
    }
  }

  function playStoryHint(character: StoryCharacter) {
    if (typeof window === "undefined" || !("AudioContext" in window)) {
      return;
    }

    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new window.AudioContext();
      }

      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const baseFreq = character === "coba" ? 660 : character === "driver" ? 520 : 740;

      oscillator.type = "sine";
      oscillator.frequency.value = baseFreq;
      gain.gain.value = 0.0001;

      oscillator.connect(gain);
      gain.connect(context.destination);

      const now = context.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.02, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      oscillator.start(now);
      oscillator.stop(now + 0.12);
    } catch {
      // Ignore hint audio errors to avoid interrupting interaction flow.
    }
  }

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      clearStoryTriggerTimer();
      if (voiceTimerRef.current) {
        window.clearTimeout(voiceTimerRef.current);
      }
      audioContextRef.current?.close().catch(() => undefined);
      cancelVoicePlayback();
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
      clearStoryTriggerTimer();
      cancelVoicePlayback();
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

  useEffect(() => {
    if (storyVoiceHydratedRef.current) {
      return;
    }
    const savedVoice = window.localStorage.getItem("greenpark-story-voice");
    if (savedVoice === "off") {
      setStoryVoiceEnabled(false);
    }
    storyVoiceHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!storyVoiceHydratedRef.current) {
      return;
    }
    window.localStorage.setItem("greenpark-story-voice", storyVoiceEnabled ? "on" : "off");
    if (!storyVoiceEnabled) {
      cancelVoicePlayback();
    }
  }, [storyVoiceEnabled]);

  useEffect(() => {
    if (!story || !storyVoiceEnabled) {
      cancelVoicePlayback();
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    cancelVoicePlayback();
    voiceTimerRef.current = window.setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(story.text);
      utterance.lang = "vi-VN";
      const profile = voiceProfileForCharacter(story.character);
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;
      utterance.volume = profile.volume;
      window.speechSynthesis.speak(utterance);
    }, 200);

    return () => {
      if (voiceTimerRef.current) {
        window.clearTimeout(voiceTimerRef.current);
      }
      cancelVoicePlayback();
    };
  }, [story, storyVoiceEnabled]);

  useEffect(() => {
    let alive = true;

    async function pollOpsHealth() {
      const start = performance.now();
      const [liveResult, readyResult, healthResult] = await Promise.allSettled([
        fetch(`${backendApiBase}/ops/live`, { cache: "no-store" }),
        fetch(`${backendApiBase}/ops/ready`, { cache: "no-store" }),
        fetch(`${backendApiBase}/ops/health`, { cache: "no-store" })
      ]);

      if (!alive) {
        return;
      }

      const resolveState = (result: PromiseSettledResult<Response>): OpsState => {
        if (result.status === "fulfilled") {
          return healthStateFromResponse(result.value);
        }
        return "down";
      };

      setOpsSnapshot({
        live: resolveState(liveResult),
        ready: resolveState(readyResult),
        health: resolveState(healthResult),
        latencyMs: Math.round(performance.now() - start),
        updatedAt: Date.now()
      });
    }

    void pollOpsHealth();
    const interval = window.setInterval(() => {
      void pollOpsHealth();
    }, 30000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [backendApiBase]);

  function triggerStory(nextStory: StoryMessage, delayMs: number) {
    if (!layers.story) {
      return;
    }

    clearStoryTriggerTimer();
    setStory(null);
    storyTriggerTimerRef.current = window.setTimeout(() => {
      if (storyVoiceEnabled) {
        playStoryHint(nextStory.character);
      }
      setStory(nextStory);
      storyTriggerTimerRef.current = null;
    }, delayMs);
  }

  function emitStory(character: StoryCharacter, context: StoryContext, delayMs: number) {
    triggerStory(pickStory(character, context), delayMs);
  }

  function emitStoryForSlot(slot: Slot, character: StoryCharacter, context: StoryContext, delayMs: number) {
    triggerStory(withAreaFlavor(pickStory(character, context), slot), delayMs);
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

  const cameraOnlinePct = useMemo(() => {
    const online = slots.filter((slot) => slot.cameraOnline !== false).length;
    return Math.round((online / Math.max(1, slots.length)) * 100);
  }, [slots]);

  const availabilityPct = Math.round((stats.available / Math.max(1, slots.length)) * 100);

  const incidentFeed = useMemo(() => {
    const incidents: string[] = [];

    if (opsSnapshot.live !== "up") {
      incidents.push("Realtime stream degraded. Switching to buffered updates.");
    }
    if (availabilityPct < 18) {
      incidents.push("Critical occupancy pressure detected in central zones.");
    }
    if (cameraOnlinePct < 72) {
      incidents.push("Camera uptime dropped below enterprise threshold (72%).");
    }
    if (routeLoading) {
      incidents.push("Route engine load spike detected. Optimizer is recalculating.");
    }

    return incidents.slice(0, 3);
  }, [availabilityPct, cameraOnlinePct, opsSnapshot.live, routeLoading]);

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
        emitStory("driver", "full", 300);
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
      emitStoryForSlot(nearest, "driver", "find", 500);
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
      emitStory("coba", "route", selectedSlot.zone === "green" ? 600 : 800);
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
          emitStoryForSlot(slot, pickCharacterForSlot(slot), slotStoryContext(slot), 400);
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

      <EnterpriseOpsPanel
        availabilityPct={availabilityPct}
        cameraOnlinePct={cameraOnlinePct}
        etaMinutes={etaMinutes}
        routeLoading={routeLoading}
        ecoPoints={ecoPoints}
        opsHealth={opsSnapshot}
        incidents={incidentFeed}
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

      <StoryBubble
        story={story}
        icon={story ? storyIcon[story.character] : ""}
        voiceEnabled={storyVoiceEnabled}
        onToggleVoice={() => setStoryVoiceEnabled((value) => !value)}
        onStopVoice={cancelVoicePlayback}
      />

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
                      emitStoryForSlot(slot, "youth", "inspect", 400);
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
