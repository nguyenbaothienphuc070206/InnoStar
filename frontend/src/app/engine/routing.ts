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

export async function generateRoute(start: UserPoint, end: UserPoint) {
  const fallback: Array<[number, number]> = [
    [start.lat, start.lng],
    [end.lat, end.lng]
  ];

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}` +
      `?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const response = await fetch(url);

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as {
      routes?: Array<{
        geometry?: { coordinates?: Array<[number, number]> };
      }>;
    };

    const coordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!coordinates?.length) {
      return fallback;
    }

    return coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  } catch {
    return fallback;
  }
}
