"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import CameraListPanel from "./components/camera-list-panel";
import CameraAIOverlay from "./components/camera-ai-overlay";
import DestinationJourneyPanel from "./components/destination-journey-panel";
import EnterpriseOpsPanel, { AdminMode } from "./components/enterprise-ops-panel";
import GlassCard from "./components/glass-card";
import { useJourney } from "./components/JourneyContext";
import LayerControl from "./components/layer-control";
import OnboardingFlow from "./components/onboarding-flow";
import JourneyStoryboard from "./components/journey-storyboard";
import PlaceStoryCard from "./components/place-story-card";
import SlotMiniDashboard from "./components/slot-mini-dashboard";
import StoryBubble from "./components/story-bubble";
import TopBar from "./components/top-bar";
import { Slot, SlotDiff, ZonePoint } from "./components/types";
import { CityState, EngineStep, RouteType, VoiceType, getSuggestion } from "./engine/cityEngine";
import { inferPersona } from "./engine/personaEngine";
import { findBestSlot, generateRoute } from "./engine/routing";
import { getStory } from "./engine/storytelling";
import {
  buildDestinationIntelligence,
  generateAdaptiveStory,
  type DestinationIntelligence,
  type NarrativeContext,
  type Persona,
  type PlaceData
} from "./engine/place-narrative";
import { destinations, type Destination } from "./data/destinations";
import {
  buildCampaignMissions,
  buildJourneySummary,
  buildJourneyVisit,
  buildPersonaDebate,
  type JourneyVisit,
  type PersonaDebateLine
} from "./engine/journey-mode";
import { rewardTransport, type TransportType } from "./lib/scoreEngine";
import { estimateEtaMinutes, predictCrowd, type CrowdPrediction } from "./lib/predictive-flow-engine";
import { AIPlace, useAICity } from "./engine/useAICity";
import { useCityEngine } from "./engine/useCityEngine";
import { useDebouncedValue } from "./hooks/use-debounced-value";
import { useNavigation } from "./navigation/useNavigation";
import { useMapStore } from "./store/use-map-store";
import GuideHub, { PersonaKey, personas } from "./components/guide-hub";
import DestinationCard, { DestinationCardData } from "./components/destination-card";
import { destinationsData } from "./data/destinations-data";

const MapView = dynamic(() => import("./components/map-view"), { ssr: false });

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api/v1";
const backendWsUrl = backendUrl.replace(/\/api\/v1\/?$/, "");
const cameraStreamUrl = process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || "http://localhost:8000/stream.m3u8";
const userLocation: [number, number] = [10.772, 106.698];
const onboardingStorageKey = "saigongreen.onboarding.v1";

type RouteOption = {
  coords: Array<[number, number]>;
  durationMin: number;
  smartEtaMin: number;
  etaMin?: number;
  etaMax?: number;
  traffic?: StreamTraffic;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  reason?: string[];
  penaltyScore: number;
  distanceKm: number;
  steps: string[];
};

type RouteSegment = {
  positions: Array<[number, number]>;
  color: string;
};

type StoryCharacter = PersonaKey; // "coba" | "chutai" | "ut"

type StoryMessage = {
  character: StoryCharacter;
  text: string;
};

type StoryVoiceProfile = {
  rate: number;
  pitch: number;
  volume: number;
};

type SystemState = "healthy" | "degraded" | "down";

type OpsMetrics = {
  rtt: number;
  uptime: number;
  availability: number;
};

type OpsIncident = {
  id: string;
  severity: "SEV1" | "SEV2" | "SEV3";
  message: string;
  source: string;
  status: "investigating" | "resolved";
  detectedAt: number;
};

type StreamTraffic = "LOW" | "MEDIUM" | "HIGH";

type ParkingStreamPayload = {
  event: "CITY_TICK";
  timestamp: string;
  slots: Slot[];
  metrics: {
    availability: number;
    traffic: StreamTraffic;
    apiLatency: number;
    uptime: number;
    co2ReductionKg: number;
  };
  incidents: Array<{
    id: string;
    level: "critical" | "warning" | "info";
    message: string;
    source: string;
    createdAt: string;
  }>;
  cameras: Array<{
    id: string;
    status: "online" | "offline";
  }>;
};

type StoryContext = "find" | "route" | "inspect" | "available" | "soon" | "full";
type GuideMotionFrame = "idle" | "up" | "down";
type GuideLandmark = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
};
type LandmarkJourney = {
  guide: StoryCharacter;
  name: string;
  description: string;
  distanceKm: number;
  etaMin: number;
};

type LandmarkPreview = {
  guide: StoryCharacter;
  landmark: GuideLandmark;
};

type GuideProfile = {
  label: string;
  vibe: string;
  routeBias: "Nhanh" | "Xanh" | "Cân bằng";
  theme: string;
  places: string[];
  parkingStrategy: string;
  intro: string;
};

const guideProfiles: Record<StoryCharacter, GuideProfile> = {
  chutai: {
    label: "Tài xế",
    vibe: "Nhanh, quyết, thực dụng",
    routeBias: "Nhanh",
    theme: "Đời thường bản địa",
    places: ["Công viên 23/9", "Nhà Văn hóa Thanh Niên", "Công viên Lê Văn Tám"],
    parkingStrategy: "Ưu tiên bãi gần trục đông người, vào ra nhanh",
    intro: "Dẫn bạn đến các điểm đời sống bản địa, dễ hòa vào nhịp sống thành phố."
  },
  coba: {
    label: "Cô Ba",
    vibe: "Ấm, chậm, xanh",
    routeBias: "Xanh",
    theme: "Tham quan lịch sử",
    places: ["Bảo tàng Chứng tích Chiến tranh", "Bảo tàng TP.HCM", "Dinh Độc Lập"],
    parkingStrategy: "Ưu tiên bãi xanh và đi bộ 200-400m để thoáng khu trung tâm",
    intro: "Dẫn bạn đi các điểm lịch sử tiêu biểu vì Sài Gòn chứng kiến nhiều cột mốc quan trọng."
  },
  ut: {
    label: "Thanh niên",
    vibe: "Khám phá, local, cân bằng",
    routeBias: "Cân bằng",
    theme: "Khám phá local ít người biết",
    places: ["Quán cà phê hẻm Cô Giang", "Tiệm ăn local khu Bàn Cờ", "Rooftop nhỏ khu Nguyễn Trãi"],
    parkingStrategy: "Ưu tiên bãi rìa khu hẻm để khám phá đi bộ thuận tiện",
    intro: "Dẫn bạn săn quán local ít review, thiên về trải nghiệm và khám phá."
  }
};

const guideLandmarks: Record<StoryCharacter, GuideLandmark[]> = {
  coba: [
    {
      id: "coba-war-remnants",
      name: "Bảo tàng Chứng tích Chiến tranh",
      description: "Không gian tư liệu về các giai đoạn chiến tranh, giúp hiểu bối cảnh lịch sử đô thị Sài Gòn.",
      lat: 10.7798,
      lng: 106.6922
    },
    {
      id: "coba-city-museum",
      name: "Bảo tàng TP.HCM",
      description: "Nơi lưu giữ nhiều hiện vật về quá trình hình thành và phát triển của thành phố.",
      lat: 10.7765,
      lng: 106.7011
    },
    {
      id: "coba-reunification",
      name: "Dinh Độc Lập",
      description: "Biểu tượng quan trọng của lịch sử hiện đại Việt Nam, phù hợp cho tuyến tham quan chiều sâu.",
      lat: 10.7781,
      lng: 106.6953
    }
  ],
  chutai: [
    {
      id: "driver-park-239",
      name: "Công viên 23/9",
      description: "Điểm sinh hoạt phổ biến, gần nhiều tuyến xe và khu thương mại đời thường.",
      lat: 10.7689,
      lng: 106.6937
    },
    {
      id: "driver-youth-house",
      name: "Nhà Văn hóa Thanh Niên",
      description: "Không gian cộng đồng quen thuộc, dễ bắt nhịp đời sống bản địa.",
      lat: 10.7834,
      lng: 106.7008
    },
    {
      id: "driver-le-van-tam",
      name: "Công viên Lê Văn Tám",
      description: "Địa điểm sinh hoạt và vận động thường nhật, phù hợp trải nghiệm nhịp sống dân cư.",
      lat: 10.7862,
      lng: 106.6977
    }
  ],
  ut: [
    {
      id: "youth-co-giang",
      name: "Cà phê hẻm Cô Giang",
      description: "Góc local ít quảng bá, phù hợp khám phá trải nghiệm chân thực.",
      lat: 10.7642,
      lng: 106.6923
    },
    {
      id: "youth-ban-co",
      name: "Tiệm ăn local khu Bàn Cờ",
      description: "Khu ăn uống bản địa đậm chất dân cư, nhiều món ít người review.",
      lat: 10.7729,
      lng: 106.6821
    },
    {
      id: "youth-nguyen-trai-rooftop",
      name: "Rooftop nhỏ khu Nguyễn Trãi",
      description: "Điểm nhìn thành phố theo góc local, thiên về trải nghiệm khám phá.",
      lat: 10.7666,
      lng: 106.6846
    }
  ]
};

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
  chutai: {
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
  ut: {
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
  chutai: "🚕",
  ut: "🧢"
};

const guideMotionImageMap: Record<StoryCharacter, Record<GuideMotionFrame, string>> = {
  chutai: {
    idle: "/guides/driver-idle.svg",
    up: "/guides/driver-up.svg",
    down: "/guides/driver-down.svg"
  },
  coba: {
    idle: "/guides/coba1.png",
    up: "/guides/coba2.png",
    down: "/guides/coba3.png"
  },
  ut: {
    idle: "/guides/youth-idle.svg",
    up: "/guides/youth-up.svg",
    down: "/guides/youth-down.svg"
  }
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
  const addOn = base.character === "chutai" ? ` Hướng ${area} đang hợp nhất.` : ` Khu ${area} đang lên mood rất đẹp.`;
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
    return "chutai";
  }
  return "ut";
}

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function calcDistanceKm(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

function speedByTraffic(traffic: StreamTraffic): number {
  if (traffic === "HIGH") {
    return 12;
  }
  if (traffic === "MEDIUM") {
    return 22;
  }
  return 35;
}

function getDirection(from: [number, number], to: [number, number]): string {
  if (Math.abs(to[0] - from[0]) > Math.abs(to[1] - from[1])) {
    return to[0] > from[0] ? "⬆️ Đi thẳng" : "⬇️ Đi xuống";
  }

  return to[1] > from[1] ? "➡️ Rẽ phải" : "⬅️ Rẽ trái";
}

function interpolatePoint(p1: [number, number], p2: [number, number], t: number): [number, number] {
  return [
    p1[0] + (p2[0] - p1[0]) * t,
    p1[1] + (p2[1] - p1[1]) * t
  ];
}

function voiceProfileForCharacter(character: StoryCharacter): StoryVoiceProfile {
  if (character === "coba") {
    return { rate: 0.94, pitch: 0.88, volume: 0.9 };
  }
    if (character === "chutai") {
      return { rate: 1.03, pitch: 1.0, volume: 0.92 };
    }
  return { rate: 1.08, pitch: 1.08, volume: 0.9 };
}

function voiceProfileForType(voice: VoiceType): StoryVoiceProfile {
  if (voice === "coba") {
    return { rate: 0.9, pitch: 1.2, volume: 0.9 };
  }
    if (voice === "driver") {
      return { rate: 1.15, pitch: 1.05, volume: 0.92 };
    }
  return { rate: 1, pitch: 1, volume: 0.9 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getTimeFactor(): number {
  const hour = new Date().getHours();
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    return 0.35;
  }
  return 0.72;
}

function getZoneType(availability: number): ZonePoint["type"] {
  if (availability > 70) {
    return "green";
  }
  if (availability > 40) {
    return "yellow";
  }
  return "red";
}

function pointDistance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function scoreRoute(routeCoords: Array<[number, number]>, zones: ZonePoint[]): number {
  let penalty = 0;

  for (const point of routeCoords) {
    for (const zone of zones) {
      const d = pointDistance(point, [zone.lat, zone.lng]);
      if (d < 0.0026) {
        if (zone.type === "red") {
          penalty += 10;
        } else if (zone.type === "yellow") {
          penalty += 4;
        }
      }
    }
  }

  return penalty;
}

function smartEta(baseTime: number, penalty: number): number {
  return Math.max(1, Math.round(baseTime + penalty * 0.2));
}

function predictAvailability(current: number): number {
  return Number(clamp(current + (Math.random() - 0.5) * 15, 0, 100).toFixed(0));
}

function personaToGuide(persona: "COBA" | "DRIVER" | "YOUTH"): StoryCharacter {
  if (persona === "DRIVER") {
    return "chutai"; // Local expert maps to driver
  }
  if (persona === "YOUTH") {
    return "ut"; // Hidden gems maps to youth
  }
  return "coba";
}

function personaToUpper(persona: StoryCharacter): Persona {
  return persona === "chutai" ? "DRIVER" : persona === "ut" ? "YOUTH" : "COBA";
}

function timeLabelNow(): string {
  return new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findDestinationByName(name: string): Destination | null {
  const normalizedName = normalizeText(name);

  return (
    destinations.find((item) => {
      const candidate = normalizeText(item.name);
      return candidate.includes(normalizedName) || normalizedName.includes(candidate);
    }) ?? null
  );
}

function personaLabelFromId(persona: "coba" | "driver" | "youth" | "chutai" | "ut" | null): string {
  if (persona === "driver" || persona === "chutai") {
    return "Chu Tai";
  }
  if (persona === "youth" || persona === "ut") {
    return "Ut";
  }
  return "Co Ba";
}

export default function Home() {
  const [adminMode, setAdminMode] = useState<AdminMode>("closed");
  const [adminWidth, setAdminWidth] = useState(340);
  const [adminResizing, setAdminResizing] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [cameraOffline, setCameraOffline] = useState(false);
  const [trafficLevel, setTrafficLevel] = useState<StreamTraffic>("LOW");
  const [behaviorHint, setBehaviorHint] = useState<string>("");
  const [routeFocusToken, setRouteFocusToken] = useState(0);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [activeRoute, setActiveRoute] = useState(0);
  const [turnSteps, setTurnSteps] = useState<string[]>([]);
  const [displayRoute, setDisplayRoute] = useState<Array<[number, number]>>([]);
  const [fadingRoute, setFadingRoute] = useState(false);
  const [finding, setFinding] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [story, setStory] = useState<StoryMessage | null>(null);
  const [zones, setZones] = useState<ZonePoint[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: userLocation[0], lng: userLocation[1] });
  const [predictedAvailabilityPct, setPredictedAvailabilityPct] = useState<number | null>(null);
  const [storyVoiceEnabled, setStoryVoiceEnabled] = useState(true);
  const [systemState, setSystemState] = useState<SystemState>("healthy");
  const [opsMetrics, setOpsMetrics] = useState<OpsMetrics>({
    rtt: 120,
    uptime: 99.2,
    availability: 65
  });
  const [opsUpdatedAt, setOpsUpdatedAt] = useState<number>(Date.now());
  const [opsIncidents, setOpsIncidents] = useState<OpsIncident[]>([]);
  const [hasRealtimeStream, setHasRealtimeStream] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [carPosition, setCarPosition] = useState<[number, number] | null>(null);
  const [carAngle, setCarAngle] = useState(0);
  const [routeIndex, setRouteIndex] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [distanceLeftKm, setDistanceLeftKm] = useState(0);
  const [navigationActive, setNavigationActive] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [cityMood, setCityMood] = useState<"CALM" | "CHAOTIC" | "STRESSED">("CALM");
  const [cityNarration, setCityNarration] = useState("");
  const [selectedDebate, setSelectedDebate] = useState<PersonaKey>("coba");
  const [memoryHint, setMemoryHint] = useState("");
  const [moralFeedback, setMoralFeedback] = useState("");
  const [centerPressure, setCenterPressure] = useState(0);
  const [cityEvent, setCityEvent] = useState("");
  const [intentHint, setIntentHint] = useState("");
  const [cinematicMode, setCinematicMode] = useState(false);
  const [routeConfidence, setRouteConfidence] = useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [engineRouteType, setEngineRouteType] = useState<RouteType>("balanced");
  const [engineVoice, setEngineVoice] = useState<VoiceType>("neutral");
  const [uiMode, setUiMode] = useState<"compact" | "relaxed">("relaxed");
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [cityTone, setCityTone] = useState("#5DFF34");
  const [autoPilot, setAutoPilot] = useState(false);
  const [guideMotionFrame, setGuideMotionFrame] = useState<GuideMotionFrame>("idle");
  const [guideSubtitle, setGuideSubtitle] = useState("Mình đang sẵn sàng dẫn bạn đi.");
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);
  const [landmarkJourney, setLandmarkJourney] = useState<LandmarkJourney | null>(null);
  const [landmarkPreview, setLandmarkPreview] = useState<LandmarkPreview | null>(null);
  const [guidePanelMinimized, setGuidePanelMinimized] = useState(true);
  const [journeyDrawerOpen, setJourneyDrawerOpen] = useState(true);
  const [showJourneyHistory, setShowJourneyHistory] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceData | null>(null);
  const [showPlaceNarrative, setShowPlaceNarrative] = useState(false);
  const [placeScript, setPlaceScript] = useState<string[]>([]);
  const [placePersona, setPlacePersona] = useState<PersonaKey>("coba");
  const [destinationProfile, setDestinationProfile] = useState<DestinationIntelligence | null>(null);
  const [journeyVisits, setJourneyVisits] = useState<JourneyVisit[]>([]);
  const [personaDebateLines, setPersonaDebateLines] = useState<PersonaDebateLine[]>([]);
  const [placeLibrary, setPlaceLibrary] = useState<PlaceData[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [destinationTransport, setDestinationTransport] = useState<TransportType | null>(null);
  const [predictiveForecast, setPredictiveForecast] = useState<CrowdPrediction | null>(null);
  const [pitchRunning, setPitchRunning] = useState(false);
  const [pitchStepIndex, setPitchStepIndex] = useState(0);
  const zoneRegenerationTokenRef = useRef(0);
  const storyLayerHydratedRef = useRef(false);
  const storyVoiceHydratedRef = useRef(false);
  const storyTriggerTimerRef = useRef<number | null>(null);
  const voiceTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const lastFindTriggerRef = useRef(0);
  const routeBusyRef = useRef(false);
  const cinematicTimerRef = useRef<number | null>(null);
  const nextEngineActionRef = useRef(0);
  const guideMotionTimerRef = useRef<number | null>(null);
  const adminResizeStartXRef = useRef(0);
  const adminResizeStartWidthRef = useRef(340);
  const visitedPlacesRef = useRef<Set<number>>(new Set());
  const cameraStateRef = useRef<Record<string, boolean>>({});
  const lastCameraNarrationAtRef = useRef(0);

  const {
    greenScore: journeyGreenScore,
    visitedDestinations,
    unlockedSecrets,
    completedChallenges,
    transportUsed,
    selectedPersona,
    selectedTransport,
    journeyGoal,
    rank,
    visitDestination,
    completeChallenge,
    useTransport,
    unlockDestination,
    unlockSecretRoute,
    setPersona,
    setInitialTransport,
    setJourneyGoal
  } = useJourney();

  const {
    slots: aiSlots,
    traffic: aiTrafficZones,
    camera: aiCameraSlots,
    places: aiPlaces,
    evStations,
    bikeParking
  } = useAICity();

  useEffect(() => {
    fetch("/data/places-full.json")
      .then((response) => response.json())
      .then((data: PlaceData[]) => setPlaceLibrary(Array.isArray(data) ? data : []))
      .catch(() => setPlaceLibrary([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onboardingFinished = window.localStorage.getItem(onboardingStorageKey) === "1";
    const hasSavedJourney = Boolean(selectedPersona && selectedTransport);
    setShowOnboarding(!(onboardingFinished || hasSavedJourney));
    if (selectedPersona && selectedTransport) {
      const personaMap: Record<string, PersonaKey> = {
        "coba": "coba",
        "driver": "chutai",
        "youth": "ut"
      };
      const newPersona: PersonaKey = personaMap[selectedPersona] || "coba";
      setSelectedDebate(newPersona);
      setDestinationTransport(selectedTransport);
    }
    setOnboardingReady(true);
  }, [selectedPersona, selectedTransport]);

  const {
    slots,
    query,
    profileName,
    layers,
    co2SavedKg,
    route,
    ecoLevel,
    ecoPoints,
    statusMessage,
    selectedSlot,
    setQuery,
    setProfileName,
    setRoute,
    setStatusMessage,
    setSelectedSlot,
    toggleLayer,
    bumpEco,
    mergeRealtimeSlots,
    applyRealtimeDiff
  } = useMapStore();

  const debouncedQuery = useDebouncedValue(query, 280);

  const activeRouteMeta = routes[activeRoute] ?? null;
  const activeGuide = guideProfiles[selectedDebate];
  const allGuideLandmarks = useMemo(
    () => (Object.keys(guideLandmarks) as StoryCharacter[]).flatMap((guide) => guideLandmarks[guide].map((item) => ({ ...item, guide }))),
    []
  );
  const guideParkingRecommendationsByGuide = useMemo(() => {
    const available = slots
      .filter((slot) => slot.available || slot.soon)
      .sort((a, b) => (a.distanceM ?? 9999) - (b.distanceM ?? 9999));

    return {
      coba: available
        .filter((slot) => slot.zone === "green")
        .slice(0, 3),
      chutai: available
        .filter((slot) => slot.zone === "standard" && (slot.distanceM ?? 9999) <= 320)
        .slice(0, 3),
      ut: available
        .filter((slot) => (slot.distanceM ?? 0) >= 180)
        .slice(0, 3)
    } as Record<StoryCharacter, Slot[]>;
  }, [slots]);
  const activeGuideParkingRecommendations = guideParkingRecommendationsByGuide[selectedDebate];

  const cityState = useMemo<CityState>(() => {
    const availabilityRatio = clamp(opsMetrics.availability / 100, 0, 1);
    const mood: CityState["mood"] =
      trafficLevel === "HIGH" || availabilityRatio < 0.28
        ? "CHAOTIC"
        : trafficLevel === "MEDIUM" || availabilityRatio < 0.45
          ? "STRESSED"
          : "CALM";

    const intent: CityState["intent"] =
      selectedDebate === "coba" || trafficLevel === "HIGH"
        ? "ECO"
        : "EXPLORE";

    return {
      traffic: trafficLevel,
      availability: availabilityRatio,
      mood,
      intent,
      hasSlot: Boolean(selectedSlot),
      hasRoute: routes.length > 0 || Boolean(route?.path?.length),
      navigating: navigationActive
    };
  }, [finding, navigationActive, opsMetrics.availability, route?.path?.length, routeLoading, routes.length, selectedDebate, selectedSlot, trafficLevel]);

  const activePersona = useMemo(() => inferPersona({ intent: cityState.intent }), [cityState.intent]);
  const activePersonaGuide = useMemo(() => personaToGuide(activePersona), [activePersona]);
  const journeySummary = useMemo(() => buildJourneySummary(journeyVisits), [journeyVisits]);
  const campaignMissions = useMemo(() => buildCampaignMissions(journeyVisits, cityMood), [cityMood, journeyVisits]);
  const executiveBrief = useMemo(() => {
    const totalJourneys = journeyVisits.length;
    const destinationCount = new Map<string, number>();
    for (const visit of journeyVisits) {
      destinationCount.set(visit.name, (destinationCount.get(visit.name) ?? 0) + 1);
    }

    const topDestinations = Array.from(destinationCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalTransport = Math.max(1, transportUsed.length);
    const walk = transportUsed.filter((item) => item === "walk").length;
    const ev = transportUsed.filter((item) => item === "ev").length;
    const bike = transportUsed.filter((item) => item === "bike").length;
    const motorbike = transportUsed.filter((item) => item === "motorbike").length;

    return {
      totalJourneys,
      topDestinations,
      carbonSavedKg: Number((co2SavedKg + journeySummary.totalCo2SavedKg).toFixed(1)),
      adoptionTrends: {
        walkPct: Math.round((walk / totalTransport) * 100),
        evPct: Math.round((ev / totalTransport) * 100),
        bikePct: Math.round((bike / totalTransport) * 100),
        motorbikePct: Math.round((motorbike / totalTransport) * 100)
      }
    };
  }, [co2SavedKg, journeySummary.totalCo2SavedKg, journeyVisits, transportUsed]);
  useEffect(() => {
    if (cityState.mood === "CHAOTIC") {
      setCityMood("CHAOTIC");
      setCityNarration("Thành phố đang hỗn loạn, ưu tiên điều hướng thích nghi.");
      return;
    }
    if (cityState.mood === "STRESSED") {
      setCityMood("STRESSED");
      setCityNarration("Thành phố đang căng thẳng, nên giảm áp lực trung tâm.");
      return;
    }
    setCityMood("CALM");
    setCityNarration("Thành phố đang êm, có thể ưu tiên hành trình xanh.");
  }, [cityState.mood]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const hour = new Date().getHours();
      const trend = cityMood === "CHAOTIC" ? 18 : cityMood === "STRESSED" ? 10 : 4;
      const forecast = predictCrowd(20, "clear", trend, "Ben Thanh Market", hour);
      setPredictiveForecast(forecast);

      if (forecast.densityIncreasePct >= 30 && selectedSlot) {
        setBehaviorHint(`⚠️ Trong ${forecast.nextMinutes} phút nữa quanh ${forecast.area} sẽ tăng mật độ ${forecast.densityIncreasePct}%. Nên reroute sớm.`);
      }
    }, 9000);

    return () => window.clearInterval(timer);
  }, [cityMood, selectedSlot]);

  useCityEngine({
    state: cityState,
    tickMs: 1000,
    onExperience: (exp) => {
      setEngineRouteType(exp.routeType);
      setEngineVoice(exp.voice);
      setUiMode(exp.uiMode);
      setAnimationSpeed(exp.animationSpeed);
      setCityTone(exp.color);
      setBehaviorHint(getSuggestion(cityState));
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--city-tone", exp.color);
        document.documentElement.style.setProperty("--als-speed", String(exp.animationSpeed));
      }
    },
    onStep: (step: EngineStep) => {
      if (!autoPilot || demoRunning) {
        return;
      }

      const now = Date.now();
      if (now - nextEngineActionRef.current < 1200) {
        return;
      }

      nextEngineActionRef.current = now;
      if (step === "find") {
        handleFindNearest();
      } else if (step === "route") {
        void requestOsrmRoutes();
      } else if (step === "navigate") {
        setNavigationActive(true);
      }
    }
  });

  useEffect(() => {
    const raw = window.localStorage.getItem("saigongreen-last-slot");
    if (!raw || slots.length === 0) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { slotId?: number };
      if (typeof parsed.slotId !== "number") {
        return;
      }

      const restored = slots.find((slot) => slot.id === parsed.slotId);
      if (restored) {
        setSelectedSlot(restored);
      }
    } catch {
      return;
    }
  }, [setSelectedSlot, slots]);

  useEffect(() => {
    if (!selectedSlot) {
      return;
    }

    window.localStorage.setItem(
      "saigongreen-last-slot",
      JSON.stringify({ slotId: selectedSlot.id, at: new Date().toISOString() })
    );
  }, [selectedSlot]);

  useEffect(() => {
    if (selectedSlot || routeLoading || finding) {
      setIntentHint("");
      return;
    }

    const timer = window.setTimeout(() => {
      setIntentHint("🧠 Bạn đang tìm chỗ đỗ xe phải không? Bấm Find để tôi hỗ trợ ngay.");
    }, 9000);

    return () => window.clearTimeout(timer);
  }, [selectedSlot, routeLoading, finding]);

  useEffect(() => {
    const events = [
      "🎉 Lễ hội trung tâm: mật độ xe tăng 18%",
      "🌧 Mưa nhẹ: nhu cầu đỗ xe tăng",
      "🚧 Một tuyến phố đóng tạm, ETA có thể tăng"
    ];

    const timer = window.setInterval(() => {
      if (Math.random() < 0.4) {
        const event = events[Math.floor(Math.random() * events.length)];
        setCityEvent(event);
        addLog(`City event: ${event}`);
      }
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!carPosition || aiPlaces.length === 0) {
      return;
    }

    const nearby = aiPlaces.find((place) => {
      if (visitedPlacesRef.current.has(place.id)) {
        return false;
      }

      const d = Math.hypot(place.lat - carPosition[0], place.lng - carPosition[1]);
      return d < 0.00125;
    });

    if (!nearby || nearby.persona !== activePersona) {
      return;
    }

    visitedPlacesRef.current.add(nearby.id);
    const guide = personaToGuide(nearby.persona);
    const text = getStory(nearby.persona, nearby);
    setSelectedDebate(guide);
    setGuideSubtitle(text);
    setStory({ character: guide, text });
    addLog(`Story trigger near ${nearby.name}`);
    speakText(text, guide);
  }, [activePersona, aiPlaces, carPosition]);

  useEffect(() => {
    if (aiCameraSlots.length === 0) {
      return;
    }

    const changed = aiCameraSlots.find((cam) => {
      const prev = cameraStateRef.current[cam.id];
      return typeof prev === "boolean" && prev !== cam.occupied;
    });

    for (const cam of aiCameraSlots) {
      cameraStateRef.current[cam.id] = cam.occupied;
    }

    if (!changed) {
      return;
    }

    const now = Date.now();
    if (now - lastCameraNarrationAtRef.current < 7000) {
      return;
    }

    lastCameraNarrationAtRef.current = now;
    if (changed.occupied) {
      const line = `Camera ${changed.id} báo khu này đầy rồi, mình né ra cho nhanh.`;
      setStory({ character: "chutai", text: line });
      speakText(line, "chutai");
      addLog(`Camera ${changed.id} detected occupied`);
      return;
    }

    const line = `Camera ${changed.id} báo chỗ này đang trống, mình ghé vào được nè.`;
    setStory({ character: "coba", text: line });
    speakText(line, "coba");
    addLog(`Camera ${changed.id} detected empty`);
  }, [aiCameraSlots]);

  function addLog(message: string) {
    const stamp = new Date().toLocaleTimeString("vi-VN");
    setLogs((current) => [...current.slice(-14), `[${stamp}] ${message}`]);
  }

  function clearGuideMotionTimer() {
    if (guideMotionTimerRef.current) {
      window.clearInterval(guideMotionTimerRef.current);
      guideMotionTimerRef.current = null;
    }
  }

  function animateGuideSpeech(text: string, guide: StoryCharacter) {
    clearGuideMotionTimer();
    setGuideSubtitle(text);
    setGuideMotionFrame("up");

    let toggle = false;
    const cycleMs = Math.max(220, Math.round(420 / animationSpeed));
    const durationMs = Math.min(6400, Math.max(1200, text.length * 75));
    const startedAt = Date.now();

    guideMotionTimerRef.current = window.setInterval(() => {
      toggle = !toggle;
      setGuideMotionFrame(toggle ? "up" : "down");

      if (Date.now() - startedAt >= durationMs) {
        clearGuideMotionTimer();
        setGuideMotionFrame("idle");
      }
    }, cycleMs);
  }

  function speakText(text: string, guide?: StoryCharacter) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const activeGuide = guide ?? selectedDebate;
    animateGuideSpeech(text, activeGuide);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    const profile = guide ? voiceProfileForCharacter(guide) : voiceProfileForType(engineVoice);
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = profile.volume;
    utterance.onend = () => {
      clearGuideMotionTimer();
      setGuideMotionFrame("idle");
    };
    window.speechSynthesis.speak(utterance);
  }

  function wait(ms: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), ms);
    });
  }

  async function fetchWithRetry(url: string, init?: RequestInit, attempts = 3, timeoutMs = 5000): Promise<Response> {
    let lastError: unknown;

    for (let i = 0; i < attempts; i += 1) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        window.clearTimeout(timer);
        return response;
      } catch (error) {
        window.clearTimeout(timer);
        lastError = error;
      }
    }

    throw lastError;
  }

  const clampAdminWidth = (value: number) => Math.max(220, Math.min(520, value));

  function startAdminResize(clientX: number) {
    adminResizeStartXRef.current = clientX;
    adminResizeStartWidthRef.current = adminWidth;
    setAdminResizing(true);
  }

  function moveAdminResize(clientX: number) {
    if (!adminResizing) {
      return;
    }

    const delta = adminResizeStartXRef.current - clientX;
    const next = clampAdminWidth(adminResizeStartWidthRef.current + delta);
    setAdminWidth(next);
    if (next < 260) {
      setAdminMode("compact");
    } else {
      setAdminMode("full");
    }
  }

  function endAdminResize() {
    if (!adminResizing) {
      return;
    }
    setAdminResizing(false);

    if (adminWidth < 260) {
      setAdminMode("compact");
      return;
    }

    setAdminMode("full");
  }

  useEffect(() => {
    if (!adminResizing) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => moveAdminResize(event.clientX);
    const onMouseUp = () => endAdminResize();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [adminResizing, adminWidth]);

  useEffect(() => {
    const cachedName = window.localStorage.getItem("saigongreen-user");
    if (cachedName) {
      setProfileName(cachedName);
    }
  }, [setProfileName]);

  useEffect(() => {
    window.localStorage.setItem("saigongreen-user", profileName);
  }, [profileName]);

  useEffect(() => {
    let socket: Socket | undefined;

    try {
      socket = io(backendWsUrl, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 800,
        reconnectionDelayMax: 3000,
        timeout: 5000
      });

      socket.on("connect", () => {
        setStatusMessage("Realtime online");
        addLog("Realtime connected");
      });
      socket.on("disconnect", () => {
        setHasRealtimeStream(false);
        setStatusMessage("Realtime disconnected");
        addLog("Realtime disconnected, waiting for reconnect");
      });
      socket.on("parking-update", (data: Slot[]) => {
        if (Array.isArray(data)) {
          requestAnimationFrame(() => {
            mergeRealtimeSlots(data);
          });
        }
      });
      socket.on("parking-diff", (diff: SlotDiff[]) => {
        if (!Array.isArray(diff) || diff.length === 0) {
          return;
        }

        requestAnimationFrame(() => {
          applyRealtimeDiff(diff);
        });
      });
      socket.on("parking-stream", (payload: ParkingStreamPayload) => {
        if (!payload || payload.event !== "CITY_TICK" || !Array.isArray(payload.slots)) {
          return;
        }

        setHasRealtimeStream(true);
        requestAnimationFrame(() => {
          mergeRealtimeSlots(payload.slots);
        });

        const availabilityPctFromStream = Number(clamp(payload.metrics.availability * 100, 0, 100).toFixed(0));
        setOpsMetrics({
          rtt: payload.metrics.apiLatency,
          uptime: payload.metrics.uptime,
          availability: availabilityPctFromStream
        });
        setPredictedAvailabilityPct(availabilityPctFromStream);
        setOpsUpdatedAt(Date.parse(payload.timestamp) || Date.now());
        setTrafficLevel(payload.metrics.traffic);

        const mappedIncidents: OpsIncident[] = (payload.incidents || []).map((incident) => ({
          id: incident.id,
          severity: incident.level === "critical" ? "SEV1" : incident.level === "warning" ? "SEV2" : "SEV3",
          source: incident.source,
          message: incident.message,
          status: incident.level === "info" ? "resolved" : "investigating",
          detectedAt: Date.parse(incident.createdAt) || Date.now()
        }));
        setOpsIncidents(mappedIncidents.slice(0, 10));

        const offlineCount = (payload.cameras || []).filter((camera) => camera.status === "offline").length;
        setCameraOffline(offlineCount > 0);

        if (mappedIncidents.some((incident) => incident.severity === "SEV1" && incident.status === "investigating")) {
          setStatusMessage("Realtime critical alert");
        } else if (payload.metrics.traffic === "HIGH") {
          setStatusMessage("Realtime online - heavy traffic");
        } else {
          setStatusMessage("Realtime online");
        }

        if (payload.metrics.traffic === "HIGH") {
          setBehaviorHint("Ban dang vao khu dong. Thu gui xe xa hon 150m de giam ~30% CO2.");
        } else {
          setBehaviorHint("Tuyen hien tai on dinh. Uu tien slot xanh de toi uu CO2.");
        }
      });
    } catch {
      setHasRealtimeStream(false);
      setStatusMessage("Realtime unavailable");
      addLog("Realtime unavailable");
    }

    return () => {
      socket?.disconnect();
    };
  }, [applyRealtimeDiff, mergeRealtimeSlots, setStatusMessage]);

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
      const baseFreq = character === "coba" ? 660 : character === "chutai" ? 520 : 740;

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
      clearGuideMotionTimer();
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

    const savedStoryLayer = window.localStorage.getItem("saigongreen-layer-story");
    if (savedStoryLayer === "off" && layers.story) {
      toggleLayer("story");
    }
    storyLayerHydratedRef.current = true;
  }, [layers.story, toggleLayer]);

  useEffect(() => {
    if (!storyLayerHydratedRef.current) {
      return;
    }
    window.localStorage.setItem("saigongreen-layer-story", layers.story ? "on" : "off");
  }, [layers.story]);

  useEffect(() => {
    if (storyVoiceHydratedRef.current) {
      return;
    }
    const savedVoice = window.localStorage.getItem("saigongreen-story-voice");
    if (savedVoice === "off") {
      setStoryVoiceEnabled(false);
    }
    storyVoiceHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!storyVoiceHydratedRef.current) {
      return;
    }
    window.localStorage.setItem("saigongreen-story-voice", storyVoiceEnabled ? "on" : "off");
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
    if (hasRealtimeStream) {
      return;
    }

    const interval = window.setInterval(() => {
      setOpsMetrics((current) => ({
        rtt: Number(clamp(current.rtt + (Math.random() - 0.5) * 24, 80, 200).toFixed(0)),
        uptime: Number(clamp(current.uptime + (Math.random() - 0.5) * 0.28, 97, 100).toFixed(2)),
        availability: Number(clamp(current.availability + (Math.random() - 0.5) * 6, 40, 90).toFixed(0))
      }));
      setOpsUpdatedAt(Date.now());
    }, 2000);

    return () => window.clearInterval(interval);
  }, [hasRealtimeStream]);

  useEffect(() => {
    if (hasRealtimeStream) {
      return;
    }

    const interval = window.setInterval(() => {
      const chance = Math.random();
      if (chance <= 0.72) {
        return;
      }

      const sev1 = chance > 0.93;
      const incident: OpsIncident = {
        id: `inc-${Date.now()}`,
        severity: sev1 ? "SEV1" : "SEV2",
        source: sev1 ? "Routing Core" : "Edge Gateway",
        message: sev1 ? "Route orchestrator timeout burst detected." : "Minor latency increase detected. Monitoring.",
        status: "investigating",
        detectedAt: Date.now()
      };

      setOpsIncidents((current) => [incident, ...current].slice(0, 10));

      window.setTimeout(() => {
        setOpsIncidents((current) =>
          current.map((item) =>
            item.id === incident.id
              ? {
                  ...item,
                  status: "resolved"
                }
              : item
          )
        );
      }, 5000);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [hasRealtimeStream]);

  useEffect(() => {
    const active = opsIncidents.filter((incident) => incident.status === "investigating");
    if (active.some((incident) => incident.severity === "SEV1")) {
      setSystemState("down");
      return;
    }
    if (active.length > 0 || routeLoading || opsMetrics.rtt > 175) {
      setSystemState("degraded");
      return;
    }
    setSystemState("healthy");
  }, [opsIncidents, routeLoading, opsMetrics.rtt]);

  useEffect(() => {
    if (!selectedSlot || routeLoading || routes.length === 0) {
      return;
    }

    const latest = slots.find((slot) => slot.id === selectedSlot.id);
    if (!latest) {
      return;
    }

    const nowUnavailable = !latest.available && !latest.soon;
    if (!nowUnavailable) {
      return;
    }

    setStatusMessage(`S${latest.id} just occupied. Auto re-routing...`);
    emitStory("chutai", "full", 250);
    void requestOsrmRoutes();
  }, [routeLoading, routes.length, selectedSlot, slots]);

  function generateSmartZones(center: { lat: number; lng: number }, sourceSlots: Slot[]) {
    const token = ++zoneRegenerationTokenRef.current;
    const factor = getTimeFactor();

    const points = sourceSlots
      .filter((slot) => typeof slot.lat === "number" && typeof slot.lng === "number")
      .slice(0, 30)
      .map((slot, index) => {
        const lat = slot.lat as number;
        const lng = slot.lng as number;
        const centerDistance = pointDistance([lat, lng], [center.lat, center.lng]);
        const centerBias = clamp(1 - centerDistance * 42, 0.35, 1.05);
        const baseAvailability = slot.available ? 82 : slot.soon || (slot.predictedFreeMin ?? 99) <= 10 ? 54 : 22;
        const withTimeFactor = baseAvailability * factor * centerBias;
        const availability = Number(clamp(withTimeFactor + (Math.random() - 0.5) * 12, 0, 100).toFixed(0));

        return {
          id: `zone-${token}-${slot.id}-${index}`,
          lat,
          lng,
          value: availability,
          type: getZoneType(availability)
        } satisfies ZonePoint;
      });

    if (points.length < 12) {
      const synthetic = Array.from({ length: 12 - points.length }, (_, index) => {
        const lat = center.lat + (Math.random() - 0.5) * 0.02;
        const lng = center.lng + (Math.random() - 0.5) * 0.02;
        const availability = Number(clamp((Math.random() * 100) * factor, 0, 100).toFixed(0));
        return {
          id: `zone-${token}-synthetic-${index}`,
          lat,
          lng,
          value: availability,
          type: getZoneType(availability)
        } satisfies ZonePoint;
      });
      setZones([...points, ...synthetic]);
      return;
    }

    setZones(points);
  }

  useEffect(() => {
    generateSmartZones(mapCenter, slots);
  }, [mapCenter, slots]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setZones((current) =>
        current.map((zone) => {
          const nextValue = Number(clamp(zone.value + (Math.random() - 0.5) * 10, 0, 100).toFixed(0));
          return {
            ...zone,
            value: nextValue,
            type: getZoneType(nextValue)
          };
        })
      );
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      generateSmartZones(mapCenter, slots);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [mapCenter, slots]);

  function dominantZoneAround(point: [number, number]): ZonePoint["type"] {
    const near = zones.filter((zone) => pointDistance(point, [zone.lat, zone.lng]) < 0.0034);
    if (!near.length) {
      return "yellow";
    }

    const score = near.reduce(
      (acc, zone) => {
        acc[zone.type] += 1;
        return acc;
      },
      { green: 0, yellow: 0, red: 0 } as Record<ZonePoint["type"], number>
    );

    if (score.red >= score.yellow && score.red >= score.green) {
      return "red";
    }
    if (score.green >= score.yellow) {
      return "green";
    }
    return "yellow";
  }

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

  const availabilityPct = Number(clamp((stats.available / Math.max(1, slots.length)) * 100, 40, 90).toFixed(0));

  const slo = useMemo(() => {
    const activeCount = opsIncidents.filter((incident) => incident.status === "investigating").length;
    const targetPct = 99.9;
    const uptime6hPct = Number(clamp(opsMetrics.uptime - activeCount * 0.12, 97, 100).toFixed(2));
    const errorBudgetRemainingPct = Number(clamp(72 + (opsMetrics.uptime - 99) * 22 - activeCount * 11, 35, 95).toFixed(2));
    const burnRate1h = Number(clamp(1.3 + (opsMetrics.rtt - 120) / 220 + activeCount * 0.5, 0.7, 4).toFixed(2));
    const burnRate6h = Number(clamp(1.1 + (opsMetrics.rtt - 120) / 320 + activeCount * 0.3, 0.6, 3.2).toFixed(2));

    return {
      targetPct,
      uptime6hPct,
      errorBudgetRemainingPct,
      burnRate1h,
      burnRate6h
    };
  }, [opsIncidents, opsMetrics.rtt, opsMetrics.uptime]);

  const incidentFeed = useMemo<OpsIncident[]>(() => {
    const now = Date.now();
    const base = [...opsIncidents];

    if (availabilityPct < 45) {
      base.unshift({
        id: `cap-${Math.floor(now / 60000)}`,
        severity: "SEV2",
        source: "Capacity Optimizer",
        message: "Availability dipped below 45%. Rebalancing recommendations.",
        status: "investigating",
        detectedAt: now
      });
    }
    if (cameraOnlinePct < 72) {
      base.unshift({
        id: `cam-${Math.floor(now / 60000)}`,
        severity: "SEV2",
        source: "Camera Fleet",
        message: "Camera uptime below threshold (72%). Dispatching diagnostics.",
        status: "investigating",
        detectedAt: now
      });
    }

    const unique = new Map<string, OpsIncident>();
    for (const incident of base) {
      if (!unique.has(incident.id)) {
        unique.set(incident.id, incident);
      }
    }

    return Array.from(unique.values()).slice(0, 8);
  }, [availabilityPct, cameraOnlinePct, opsIncidents]);

  const preferredArea = "District 1";
  const nearbyAvailableSlots = useMemo(() => {
    const thresholdX = preferredArea === "District 1" ? 55 : 100;
    return slots.filter((slot) => slot.x <= thresholdX && slot.available);
  }, [slots]);

  const recommendedSlots = useMemo(() => {
    return [...nearbyAvailableSlots].sort((a, b) => (a.distanceM ?? 9999) - (b.distanceM ?? 9999)).slice(0, 2);
  }, [nearbyAvailableSlots]);

  const activeRoutePath = routes[activeRoute]?.coords;
  const ecoRouteIndex = useMemo(() => {
    if (!routes.length) {
      return 0;
    }
    return routes.reduce((best, item, idx) => (item.distanceKm < routes[best].distanceKm ? idx : best), 0);
  }, [routes]);

  const activeRoutePenalty = routes[activeRoute]?.penaltyScore ?? 0;
  const activeRouteIsEco = activeRoute === ecoRouteIndex;

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

  useNavigation({
    route: routePath,
    navigating: navigationActive,
    speedMs: Math.max(80, Math.round(160 / animationSpeed)),
    onPosition: (point, index) => {
      setCarPosition(point);
      setRouteIndex(index);

      const from = routePath[Math.max(0, index - 1)] ?? point;
      const to = routePath[Math.min(index + 1, routePath.length - 1)] ?? point;
      const angle = Math.atan2(to[0] - from[0], to[1] - from[1]) * (180 / Math.PI);
      setCarAngle(angle);

      const remainingPath = routePath.slice(index);
      let remaining = 0;
      for (let i = 0; i < remainingPath.length - 1; i += 1) {
        remaining += calcDistanceKm(remainingPath[i], remainingPath[i + 1]);
      }
      setDistanceLeftKm(Number(remaining.toFixed(2)));
      setEtaMinutes(Math.max(1, Math.round((remaining / speedByTraffic(trafficLevel)) * 60)));
    },
    onComplete: () => {
      setNavigationActive(false);
      setInstruction("Ban da den noi");
      speakText("Ban da den noi");
      addLog("Navigation completed");
    }
  });

  useEffect(() => {
    if (!navigationActive || routePath.length < 2) {
      return;
    }

    const from = routePath[Math.min(routeIndex, routePath.length - 2)];
    const to = routePath[Math.min(routeIndex + 1, routePath.length - 1)];
    if (!from || !to) {
      return;
    }

    const text = getDirection(from, to);
    setInstruction(text);
    speakText(text);
  }, [navigationActive, routeIndex, routePath]);

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
    const now = Date.now();
    if (now - lastFindTriggerRef.current < 900) {
      return;
    }
    lastFindTriggerRef.current = now;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    setFinding(true);
    setStatusMessage("Analyzing best parking...");

    window.setTimeout(() => {
      const nearest = findNearestSlot();
      if (!nearest || typeof nearest.lat !== "number" || typeof nearest.lng !== "number") {
        setStatusMessage("No nearby non-full slot found");
        emitStory("chutai", "full", 300);
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
      generateSmartZones(mapCenter, slots);
      setStatusMessage(`Nearest slot found: S${nearest.id}`);
      const zoneType = dominantZoneAround([nearest.lat, nearest.lng]);
      if (zoneType === "red") {
        emitStory("chutai", "full", 500);
      } else if (zoneType === "green") {
        emitStory("coba", "find", 500);
      } else {
        emitStoryForSlot(nearest, "chutai", "find", 500);
      }
      const baseAvailability = nearest.available ? 85 : nearest.soon || (nearest.predictedFreeMin ?? 99) <= 10 ? 55 : 20;
      setPredictedAvailabilityPct(predictAvailability(baseAvailability));
      setFinding(false);
    }, 800);
  }

  async function requestOsrmRoutes() {
    if (!selectedSlot || typeof selectedSlot.lat !== "number" || typeof selectedSlot.lng !== "number") {
      setStatusMessage("Pick a slot first (tap marker or Find)");
      return;
    }

    if (routeBusyRef.current) {
      return;
    }
    routeBusyRef.current = true;

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
      addLog("Route request started");

      const backendRouteUrl =
        `${backendUrl}/parking/route-options?fromLat=${userLocation[0]}&fromLng=${userLocation[1]}&toLat=${selectedSlot.lat}&toLng=${selectedSlot.lng}`;

      const backendResponse = await fetchWithRetry(backendRouteUrl, undefined, 2, 4500);
      const backendRoutes = (await backendResponse.json()) as Array<{
        profile?: "fastest" | "eco" | "chill";
        distance: number;
        etaMinutes: number;
        etaMin?: number;
        etaMax?: number;
        traffic?: StreamTraffic;
        confidence?: "HIGH" | "MEDIUM" | "LOW";
        reason?: string[];
        path: Array<[number, number]>;
      }>;

      if (Array.isArray(backendRoutes) && backendRoutes.length > 0) {
        const mappedRoutes: RouteOption[] = backendRoutes.map((item, index) => ({
          coords: item.path,
          durationMin: item.etaMinutes,
          smartEtaMin: item.etaMinutes,
          etaMin: item.etaMin,
          etaMax: item.etaMax,
          traffic: item.traffic,
          confidence: item.confidence,
          reason: item.reason,
          penaltyScore: item.profile === "eco" ? 4 : item.profile === "chill" ? 7 : 12,
          distanceKm: Math.max(1, Number((item.distance / 1000).toFixed(1))),
          steps: [
            "Đi theo trục chính",
            item.profile === "eco" ? "Rẽ sang tuyến xanh" : "Rẽ theo tuyến nhanh",
            "Đến bãi mục tiêu"
          ]
        }));

        const preferredProfile = engineRouteType === "eco" ? "eco" : engineRouteType === "fastest" ? "fastest" : "chill";
        const preferredIndex = Math.max(
          0,
          mappedRoutes.findIndex((item) => item.reason?.some((line) => line.toLowerCase().includes(preferredProfile)) ?? false)
        );
        const safeIndex = Math.min(preferredIndex, mappedRoutes.length - 1);

        setRoutes(mappedRoutes);
        setActiveRoute(safeIndex);
        setTurnSteps(mappedRoutes[safeIndex].steps);
        setEtaMinutes(mappedRoutes[safeIndex].smartEtaMin);
        setRouteConfidence(mappedRoutes[safeIndex].confidence ?? "MEDIUM");
        setRouteFocusToken((value) => value + 1);
        setNavigationActive(true);
        setRouteIndex(0);
        setCarPosition(mappedRoutes[safeIndex].coords[0] ?? null);
        setDistanceLeftKm(mappedRoutes[safeIndex].distanceKm);
        setStatusMessage(`Route ready: ${mappedRoutes[safeIndex].smartEtaMin} min • ${mappedRoutes[safeIndex].distanceKm} km`);
        addLog("Route computed via backend route-options");
        bumpEco(selectedDebate === "coba" ? 18 : 12, selectedDebate === "coba" ? 0.42 : 0.28);

        return;
      }

      const osrmUrl =
        `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};` +
        `${selectedSlot.lng},${selectedSlot.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;

      const response = await fetchWithRetry(osrmUrl, { signal: controller.signal }, 2, 6000);
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
          smartEtaMin: 0,
          penaltyScore: 0,
          distanceKm: Math.max(1, Math.round(routeItem.distance / 1000)),
          steps:
            routeItem.legs?.[0]?.steps?.map((step) => step.maneuver?.instruction || step.name || "Continue straight") ?? []
        })) ?? [];

      if (!parsedRoutes.length) {
        const basicDistanceKm = calcDistanceKm(userLocation, [selectedSlot.lat, selectedSlot.lng]);
        const basicSpeed = speedByTraffic(trafficLevel);
        const basicEta = Math.max(1, Math.round((basicDistanceKm / basicSpeed) * 60));
        const basicRoute: RouteOption = {
          coords: [
            userLocation,
            [selectedSlot.lat, userLocation[1]],
            [selectedSlot.lat, selectedSlot.lng]
          ],
          durationMin: basicEta,
          smartEtaMin: basicEta,
          etaMin: Math.max(1, basicEta - 1),
          etaMax: basicEta + 2,
          traffic: trafficLevel,
          confidence: "LOW",
          reason: ["Fallback basic route", "Network degraded"],
          penaltyScore: 8,
          distanceKm: Number(basicDistanceKm.toFixed(2)),
          steps: ["Đi thẳng", "Rẽ theo trục phụ", "Đến nơi"]
        };

        setRoutes([basicRoute]);
        setActiveRoute(0);
        setTurnSteps(basicRoute.steps);
        setEtaMinutes(basicRoute.smartEtaMin);
        setRouteConfidence("LOW");
        setRouteFocusToken((value) => value + 1);
        setNavigationActive(true);
        setRouteIndex(0);
        setCarPosition(basicRoute.coords[0]);
        setDistanceLeftKm(basicRoute.distanceKm);
        setStatusMessage("Routing degraded mode active");
        addLog("Fallback basic route activated");
        return;
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      const scored = parsedRoutes.map((routeItem) => {
        const penaltyScore = scoreRoute(routeItem.coords, zones);
        return {
          ...routeItem,
          penaltyScore,
          smartEtaMin: smartEta(routeItem.durationMin, penaltyScore)
        };
      });

      const bestRouteIndex = scored.reduce((best, current, index, all) => {
        if (current.penaltyScore < all[best].penaltyScore) {
          return index;
        }
        if (current.penaltyScore === all[best].penaltyScore && current.smartEtaMin < all[best].smartEtaMin) {
          return index;
        }
        return best;
      }, 0);

      setRoutes(scored);
      setActiveRoute(bestRouteIndex);
      setTurnSteps(scored[bestRouteIndex].steps);
      setEtaMinutes(scored[bestRouteIndex].smartEtaMin);
      setRoute(null);
      setRouteFocusToken((value) => value + 1);
      setNavigationActive(true);
      setRouteIndex(0);
      setCarPosition(scored[bestRouteIndex].coords[0] ?? null);
      setDistanceLeftKm(scored[bestRouteIndex].distanceKm);
      setRouteConfidence("MEDIUM");
      bumpEco(16, 0.35);
      generateSmartZones(mapCenter, slots);
      setStatusMessage(`Route ready: ${scored[bestRouteIndex].smartEtaMin} min • ${scored[bestRouteIndex].distanceKm} km`);
      addLog("Route computed via OSRM");
      if (trafficLevel === "HIGH") {
        emitStory("chutai", "route", 700);
      } else if (resolveAreaName(selectedSlot).includes("Bến Thành")) {
        emitStory("coba", "route", 700);
      } else if (scored[bestRouteIndex].penaltyScore > 15) {
        emitStory("chutai", "route", 800);
      } else {
        emitStory("coba", "route", selectedSlot.zone === "green" ? 600 : 800);
      }
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
      const basicDistanceKm = calcDistanceKm(userLocation, [selectedSlot.lat, selectedSlot.lng]);
      const basicSpeed = speedByTraffic(trafficLevel);
      const basicEta = Math.max(1, Math.round((basicDistanceKm / basicSpeed) * 60));
      const basicRoute: RouteOption = {
        coords: [
          userLocation,
          [selectedSlot.lat, userLocation[1]],
          [selectedSlot.lat, selectedSlot.lng]
        ],
        durationMin: basicEta,
        smartEtaMin: basicEta,
        etaMin: Math.max(1, basicEta - 1),
        etaMax: basicEta + 2,
        traffic: trafficLevel,
        confidence: "LOW",
        reason: ["Degraded network fallback", "Using deterministic city grid route"],
        penaltyScore: 10,
        distanceKm: Number(basicDistanceKm.toFixed(2)),
        steps: ["Đi thẳng", "Rẽ phải", "Đến nơi"]
      };
      setRoutes([basicRoute]);
      setActiveRoute(0);
      setTurnSteps(basicRoute.steps);
      setEtaMinutes(basicRoute.smartEtaMin);
      setRouteFocusToken((value) => value + 1);
      setNavigationActive(true);
      setRouteIndex(0);
      setCarPosition(basicRoute.coords[0]);
      setDistanceLeftKm(basicRoute.distanceKm);
      setRouteConfidence("LOW");
      setStatusMessage("Routing degraded mode active");
      addLog("Routing fallback after failure");
    } finally {
      if (requestId === requestIdRef.current) {
        setRouteLoading(false);
      }
      routeBusyRef.current = false;
    }
  }

  function handleDrawRoute() {
    void requestOsrmRoutes();
  }

  async function startDemoMode() {
    if (demoRunning) {
      return;
    }

    setDemoRunning(true);
    setAutoPilot(true);
    addLog("Demo mode started");
    speakText("Bắt đầu trải nghiệm thành phố thông minh");

    setBehaviorHint("Demo mode: engine đang tự điều phối Find -> Route -> Navigation");
    addLog("Demo flow executed");
    window.setTimeout(() => {
      setDemoRunning(false);
    }, 2200);
  }

  function chooseDebate(character: PersonaKey) {
    setSelectedDebate(character);
    const profile = guideProfiles[character];
    setQuery(profile.places[0]);
    setGuideSubtitle(`Đã chọn ${profile.label}. ${profile.intro}`);
    if (character === "chutai") {
      setBehaviorHint(`🚕 ${profile.label}: tập trung điểm đời thường, dễ trải nghiệm nhịp sống bản địa.`);
      setCenterPressure((value) => value + 1);
      setMoralFeedback("Bạn vừa chọn nhanh hơn, nhưng tạo thêm khoảng 0.8kg CO2 😢");
      speakText("Đi nhanh thì vào trung tâm thôi", character);
      return;
    }

    if (character === "coba") {
      setBehaviorHint(`👩 ${profile.label}: dẫn đi bảo tàng và điểm lịch sử, ưu tiên tuyến xanh giảm ùn tắc.`);
      setMoralFeedback("Lựa chọn xanh giúp giảm tải trung tâm và tiết kiệm CO2 🌱");
      bumpEco(8, 0.2);
      speakText("Đi thong thả một chút sẽ dễ thở hơn", character);
      return;
    }

    setBehaviorHint(`🧑 ${profile.label}: dẫn bạn khám phá quán local ít người biết, thiên về trải nghiệm.`);
    setMoralFeedback("Bạn chọn trải nghiệm cân bằng giữa tốc độ và phát thải.");
    speakText("Đi hẻm này, ít người biết nhưng ổn áp lắm", character);
  }

  function openDestinationFlow(name: string) {
    const destination = findDestinationByName(name);
    if (!destination) {
      return;
    }

    setSelectedDestination(destination);
    visitDestination(destination.id);
    unlockDestination(destination.id);
    setBehaviorHint(`📘 Mission unlocked at ${destination.name}.`);
  }

  function handleJourneyTransport(type: TransportType) {
    setDestinationTransport(type);

    if (!selectedDestination) {
      return;
    }

    const reward =
      type === "motorbike"
        ? rewardTransport(type)
        : (selectedDestination.transportReward[type as "bike" | "ev" | "walk"] ?? rewardTransport(type));

    useTransport(type, reward);

    if (type === "walk") {
      unlockSecretRoute(`${selectedDestination.id}-walk-secret`);
      setBehaviorHint("🚶 Hidden alley unlocked. Walk route reveals a secret path.");
      setMoralFeedback("Đi bộ chậm hơn nhưng mở thêm câu chuyện ẩn và giảm phát thải nhiều hơn.");
      bumpEco(10, 0.35);
      return;
    }

    if (type === "ev") {
      setBehaviorHint("⚡ EV route selected. Quiet movement and cleaner air.");
      setMoralFeedback("Lựa chọn EV giúp cân bằng tốc độ và môi trường.");
      bumpEco(8, 0.24);
      return;
    }

    if (type === "bike") {
      setBehaviorHint("🚲 Bike route selected. Great for short urban hops.");
      setMoralFeedback("Đi xe đạp giúp giảm khí thải và giữ nhịp khám phá địa phương.");
      bumpEco(6, 0.2);
      return;
    }

    setBehaviorHint("🛵 Quick ride selected.");
    setMoralFeedback("Đi kiểu này nhanh thiệt, mà hơi tiếc cho không khí nghen.");
    speakText("Đi kiểu này nhanh thiệt, mà hơi tiếc cho không khí nghen.", "coba");
  }

  async function handleLandmarkClick(guide: StoryCharacter, landmark: GuideLandmark, buildRoute = true) {
    setSelectedDebate(guide);
    setActiveLandmarkId(landmark.id);
    setLandmarkPreview({ guide, landmark });
    setMapCenter({ lat: landmark.lat, lng: landmark.lng });
    setGuideSubtitle(buildRoute ? `Đang tính đường tới ${landmark.name}...` : `${landmark.name}: ${landmark.description}`);
    setCityNarration(`📍 ${landmark.name} - ${landmark.description}`);
    setBehaviorHint(`🧭 ${guideProfiles[guide].label} đang dẫn bạn tới ${landmark.name}. Đồng thời gợi ý bãi đỗ xe hợp lý gần điểm này.`);

    if (!buildRoute) {
      const fallbackPlace: PlaceData = {
        id: Math.abs(landmark.id.length * 17),
        name: landmark.name,
        type: "daily",
        persona: personaToUpper(guide),
        lat: landmark.lat,
        lng: landmark.lng,
        overview: landmark.description,
        history: landmark.description,
        greenStoryHook: "Lối đi bộ ngắn, giữ nhịp xanh cho chuyến ghé.",
        walkingRoute: "Từ bãi xe đi bộ theo trục chính rồi rẽ vào điểm đến.",
        ecoBenefit: "Giảm xe vào lõi trung tâm",
        recommendedParking: "Bãi phụ gần nhất",
        hiddenSpot: "Có một góc rẽ local ít người để ý"
      };

      const context: NarrativeContext = {
        persona: personaToUpper(guide),
        traffic: trafficLevel,
        cityMood,
        timeLabel: timeLabelNow(),
        selectedSlotAvailable: selectedSlot?.available ?? false,
        visitedCount: journeyVisits.length
      };
      const intelligence = buildDestinationIntelligence(fallbackPlace, context);
      const script = generateAdaptiveStory(fallbackPlace, context);
      const journeyVisit = buildJourneyVisit(fallbackPlace, intelligence, cityMood);

      setSelectedPlace(fallbackPlace);
      openDestinationFlow(fallbackPlace.name);
      setDestinationProfile(intelligence);
      setPlaceScript(script);
      setPlacePersona(guide);
      setShowPlaceNarrative(true);
      setPersonaDebateLines(buildPersonaDebate(fallbackPlace, intelligence, context));
      setJourneyVisits((current) => (current.some((visit) => visit.id === fallbackPlace.id) ? current : [...current, journeyVisit]));
      speakText(`Đây là ${landmark.name}. ${landmark.description}`, guide);
      return;
    }

    const target: [number, number] = [landmark.lat, landmark.lng];
    const directDistanceKm = calcDistanceKm(userLocation, target);
    const fallbackEta = Math.max(3, Math.round((directDistanceKm / speedByTraffic(trafficLevel)) * 60));

    let nextRoutes: RouteOption[] = [];
    let bestIndex = 0;

    try {
      const routeUrl =
        `${backendUrl}/parking/route-options?fromLat=${userLocation[0]}&fromLng=${userLocation[1]}&toLat=${target[0]}&toLng=${target[1]}`;
      const response = await fetchWithRetry(routeUrl, undefined, 2, 4500);
      const backendRoutes = (await response.json()) as Array<{
        profile?: "fastest" | "eco" | "chill";
        distance: number;
        etaMinutes: number;
        etaMin?: number;
        etaMax?: number;
        traffic?: StreamTraffic;
        confidence?: "HIGH" | "MEDIUM" | "LOW";
        reason?: string[];
        path: Array<[number, number]>;
      }>;

      if (Array.isArray(backendRoutes) && backendRoutes.length > 0) {
        nextRoutes = backendRoutes.map((item) => ({
          coords: item.path,
          durationMin: item.etaMinutes,
          smartEtaMin: item.etaMinutes,
          etaMin: item.etaMin,
          etaMax: item.etaMax,
          traffic: item.traffic,
          confidence: item.confidence,
          reason: item.reason,
          penaltyScore: item.profile === "eco" ? 4 : item.profile === "chill" ? 7 : 12,
          distanceKm: Math.max(0.2, Number((item.distance / 1000).toFixed(2))),
          steps: [
            `Xuất phát đến ${landmark.name}`,
            guide === "coba" ? "Ưu tiên tuyến xanh" : guide === "chutai" ? "Ưu tiên tuyến nhanh" : "Ưu tiên tuyến khám phá cân bằng",
            `Đến ${landmark.name}`
          ]
        }));

        const preferredProfile = guide === "coba" ? "eco" : guide === "chutai" ? "fastest" : "chill";
        bestIndex = Math.max(0, backendRoutes.findIndex((item) => item.profile === preferredProfile));
      }
    } catch {
      // Fallback route below keeps flow stable.
    }

    if (!nextRoutes.length) {
      nextRoutes = [
        {
          coords: [
            userLocation,
            [target[0], userLocation[1]],
            target
          ],
          durationMin: fallbackEta,
          smartEtaMin: fallbackEta,
          etaMin: Math.max(2, fallbackEta - 2),
          etaMax: fallbackEta + 3,
          traffic: trafficLevel,
          confidence: "LOW",
          reason: ["Fallback route", "Network degraded"],
          penaltyScore: 9,
          distanceKm: Number(directDistanceKm.toFixed(2)),
          steps: [`Xuất phát đến ${landmark.name}`, "Đi theo trục chính", `Đến ${landmark.name}`]
        }
      ];
      bestIndex = 0;
    }

    const active = nextRoutes[bestIndex];
    setRoutes(nextRoutes);
    setActiveRoute(bestIndex);
    setTurnSteps(active.steps);
    setEtaMinutes(active.smartEtaMin);
    setDistanceLeftKm(active.distanceKm);
    setRouteConfidence(active.confidence ?? "MEDIUM");
    setRouteFocusToken((value) => value + 1);
    setNavigationActive(false);

    setLandmarkJourney({
      guide,
      name: landmark.name,
      description: landmark.description,
      distanceKm: active.distanceKm,
      etaMin: active.smartEtaMin
    });
    setGuideSubtitle(`📌 ${landmark.name} • ${active.distanceKm} km • ${active.smartEtaMin} phút`);
    setStatusMessage(`Lộ trình đến ${landmark.name}: ${active.smartEtaMin} phút, ${active.distanceKm} km`);

    const matchedPlace = placeLibrary.find((item) => item.name === landmark.name || item.name.includes(landmark.name) || landmark.name.includes(item.name));
    const fallbackPlace: PlaceData = matchedPlace ?? {
      id: Math.abs(landmark.id.length * 17),
      name: landmark.name,
      type: "history",
      persona: personaToUpper(guide),
      lat: landmark.lat,
      lng: landmark.lng,
      overview: landmark.description,
      history: landmark.description,
      greenStoryHook: "Chuyến này có thể đi bộ ngắn để giữ nhịp khám phá.",
      walkingRoute: "Từ bãi xe đi vào theo trục chính rồi rẽ vào điểm đến.",
      ecoBenefit: "Giảm khí thải và giảm áp lực bãi đỗ",
      recommendedParking: "Bãi phụ gần điểm tham quan",
      hiddenSpot: "Có một lối đi nhỏ ít người biết"
    };

    const context: NarrativeContext = {
      persona: personaToUpper(guide),
      traffic: trafficLevel,
      cityMood,
      timeLabel: timeLabelNow(),
      selectedSlotAvailable: selectedSlot?.available ?? false,
      visitedCount: journeyVisits.length
    };
    const intelligence = buildDestinationIntelligence(fallbackPlace, context);
    const script = generateAdaptiveStory(fallbackPlace, context);
    const journeyVisit = buildJourneyVisit(fallbackPlace, intelligence, cityMood);

    setSelectedPlace(fallbackPlace);
    openDestinationFlow(fallbackPlace.name);
    setDestinationProfile(intelligence);
    setPlaceScript(script);
    setPlacePersona(guide);
    setShowPlaceNarrative(true);
    setPersonaDebateLines(buildPersonaDebate(fallbackPlace, intelligence, context));
    setJourneyVisits((current) => (current.some((visit) => visit.id === fallbackPlace.id) ? current : [...current, journeyVisit]));
    speakText(`Đây là ${landmark.name}. ${landmark.description}`, guide);
  }

  function startCinematicMode() {
    setCinematicMode(true);
    addLog("Cinematic explore started");
    const shots: Array<{ lat: number; lng: number; line: string }> = [
      { lat: 10.772, lng: 106.698, line: "Thành phố bắt đầu một nhịp ngày mới" },
      { lat: 10.7768, lng: 106.701, line: "Khu trung tâm đang nóng dần" },
      { lat: 10.7698, lng: 106.706, line: "Các tuyến xanh mở ra nhịp thở mới" }
    ];

    let idx = 0;
    setMapCenter({ lat: shots[0].lat, lng: shots[0].lng });
    setCityNarration(shots[0].line);

    if (cinematicTimerRef.current) {
      window.clearInterval(cinematicTimerRef.current);
    }

    cinematicTimerRef.current = window.setInterval(() => {
      idx += 1;
      if (idx >= shots.length) {
        if (cinematicTimerRef.current) {
          window.clearInterval(cinematicTimerRef.current);
        }
        setCinematicMode(false);
        return;
      }
      setMapCenter({ lat: shots[idx].lat, lng: shots[idx].lng });
      setCityNarration(shots[idx].line);
      speakText(shots[idx].line);
    }, 3500);
  }

  function openSelectedLiveView() {
    if (!selectedSlot) {
      return;
    }
    setStatusMessage(`Live view focused on S${selectedSlot.id}`);
  }

  function handleAIPlaceClick(place: AIPlace) {
    const guide = personaToGuide(place.persona);
    const personaUpper = personaToUpper(guide);
    const matchedPlace = placeLibrary.find((item) => item.name === place.name || item.name.includes(place.name) || place.name.includes(item.name));
    const fullPlace: PlaceData = matchedPlace ?? {
      id: place.id,
      name: place.name,
      type: place.type,
      persona: personaUpper,
      lat: place.lat,
      lng: place.lng,
      overview: place.desc,
      history: place.desc,
      greenStoryHook: "Giữ nhịp xanh bằng cách đi bộ thêm một đoạn.",
      walkingRoute: "Từ bãi đỗ xe đến điểm đến theo lối ngắn nhất.",
      ecoBenefit: "Giảm phát thải nhờ bớt chạy vòng",
      recommendedParking: "Bãi phụ gần nhất",
      hiddenSpot: "Có một góc local sát hông điểm đến"
    };

    const context: NarrativeContext = {
      persona: personaUpper,
      traffic: trafficLevel,
      cityMood,
      timeLabel: timeLabelNow(),
      selectedSlotAvailable: selectedSlot?.available ?? false,
      visitedCount: journeyVisits.length
    };
    const intelligence = buildDestinationIntelligence(fullPlace, context);
    const script = generateAdaptiveStory(fullPlace, context);

    setSelectedPlace(fullPlace);
    openDestinationFlow(fullPlace.name);
    setDestinationProfile(intelligence);
    setPlaceScript(script);
    setPlacePersona(guide);
    setShowPlaceNarrative(true);
    setPersonaDebateLines(buildPersonaDebate(fullPlace, intelligence, context));
    setJourneyVisits((current) => (current.some((visit) => visit.id === fullPlace.id) ? current : [...current, buildJourneyVisit(fullPlace, intelligence, cityMood)]));

    const mapped: GuideLandmark = {
      id: `ai-place-${place.id}`,
      name: place.name,
      description: place.desc,
      lat: place.lat,
      lng: place.lng
    };
    setSelectedDebate(guide);
    setActiveLandmarkId(mapped.id);
    setLandmarkPreview({ guide, landmark: mapped });
    setMapCenter({ lat: place.lat, lng: place.lng });
    setBehaviorHint(`🧭 ${guideProfiles[guide].label} đang kể chuyện về ${place.name}.`);
    setCityNarration(`📍 ${place.name} - ${intelligence.crowdLevel} crowd • eco ${intelligence.ecoScore}/100`);
  }

  function runAICityPlanner() {
    if (!aiSlots.length) {
      setStatusMessage("AI dataset đang nạp, thử lại sau vài giây.");
      return;
    }

    const best = findBestSlot(
      { lat: userLocation[0], lng: userLocation[1] },
      aiSlots,
      aiTrafficZones
    );

    if (!best) {
      setStatusMessage("Không tìm thấy bãi phù hợp từ AI planner.");
      return;
    }

    const aiGuide = activePersonaGuide;
    const routeCoords = generateRoute(
      { lat: userLocation[0], lng: userLocation[1] },
      { lat: best.lat, lng: best.lng }
    );
    const distanceKm = calcDistanceKm([userLocation[0], userLocation[1]], [best.lat, best.lng]);
    const nearestTraffic = aiTrafficZones
      .slice()
      .sort((a, b) => Math.hypot(a.lat - best.lat, a.lng - best.lng) - Math.hypot(b.lat - best.lat, b.lng - best.lng))[0];
    const eta = estimateEtaMinutes(distanceKm, nearestTraffic?.level ?? "LOW", new Date().getHours(), cityMood);

    setSelectedSlot({
      id: 9000 + best.id,
      type: "car",
      x: 0,
      y: 0,
      zone: "standard",
      available: best.available > 0,
      soon: best.available === 0,
      predictedFreeMin: best.available > 0 ? 0 : 6,
      cameraOnline: true,
      lat: best.lat,
      lng: best.lng,
      distanceM: Math.round(distanceKm * 1000)
    });

    setRoutes([
      {
        coords: routeCoords,
        durationMin: eta,
        smartEtaMin: eta,
        etaMin: Math.max(1, eta - 2),
        etaMax: eta + 4,
        traffic: nearestTraffic?.level,
        confidence: "MEDIUM",
        reason: ["AI parking score", "Realtime traffic penalty"],
        penaltyScore: nearestTraffic?.level === "HIGH" ? 40 : nearestTraffic?.level === "MEDIUM" ? 20 : 8,
        distanceKm: Number(distanceKm.toFixed(2)),
        steps: [
          "Bắt đầu từ vị trí hiện tại",
          "Đi theo tuyến AI gợi ý",
          `Đến bãi S${best.id}`
        ]
      }
    ]);
    setActiveRoute(0);
    setDisplayRoute(routeCoords);
    setRouteFocusToken((token) => token + 1);
    setTurnSteps(["AI Planner đang dẫn đường..."]);
    setEtaMinutes(eta);
    setStatusMessage(`AI Planner chọn S${best.id}: ${best.available}/${best.capacity} chỗ trống`);

    const suggestedPlace = aiPlaces.find((place) => place.persona === activePersona);
    if (suggestedPlace) {
      setLandmarkPreview({
        guide: aiGuide,
        landmark: {
          id: `ai-place-${suggestedPlace.id}`,
          name: suggestedPlace.name,
          description: suggestedPlace.desc,
          lat: suggestedPlace.lat,
          lng: suggestedPlace.lng
        }
      });
    }

    const line = `Planner đã chốt điểm gửi xe, ETA khoảng ${eta} phút. Đi theo tui nha.`;
    setStory({ character: aiGuide, text: line });
    speakText(line, aiGuide);
  }

  async function runPitchChoreography() {
    if (pitchRunning) {
      return;
    }

    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    setPitchRunning(true);
    setPitchStepIndex(1);
    setAdminMode("full");
    setBehaviorHint("🎬 Demo: Opening city dashboard");
    await wait(900);

    setPitchStepIndex(2);
    setMapCenter({ lat: 10.772, lng: 106.698 });
    setBehaviorHint("🗺️ Demo: Zoom vào map");
    await wait(900);

    setPitchStepIndex(3);
    chooseDebate("coba");
    await wait(900);

    const scriptedLandmark = guideLandmarks.coba[0];
    if (scriptedLandmark) {
      setPitchStepIndex(4);
      await handleLandmarkClick("coba", scriptedLandmark, true);
      await wait(1100);

      setPitchStepIndex(5);
      setNavigationActive(true);
      setBehaviorHint("🚗 Demo: Route animate + car move");
      await wait(1000);

      setPitchStepIndex(6);
      speakText(`Đây là ${scriptedLandmark.name}, tuyến này phù hợp để khám phá xanh.`, "coba");
      await wait(900);

      const destination = findDestinationByName(scriptedLandmark.name);
      if (destination?.qrChallenges[0]) {
        const challenge = destination.qrChallenges[0];
        completeChallenge(challenge.id, challenge.reward);
        setPitchStepIndex(7);
        setBehaviorHint(`✅ QR unlock thành công: +${challenge.reward} Green Score`);
        await wait(900);
      }
    }

    setPitchStepIndex(8);
    setBehaviorHint("🏁 Demo complete: Journey passport summary ready");
    await wait(700);
    setPitchRunning(false);
  }

  const treeEquivalent = Math.max(0.1, Number((co2SavedKg / 21).toFixed(2)));
  const selectedSlotStatus = selectedSlot
    ? selectedSlot.available
      ? "Available now"
      : selectedSlot.soon || (selectedSlot.predictedFreeMin ?? 99) <= 10
        ? `Likely free in ${selectedSlot.predictedFreeMin ?? 8} min`
        : "Currently full"
    : "Tap a slot marker to inspect";
  const platformStyle = { "--city-tone": cityTone } as CSSProperties;

  return (
    <main className={`platformShell pt-safe pb-safe als-ui-${uiMode}`} style={platformStyle}>
      <MapView
        slots={slots}
        zones={zones}
        layers={layers}
        selectedSlotId={selectedSlot?.id ?? null}
        userLocation={userLocation}
        routeFocusToken={routeFocusToken}
        routeSegments={routeSegments}
        routePath={displayRoute.length > 0 ? displayRoute : routePath}
        routeOpacity={fadingRoute ? 0 : 1}
        activeRoutePenalty={activeRoutePenalty}
        activeRouteIsEco={activeRouteIsEco}
        carPosition={carPosition}
        carAngle={carAngle}
        navigationActive={navigationActive}
        landmarks={allGuideLandmarks}
        activeLandmarkId={activeLandmarkId}
        aiSlots={aiSlots}
        aiTrafficZones={aiTrafficZones}
        aiCameraSlots={aiCameraSlots}
        aiPlaces={aiPlaces}
        evStations={evStations}
        bikeParking={bikeParking}
        visitedDestinationIds={visitedDestinations}
        unlockedSecrets={unlockedSecrets}
        onViewportCenterChange={(center) => {
          setMapCenter(center);
        }}
        onLandmarkClick={(landmark) => {
          void handleLandmarkClick(landmark.guide, landmark);
        }}
        onAIPlaceClick={handleAIPlaceClick}
        onSlotClick={(slot) => {
          if (adminMode === "full") {
            setAdminMode("compact");
          }
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

      {/* THREE-PANEL LAYOUT */}
      
      {/* LEFT PANEL - GUIDE HUB */}
      <GuideHub 
        activePersona={selectedDebate as PersonaKey}
        onPersonaChange={(persona) => {
          setSelectedDebate(persona);
        }}
        onAction={(action) => {
          if (action === "start") {
            void handleFindNearest();
          } else if (action === "listen") {
            speakText(personas[selectedDebate as PersonaKey].text, selectedDebate as PersonaKey);
          }
        }}
      />

      {/* CENTER - DESTINATION CARD */}
      {selectedDestinationId ? (
        <DestinationCard
          data={{
            title: destinationsData[selectedDestinationId]?.title ?? "Unknown",
            description: destinationsData[selectedDestinationId]?.description ?? "",
            vibe: destinationsData[selectedDestinationId]?.vibe
          }}
          onAction={(action) => {
            if (action === "find-parking") {
              void handleFindNearest();
            }
            // Add other action handlers as needed
          }}
          onClose={() => setSelectedDestinationId(null)}
        />
      ) : null}

      {/* RIGHT PANEL - PARKING MONITOR */}
      <div className="parking-panel">
        <h2>Live Smart Parking</h2>
        <div className="liveCameraFrame">
          <video
            src={cameraStreamUrl}
            autoPlay
            muted
            className="liveCameraVideo"
            onError={() => setCameraOffline(true)}
            onCanPlay={() => setCameraOffline(false)}
          />
          {Boolean(selectedSlot || aiCameraSlots.some((camera) => camera.occupied)) ? (
            <div className="vehicle-badge" data-testid="vehicle-badge">
              <strong>Vehicle detected</strong>
              <span>Confidence: {selectedSlot ? 94 : 88}%</span>
            </div>
          ) : null}
        </div>
        {cameraOffline ? <p style={{ color: "#ff8f93", fontSize: "0.75rem" }}>Camera offline</p> : null}
        <div className="parking-stats">
          <div>Available slots: {stats.available}/{slots.length}</div>
          <div>Traffic: {trafficLevel}</div>
          <div>Recommended: {recommendedSlots[0] ? `S${recommendedSlots[0].id}` : "None"}</div>
          <div>Vehicle detected: {Boolean(selectedSlot || aiCameraSlots.some((camera) => camera.occupied)) ? "Yes" : "No"}</div>
          <div>Status: {selectedSlotStatus}</div>
        </div>
      </div>

      {/* KEEP MINIMAL UI FOR INTERACTIONS */}
      {behaviorHint ? <div className="behaviorHintBanner">{behaviorHint}</div> : null}
      
      <TopBar
        query={query}
        onQueryChange={setQuery}
        greenScore={journeyGreenScore}
        profileName={profileName}
        onProfileNameChange={setProfileName}
      />

      {onboardingReady && showOnboarding ? (
        <OnboardingFlow
          onComplete={({ selectedPersona: persona, selectedTransport: transport, journeyGoal: goal }) => {
            // Map old persona names to new ones
            const personaMap: Record<string, PersonaKey> = {
              "coba": "coba",
              "driver": "chutai",
              "youth": "ut"
            };
            const newPersona: PersonaKey = personaMap[persona] || "coba";
            
            setPersona(persona);
            setInitialTransport(transport);
            setJourneyGoal(goal);
            setSelectedDebate(newPersona);
            setDestinationTransport(transport);
            setBehaviorHint(`🧭 ${personaLabelFromId(persona)} route ready • Goal: ${goal}`);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(onboardingStorageKey, "1");
            }
            setShowOnboarding(false);
          }}
        />
      ) : null}
    </main>
  );
}
