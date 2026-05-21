import { AIParkingSlot, AITrafficZone } from "./useAICity";

export type UserPoint = { lat: number; lng: number };

export function findBestSlot(user: UserPoint, slots: AIParkingSlot[], traffic: AITrafficZone[]) {
  if (!slots.length) {
    return null;
  }

  return slots
    .map((slot) => {
      const distance = Math.hypot(user.lat - slot.lat, user.lng - slot.lng);
      const zone = traffic.find((item) => Math.hypot(item.lat - slot.lat, item.lng - slot.lng) < 0.002);
      const penalty = zone?.level === "HIGH" ? 2 : zone?.level === "MEDIUM" ? 1 : 0;

      return {
        ...slot,
        score: distance + penalty - slot.available * 0.05
      };
    })
    .sort((a, b) => a.score - b.score)[0];
}

export function generateRoute(start: UserPoint, end: UserPoint) {
  const points: Array<[number, number]> = [];

  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    points.push([
      start.lat + (end.lat - start.lat) * t,
      start.lng + (end.lng - start.lng) * t
    ]);
  }

  return points;
}
