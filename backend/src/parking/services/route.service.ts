import { Injectable } from "@nestjs/common";
import { RouteOption, RouteProfile, RouteResult, Slot, TrafficLevel } from "../parking.types";

@Injectable()
export class RouteService {
  getRouteOptions(fromLat: number, fromLng: number, toLat: number, toLng: number, traffic: TrafficLevel): RouteOption[] {
    const from: [number, number] = [fromLat, fromLng];
    const to: [number, number] = [toLat, toLng];

    const profiles: Array<{ profile: RouteProfile; label: string; speedKmh: number; jitter: number; co2Factor: number }> = [
      { profile: "fastest", label: "Fastest", speedKmh: 34, jitter: 0.00013, co2Factor: 1.2 },
      { profile: "eco", label: "Eco", speedKmh: 28, jitter: 0.0001, co2Factor: 0.8 },
      { profile: "chill", label: "Chill", speedKmh: 24, jitter: 0.00016, co2Factor: 1.0 }
    ];

    return profiles.map((item) => {
      const path = this.generateFakePath(from, to, item.jitter);
      const distance = this.computeDistanceMeters(from, to);
      const congestionBase = traffic === "HIGH" ? 0.85 : traffic === "MEDIUM" ? 0.55 : 0.25;
      const profilePenalty = item.profile === "fastest" ? 0.12 : item.profile === "eco" ? -0.06 : 0.0;
      const congestion = Number(this.clamp(congestionBase + profilePenalty, 0.05, 0.98).toFixed(2));
      const etaMinutes = Math.max(2, Math.round(distance / (item.speedKmh * 1000 / 60) * (1 + congestion * 0.42)));
      const co2EstimateKg = Number(((distance / 1000) * 0.09 * item.co2Factor * (1 + congestion * 0.25)).toFixed(3));

      return {
        profile: item.profile,
        label: item.label,
        distance: Number(distance.toFixed(0)),
        etaMinutes,
        congestion,
        co2EstimateKg,
        path
      };
    });
  }

  getGreenRoute(destination: string, slots: Slot[]): RouteResult {
    const availableGreenSlots = slots.filter((slot) => slot.available && slot.zone === "green").length;
    const score = Math.min(99, 72 + availableGreenSlots * 4);
    const from = [10.7732, 106.698] as [number, number];
    const to = [10.7768, 106.7071] as [number, number];

    return {
      destination,
      distance: Number((4.1 + availableGreenSlots * 0.3).toFixed(1)),
      emission: availableGreenSlots >= 2 ? "low" : "medium",
      score,
      etaMinutes: Math.max(8, 20 - availableGreenSlots * 2),
      path: this.generateFakePath(from, to, 0.00009)
    };
  }

  private generateFakePath(from: [number, number], to: [number, number], jitter = 0.00014): Array<[number, number]> {
    const steps = 20;
    const points: Array<[number, number]> = [];

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const lat = from[0] + (to[0] - from[0]) * t + (Math.random() - 0.5) * jitter;
      const lng = from[1] + (to[1] - from[1]) * t + (Math.random() - 0.5) * jitter;
      points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
    }

    return points;
  }

  private computeDistanceMeters(a: [number, number], b: [number, number]): number {
    const latDiff = (a[0] - b[0]) * 111_000;
    const lngDiff = (a[1] - b[1]) * 111_000;
    return Math.hypot(latDiff, lngDiff);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
