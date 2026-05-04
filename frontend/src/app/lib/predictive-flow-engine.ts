import type { CityMood } from "../engine/cityEngine";

export type CrowdPrediction = {
  area: string;
  nextMinutes: number;
  densityIncreasePct: number;
  trafficBias: number;
  recommendation: string;
};

export function hourCongestionBias(hour: number): number {
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) {
    return 30;
  }
  if ((hour >= 10 && hour <= 12) || (hour >= 15 && hour <= 16)) {
    return 14;
  }
  return 4;
}

export function predictCrowd(nextMinutes: number, weather: "clear" | "rain", trend: number, area: string, hour: number): CrowdPrediction {
  const weatherPenalty = weather === "rain" ? 8 : 0;
  const base = hourCongestionBias(hour) + trend + weatherPenalty;
  const densityIncreasePct = Math.max(5, Math.min(68, Math.round(base)));

  const recommendation =
    densityIncreasePct >= 30
      ? `Predictive AI Routing: reroute sớm khỏi ${area}, ưu tiên trục xanh phụ.`
      : `Predictive AI Routing: giữ tuyến hiện tại, theo dõi ${area} mỗi 5 phút.`;

  return {
    area,
    nextMinutes,
    densityIncreasePct,
    trafficBias: base,
    recommendation
  };
}

export function estimateEtaMinutes(distanceKm: number, traffic: "LOW" | "MEDIUM" | "HIGH", hour: number, mood: CityMood): number {
  const baseSpeed = traffic === "HIGH" ? 12 : traffic === "MEDIUM" ? 22 : 35;
  const moodPenalty = mood === "CHAOTIC" ? 0.86 : mood === "STRESSED" ? 0.93 : 1;
  const rushPenalty = (hour >= 17 && hour <= 20) || (hour >= 7 && hour <= 9) ? 0.84 : 1;
  const effectiveSpeed = Math.max(8, baseSpeed * moodPenalty * rushPenalty);

  return Math.max(2, Math.round((distanceKm / effectiveSpeed) * 60));
}
