export type Slot = {
  id: number;
  type: "car" | "bike";
  zone: "green" | "standard";
  available: boolean;
  predictedFreeMin?: number;
  distanceM?: number;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  updatedAt?: string;
  cameraOnline?: boolean;
};

export type RouteSuggestion = {
  distance: number;
  emission: "low" | "medium" | "high";
  score: number;
  etaMinutes: number;
  destination: string;
  path: Array<[number, number]>;
};

export type LayersState = {
  parking: boolean;
  camera: boolean;
  traffic: boolean;
  route: boolean;
};
