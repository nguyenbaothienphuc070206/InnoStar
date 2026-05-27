export type Slot = {
  id: number;
  type: "car" | "bike";
  zone: "green" | "standard";
  status?: "free" | "reserved" | "occupied" | "leaving";
  available: boolean;
  soon?: boolean;
  predictedFreeMin?: number;
  distanceM?: number;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  updatedAt?: string;
  cameraOnline?: boolean;
};

export type TrafficLevel = "LOW" | "MEDIUM" | "HIGH";

export type CityUser = {
  id: string;
  lat: number;
  lng: number;
  speedKmh: number;
  target: "parking" | "city-walk";
  urgency?: "low" | "medium" | "high";
  preferredProfile?: "fastest" | "eco" | "chill";
  reservedSlotId?: number;
};

export type CameraNode = {
  id: string;
  lat: number;
  lng: number;
  status: "online" | "offline";
  vehicles: number;
  latencyMs: number;
  updatedAt: string;
};

export type IncidentLevel = "critical" | "warning" | "info";

export type ParkingIncident = {
  id: string;
  level: IncidentLevel;
  message: string;
  source: string;
  createdAt: string;
};

export type ParkingEvent = {
  event: "SLOT_OCCUPIED" | "SLOT_RELEASED" | "CAMERA_OFFLINE" | "PARKING_SHORTAGE";
  slotId?: string;
  cameraId?: string;
  time: string;
  message: string;
};

export type ParkingMetrics = {
  availability: number;
  traffic: TrafficLevel;
  apiLatency: number;
  uptime: number;
  co2ReductionKg: number;
};

export type HistoryPoint = {
  time: string;
  availability: number;
  traffic: TrafficLevel;
};

export type ParkingStreamPayload = {
  event: "CITY_TICK";
  timestamp: string;
  slots: Slot[];
  users: CityUser[];
  cameras: CameraNode[];
  metrics: ParkingMetrics;
  incidents: ParkingIncident[];
  history: HistoryPoint[];
  events: ParkingEvent[];
};

export type SlotDiff = {
  type: "slot_update";
  id: string;
  status?: "free" | "reserved" | "occupied" | "leaving";
  occupied: boolean;
  soon: boolean;
  predictedFreeMin: number;
  cameraOnline: boolean;
  distanceM: number;
  updatedAt: string;
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

export type RouteProfile = "fastest" | "eco" | "chill";

export type RouteOption = {
  profile: RouteProfile;
  label: string;
  distance: number;
  etaMinutes: number;
  etaMin?: number;
  etaMax?: number;
  traffic?: TrafficLevel;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  reason?: string[];
  congestion: number;
  co2EstimateKg: number;
  path: Array<[number, number]>;
};
