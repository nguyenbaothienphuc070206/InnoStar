import { CityMood } from "./cityEngine";
import { DestinationIntelligence, NarrativeContext, Persona, PlaceData } from "./place-narrative";

export type JourneyVisit = {
  id: number;
  name: string;
  placeType: PlaceData["type"];
  persona: Persona;
  mood: CityMood;
  bestVisitTime: string;
  crowdLevel: DestinationIntelligence["crowdLevel"];
  walkability: number;
  ecoScore: number;
  co2SavedKg: number;
  walkingMinutes: number;
  impact: string;
  hiddenPath: string;
};

export type CampaignMission = {
  id: string;
  title: string;
  objective: string;
  reward: string;
  completed: boolean;
};

export type PersonaDebateLine = {
  persona: Persona;
  label: string;
  line: string;
};

export type JourneySummary = {
  visitedCount: number;
  totalCo2SavedKg: number;
  totalWalkingMinutes: number;
  congestionAvoided: number;
  badge: string;
};

export function buildJourneyVisit(place: PlaceData, intelligence: DestinationIntelligence, mood: CityMood): JourneyVisit {
  const walkingMinutes = Math.max(7, Math.round(intelligence.walkability * 1.7));
  const co2SavedKg = Number((intelligence.ecoScore / 52).toFixed(1));

  return {
    id: place.id,
    name: place.name,
    placeType: place.type,
    persona: place.persona,
    mood,
    bestVisitTime: intelligence.bestVisitTime,
    crowdLevel: intelligence.crowdLevel,
    walkability: intelligence.walkability,
    ecoScore: intelligence.ecoScore,
    co2SavedKg,
    walkingMinutes,
    impact: `${co2SavedKg}kg CO₂ saved • ${walkingMinutes} phút đi bộ`,
    hiddenPath: intelligence.localSecret
  };
}

export function buildJourneySummary(visits: JourneyVisit[]): JourneySummary {
  const totalCo2SavedKg = Number(visits.reduce((sum, visit) => sum + visit.co2SavedKg, 0).toFixed(1));
  const totalWalkingMinutes = visits.reduce((sum, visit) => sum + visit.walkingMinutes, 0);
  const congestionAvoided = visits.length;
  const badge = visits.length >= 4 ? "Urban Explorer Badge" : visits.length >= 2 ? "Green Walker Badge" : "Starter Badge";

  return {
    visitedCount: visits.length,
    totalCo2SavedKg,
    totalWalkingMinutes,
    congestionAvoided,
    badge
  };
}

export function buildCampaignMissions(visits: JourneyVisit[], mood: CityMood): CampaignMission[] {
  const hasHistory = visits.some((visit) => visit.placeType === "history");
  const hasLocal = visits.some((visit) => visit.placeType === "local");
  const hasDaily = visits.some((visit) => visit.placeType === "daily");
  const hasHiddenPath = visits.some((visit) => Boolean(visit.hiddenPath));

  return [
    {
      id: "mission-1",
      title: "Khám phá lịch sử",
      objective: "Đi một điểm di sản và nghe câu chuyện gốc của nó.",
      reward: "Unlock: historical route pack",
      completed: hasHistory || visits.length >= 1
    },
    {
      id: "mission-2",
      title: "Ăn local",
      objective: "Dừng ở một điểm đời thường hoặc khu local đúng vibe.",
      reward: "Unlock: local food trail",
      completed: hasLocal || visits.length >= 2
    },
    {
      id: "mission-3",
      title: "Sunset walk",
      objective: "Đi bộ một đoạn khi thành phố đang dịu xuống.",
      reward: "Unlock: sunset timeline",
      completed: hasDaily || mood === "CALM"
    },
    {
      id: "mission-4",
      title: "Hidden alley",
      objective: "Bắt một lối hẻm hoặc góc khuất ít người biết.",
      reward: "Unlock: hidden alley ending",
      completed: hasHiddenPath || visits.length >= 3
    }
  ];
}

export function buildPersonaDebate(place: PlaceData, intelligence: DestinationIntelligence, context: NarrativeContext): PersonaDebateLine[] {
  const trafficLine =
    context.traffic === "HIGH"
      ? "Đường đang căng, nên tách xe ra xa một chút cho đỡ kẹt."
      : context.traffic === "MEDIUM"
        ? "Lưu lượng vừa phải, mình vẫn có thể vừa lái vừa canh điểm dừng hợp lý."
        : "Đường đang nhẹ, ghé thêm một vòng nữa cũng không sao.";

  return [
    {
      persona: "COBA",
      label: "Cô Ba",
      line: `${place.name} nên đi vào ${intelligence.bestVisitTime} để vừa mát vừa dễ cảm được nhịp chậm của nơi này.`
    },
    {
      persona: "DRIVER",
      label: "Chú tài",
      line: `${trafficLine} ${intelligence.bestParkingStrategy}`
    },
    {
      persona: "YOUTH",
      label: "Thanh niên",
      line: `${place.name} lúc này ${intelligence.walkingComfort.toLowerCase()} nên đi bộ vào sẽ ra chất local hơn.`
    }
  ];
}