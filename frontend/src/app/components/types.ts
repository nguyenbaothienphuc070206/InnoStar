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

export type RouteSuggestion = {
  distance: number;
  emission: "low" | "medium" | "high";
  score: number;
  etaMinutes: number;
  destination: string;
  path: Array<[number, number]>;
};

export type ZonePoint = {
  id: string;
  lat: number;
  lng: number;
  value: number;
  type: "green" | "yellow" | "red";
};

export type LayersState = {
  parking: boolean;
  camera: boolean;
  traffic: boolean;
  heat: boolean;
  route: boolean;
  story: boolean;
};
