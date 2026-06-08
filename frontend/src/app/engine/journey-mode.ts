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
    impact: `${co2SavedKg}kg CO₂ saved • ${walkingMinutes} walking minutes`,
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
      title: "Discover history",
      objective: "Visit one heritage spot and hear its original story.",
      reward: "",
      completed: hasHistory || visits.length >= 1
    },
    {
      id: "mission-2",
      title: "Eat local",
      objective: "Stop at an everyday spot or a local area with the right vibe.",
      reward: "",
      completed: hasLocal || visits.length >= 2
    },
    {
      id: "mission-3",
      title: "Sunset walk",
      objective: "Walk for a while as the city starts to wind down.",
      reward: "",
      completed: hasDaily || mood === "CALM"
    },
    {
      id: "mission-4",
      title: "Hidden alley",
      objective: "Find a hidden alley or a little-known corner.",
      reward: "",
      completed: hasHiddenPath || visits.length >= 3
    }
  ];
}

export function buildPersonaDebate(place: PlaceData, intelligence: DestinationIntelligence, context: NarrativeContext): PersonaDebateLine[] {
  const trafficLine =
    context.traffic === "HIGH"
      ? "Traffic is tight, so park a little farther away to avoid getting stuck."
      : context.traffic === "MEDIUM"
        ? "Traffic is moderate, so you can still drive and watch for a good stop."
        : "The roads are light, so one more stop is fine.";

  return [
    {
      persona: "COBA",
      label: "Coba",
      line: `${place.name} is best at ${intelligence.bestVisitTime}, when it feels cool and its slower rhythm comes through.`
    },
    {
      persona: "DRIVER",
      label: "Driver",
      line: `${trafficLine} ${intelligence.bestParkingStrategy}`
    },
    {
      persona: "YOUTH",
      label: "Youth",
      line: `${place.name} feels ${intelligence.walkingComfort.toLowerCase()} right now, so walking in makes it feel more local.`
    }
  ];
}