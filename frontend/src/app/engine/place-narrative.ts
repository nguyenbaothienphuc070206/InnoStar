export type Persona = "COBA" | "DRIVER" | "YOUTH";
export type TrafficLevel = "LOW" | "MEDIUM" | "HIGH";
export type CityMood = "CALM" | "STRESSED" | "CHAOTIC";

export interface PlaceData {
  id: number;
  name: string;
  type: "history" | "daily" | "local";
  persona: Persona;
  lat: number;
  lng: number;
  overview: string;
  history: string;
  greenStoryHook: string;
  walkingRoute: string;
  ecoBenefit: string;
  recommendedParking: string;
  hiddenSpot: string;
}

export type NarrativeContext = {
  persona: Persona;
  traffic: TrafficLevel;
  cityMood: CityMood;
  crowdLevel?: "Low" | "Medium" | "High";
  timeLabel?: string;
  selectedSlotAvailable?: boolean;
  visitedCount?: number;
};

export type DestinationIntelligence = {
  crowdLevel: "Low" | "Medium" | "High";
  bestVisitTime: string;
  walkability: number;
  ecoScore: number;
  localSecret: string;
  bestParkingStrategy: string;
  walkingComfort: string;
  npcStory: Record<Persona, string>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 9973;
  }
  return hash;
}

function defaultContext(persona: Persona): NarrativeContext {
  const hour = new Date().getHours();

  return {
    persona,
    traffic: hour >= 16 && hour <= 19 ? "HIGH" : hour >= 10 && hour <= 15 ? "MEDIUM" : "LOW",
    cityMood: hour >= 16 && hour <= 19 ? "CHAOTIC" : hour >= 7 && hour <= 9 ? "STRESSED" : "CALM",
    timeLabel: `${String(hour).padStart(2, "0")}:30`
  };
}

export function buildDestinationIntelligence(place: PlaceData, context: NarrativeContext): DestinationIntelligence {
  const hash = hashString(`${place.name}-${place.id}-${context.persona}`);
  const crowdLevel =
    context.crowdLevel ??
    (context.traffic === "HIGH" ? "High" : context.traffic === "MEDIUM" ? "Medium" : hash % 2 === 0 ? "Low" : "Medium");
  const timeLabel = context.timeLabel ?? `${String(8 + (hash % 8)).padStart(2, "0")}:30`;

  const baseWalkability = place.type === "history" ? 8.6 : place.type === "local" ? 8.3 : 7.8;
  const moodBoost = context.cityMood === "CALM" ? 0.7 : context.cityMood === "STRESSED" ? 0.15 : -0.35;
  const trafficPenalty = context.traffic === "HIGH" ? 1.1 : context.traffic === "MEDIUM" ? 0.45 : 0;
  const crowdPenalty = crowdLevel === "High" ? 0.8 : crowdLevel === "Medium" ? 0.3 : 0;
  const walkability = clamp(baseWalkability + moodBoost - trafficPenalty - crowdPenalty + (hash % 7) * 0.08, 0, 10);
  const ecoScore = clamp(74 + walkability * 2.1 - crowdPenalty * 5 + (context.selectedSlotAvailable ? 4 : 0), 0, 100);

  const parkingLines: Record<Persona, string> = {
    COBA: `Chọn bãi gần nhất rồi đi bộ theo tuyến rợp bóng cây để giữ nhịp thong thả.`,
    DRIVER: `Gửi ở bãi phụ, canh lối ra nhanh để không bị kẹt ở khúc cuối.`,
    YOUTH: `Park ở bên ngoài một chút, rồi men theo hẻm local để vào điểm này cho đúng vibe.`
  };

  const comfortByMood: Record<CityMood, string> = {
    CALM: "Đi bộ rất êm, không gian mở và dễ dừng lại chụp hình.",
    STRESSED: "Đi bộ vẫn ổn nhưng nên ưu tiên lối ngắn và có bóng râm.",
    CHAOTIC: "Nên đi theo lối vòng, tránh lõi trung tâm để đỡ ngợp xe cộ."
  };

  const storyByPersona: Record<Persona, string> = {
    COBA: `Cô Ba thấy ${place.name} hợp nhất lúc ${timeLabel}; mình đi chậm một chút, cảm nhận lịch sử và giữ nhịp xanh cho cả chuyến.`,
    DRIVER: `Chú tài chốt ${place.name} vào ${timeLabel} vì lúc đó lối vào dễ xoay hơn và chỗ đỗ phụ đỡ căng.`,
    YOUTH: `Thanh niên ghé ${place.name} vào ${timeLabel} là vừa đẹp: đủ chill để đi bộ, đủ thoáng để mở ra góc local ít người biết.`
  };

  return {
    crowdLevel,
    bestVisitTime: timeLabel,
    walkability: Number(walkability.toFixed(1)),
    ecoScore: Number(ecoScore.toFixed(0)),
    localSecret: place.hiddenSpot,
    bestParkingStrategy: parkingLines[context.persona],
    walkingComfort: comfortByMood[context.cityMood],
    npcStory: storyByPersona
  };
}

export function generateAdaptiveStory(place: PlaceData, context: NarrativeContext): string[] {
  const intelligence = buildDestinationIntelligence(place, context);
  const persona = context.persona;

  const routeLine =
    persona === "DRIVER"
      ? `${place.recommendedParking} • ${intelligence.bestParkingStrategy}`
      : `${place.walkingRoute} • ${intelligence.walkingComfort}`;

  return [
    intelligence.npcStory[persona],
    place.overview,
    place.history,
    `Crowd level: ${intelligence.crowdLevel} • best at ${intelligence.bestVisitTime}`,
    routeLine,
    `Green score ${intelligence.ecoScore}/100 • walkability ${intelligence.walkability}/10`,
    `Hidden path: ${intelligence.localSecret}`
  ];
}

export function generateNarrativeScript(place: PlaceData, persona: Persona, context?: Partial<NarrativeContext>): string[] {
  return generateAdaptiveStory(place, {
    ...defaultContext(persona),
    ...context,
    persona
  });
}

export function generateGreenTips(place: PlaceData): string[] {
  return [
    `🚗 Gửi xe: ${place.recommendedParking}`,
    `🚶 Tuyến đi bộ: ${place.walkingRoute}`,
    `🌱 Lợi ích: ${place.ecoBenefit}`,
    `✨ Bí kíp local: ${place.hiddenSpot}`
  ];
}
