import type { Challenge } from "../data/destinations";

export type TransportType = "bike" | "ev" | "walk" | "motorbike";

export function addGreenScore(current: number, value: number): number {
  return current + value;
}

export function rewardTransport(type: TransportType): number {
  const rewards: Record<TransportType, number> = {
    bike: 20,
    ev: 25,
    walk: 30,
    motorbike: 5
  };

  return rewards[type] || 0;
}

export function rewardQR(challenge: Challenge): number {
  return challenge.reward;
}

export function rankFromScore(score: number): string {
  if (score >= 500) {
    return "Saigon Eco Legend";
  }
  if (score >= 250) {
    return "Green Citizen";
  }
  if (score >= 100) {
    return "Eco Explorer";
  }
  return "Begin Journey";
}
