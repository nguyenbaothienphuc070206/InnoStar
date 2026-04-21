export type CityTraffic = "LOW" | "MEDIUM" | "HIGH";
export type CityMood = "CALM" | "STRESSED" | "CHAOTIC";
export type CityIntent = "HURRY" | "EXPLORE" | "ECO";

export type CityState = {
  traffic: CityTraffic;
  availability: number;
  mood: CityMood;
  intent: CityIntent;
  hasSlot: boolean;
  hasRoute: boolean;
  navigating: boolean;
};

export type RouteType = "fastest" | "eco" | "balanced";
export type VoiceType = "driver" | "coba" | "neutral";
export type UIMode = "compact" | "relaxed";

export type CityExperience = {
  routeType: RouteType;
  color: string;
  voice: VoiceType;
  uiMode: UIMode;
  animationSpeed: number;
};

export type EngineStep = "find" | "route" | "navigate" | "idle";

export function deriveExperience(state: CityState): CityExperience {
  return {
    routeType: state.intent === "HURRY" ? "fastest" : state.intent === "ECO" ? "eco" : "balanced",
    color: state.mood === "CHAOTIC" ? "#ff4d4f" : state.mood === "STRESSED" ? "#faad14" : "#5DFF34",
    voice: state.intent === "HURRY" ? "driver" : state.intent === "EXPLORE" ? "coba" : "neutral",
    uiMode: state.mood === "CHAOTIC" ? "compact" : "relaxed",
    animationSpeed: state.mood === "CHAOTIC" ? 2 : 1
  };
}

export function nextStep(state: CityState): EngineStep {
  if (!state.hasSlot) {
    return "find";
  }
  if (!state.hasRoute) {
    return "route";
  }
  if (!state.navigating) {
    return "navigate";
  }
  return "idle";
}

export function getSuggestion(state: CityState): string {
  if (state.mood === "CHAOTIC") {
    return "Thanh pho dang dong, nen di route eco hoac vong";
  }
  if (state.intent === "HURRY") {
    return "Ban dang voi, chon duong nhanh nhat";
  }
  return "";
}
