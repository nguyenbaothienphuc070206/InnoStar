export type Slot = {
  id: number;
  type: "car" | "bike";
  zone: "green" | "standard";
  available: boolean;
  x: number;
  y: number;
  updatedAt?: string;
};

export type RouteResult = {
  distance: number;
  emission: "low" | "medium" | "high";
  score: number;
  etaMinutes: number;
  destination: string;
  path: Array<[number, number]>;
};

export type SlotPrediction = {
  slotId: number;
  currentlyAvailable: boolean;
  predictedAvailableAt: string;
  confidence: number;
};

export type ZoneHeat = {
  zone: "green" | "standard";
  occupancyRate: number;
};

export type ParkingAnalytics = {
  occupancyRate: number;
  greenAvailabilityRate: number;
  totalReports: number;
  eventsInMemory: number;
  heatmap: ZoneHeat[];
};
