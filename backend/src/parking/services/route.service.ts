import { Injectable } from "@nestjs/common";
import { RouteOption, RouteProfile, RouteResult, Slot, TrafficLevel } from "../parking.types";

@Injectable()
export class RouteService {
  getRouteOptions(fromLat: number, fromLng: number, toLat: number, toLng: number, traffic: TrafficLevel): RouteOption[] {
    const from: [number, number] = [fromLat, fromLng];
    const to: [number, number] = [toLat, toLng];
    const distanceKm = this.calcDistanceKm(from, to);

    const profiles: Array<{ profile: RouteProfile; label: string; profileFactor: number; co2Factor: number }> = [
      { profile: "fastest", label: "Fastest", profileFactor: 1.1, co2Factor: 1.15 },
      { profile: "eco", label: "Eco", profileFactor: 0.9, co2Factor: 0.8 },
      { profile: "chill", label: "Chill", profileFactor: 0.78, co2Factor: 0.95 }
    ];

    return profiles.map((item) => {
      const path = this.generateGridPath(from, to, item.profile);
      let speed = this.getBaseSpeedKmh(traffic) * item.profileFactor;

      const downtown = from[0] > 10.775 || to[0] > 10.775;
      if (downtown) {
        speed *= 0.7;
      }

      const hour = new Date().getHours();
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        speed *= 0.6;
      }

      const noise = 0.9 + Math.random() * 0.2;
      const etaMinutes = Math.max(1, Math.round((distanceKm / Math.max(6, speed)) * 60 * noise));
      const etaMin = Math.max(1, etaMinutes - 1);
      const etaMax = Math.max(etaMin + 1, etaMinutes + 2);
      const congestion = Number(
        this.clamp(
          traffic === "HIGH" ? 0.78 : traffic === "MEDIUM" ? 0.52 : 0.28,
          0.05,
          0.98
        ).toFixed(2)
      );
      const co2EstimateKg = Number((distanceKm * 0.09 * item.co2Factor).toFixed(3));

      return {
        profile: item.profile,
        label: item.label,
        distance: Number((distanceKm * 1000).toFixed(0)),
        etaMinutes,
        etaMin,
        etaMax,
        traffic,
        confidence: traffic === "LOW" ? "HIGH" : traffic === "MEDIUM" ? "MEDIUM" : "LOW",
        reason: [
          `Traffic ${traffic.toLowerCase()} with average speed ${Math.round(speed)} km/h`,
          `Estimated CO2 ${co2EstimateKg} kg`,
          downtown ? "Downtown slowdown applied" : "No downtown penalty"
        ],
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

  private generateGridPath(from: [number, number], to: [number, number], profile: RouteProfile): Array<[number, number]> {
    const midLngBias = profile === "eco" ? -0.00035 : profile === "chill" ? 0.00025 : 0;
    const mid: [number, number] = [to[0], from[1] + midLngBias];

    return [
      [Number(from[0].toFixed(6)), Number(from[1].toFixed(6))],
      [Number(mid[0].toFixed(6)), Number(mid[1].toFixed(6))],
      [Number(to[0].toFixed(6)), Number(to[1].toFixed(6))]
    ];
  }

  private generateFakePath(from: [number, number], to: [number, number], wobble: number): Array<[number, number]> {
    const points: Array<[number, number]> = [];
    const steps = 14;

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const lat = from[0] + (to[0] - from[0]) * t + Math.sin(t * Math.PI) * wobble;
      const lng = from[1] + (to[1] - from[1]) * t + Math.cos(t * Math.PI) * wobble * 0.6;
      points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
    }

    return points;
  }

  private calcDistanceKm(a: [number, number], b: [number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy) * 111;
  }

  private getBaseSpeedKmh(traffic: TrafficLevel): number {
    if (traffic === "HIGH") {
      return 12;
    }
    if (traffic === "MEDIUM") {
      return 22;
    }
    return 35;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
