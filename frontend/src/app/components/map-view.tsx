"use client";

import L from "leaflet";
import { Fragment, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { createMapPlugins } from "./map-plugins";
import { LayersState, Slot, ZonePoint } from "./types";

type MapViewProps = {
  slots: Slot[];
  zones: ZonePoint[];
  layers: LayersState;
  selectedSlotId: number | null;
  userLocation: [number, number];
  routeFocusToken: number;
  routeSegments: Array<{ positions: Array<[number, number]>; color: string }>;
  routeOpacity: number;
  routePath: Array<[number, number]>;
  activeRoutePenalty: number;
  activeRouteIsEco: boolean;
  carPosition: [number, number] | null;
  carAngle: number;
  navigationActive: boolean;
  landmarks: Array<{ id: string; name: string; description: string; lat: number; lng: number; guide: "coba" | "driver" | "youth" }>;
  activeLandmarkId: string | null;
  aiSlots: Array<{ id: number; lat: number; lng: number; capacity: number; available: number }>;
  aiTrafficZones: Array<{ zone: string; lat: number; lng: number; level: "LOW" | "MEDIUM" | "HIGH" }>;
  aiCameraSlots: Array<{ id: string; lat: number; lng: number; occupied: boolean; images: string[] }>;
  aiPlaces: Array<{ id: number; name: string; type: "history" | "daily" | "local"; persona: "COBA" | "DRIVER" | "YOUTH"; lat: number; lng: number; desc: string }>;
  evStations: Array<{ id: string; name: string; lat: number; lng: number; plugs: number; available: number; speed: "AC" | "DC"; operator: string }>;
  bikeParking: Array<{ id: string; name: string; lat: number; lng: number; docks: number; available: number; guarded: boolean }>;
  visitedDestinationIds: string[];
  unlockedSecrets: string[];
  onSlotClick: (slot: Slot) => void;
  onLandmarkClick: (landmark: { id: string; name: string; description: string; lat: number; lng: number; guide: "coba" | "driver" | "youth" }) => void;
  onAIPlaceClick: (place: { id: number; name: string; type: "history" | "daily" | "local"; persona: "COBA" | "DRIVER" | "YOUTH"; lat: number; lng: number; desc: string }) => void;
  onViewportCenterChange: (center: { lat: number; lng: number }) => void;
};

const center: [number, number] = [10.772, 106.698];

type ViewportTrackerProps = {
  onViewportCenterChange: (center: { lat: number; lng: number }) => void;
  onBoundsChange: (bounds: { north: number; south: number; east: number; west: number }) => void;
};

function ViewportTracker({ onViewportCenterChange, onBoundsChange }: ViewportTrackerProps) {
  useMapEvents({
    moveend: (event) => {
      const point = event.target.getCenter();
      const bounds = event.target.getBounds();
      onViewportCenterChange({ lat: point.lat, lng: point.lng });
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
    },
    zoomend: (event) => {
      const point = event.target.getCenter();
      const bounds = event.target.getBounds();
      onViewportCenterChange({ lat: point.lat, lng: point.lng });
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
    }
  });

  return null;
}

function toLatLng(slot: Slot): [number, number] {
  if (typeof slot.lat === "number" && typeof slot.lng === "number") {
    return [slot.lat, slot.lng];
  }
  const lat = 10.7702 + slot.y * 0.00012;
  const lng = 106.6932 + slot.x * 0.00014;
  return [lat, lng];
}

function markerIcon(slot: Slot, isSelected: boolean): L.DivIcon {
  const soonFree = !slot.available && (slot.soon || (slot.predictedFreeMin ?? 99) <= 10);
  const stateClass = slot.available ? "slotMarkerGreen" : soonFree ? "slotMarkerSoon" : "slotMarkerRed";
  const selectedClass = isSelected ? "slotMarkerSelected" : "";
  const status = slot.available ? "free" : soonFree ? "soon" : "full";

  return L.divIcon({
    className: "slotMarkerHost",
    html: `<span class="slotMarker marker-${status} ${stateClass} ${selectedClass}" data-testid="slot-marker-${slot.id}" data-status="${status}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

export default function MapView({ slots, zones, layers, selectedSlotId, userLocation, routeFocusToken, routeSegments, routeOpacity, routePath, activeRoutePenalty, activeRouteIsEco, carPosition, carAngle, navigationActive, landmarks, activeLandmarkId, aiSlots, aiTrafficZones, aiCameraSlots, aiPlaces, evStations, bikeParking, visitedDestinationIds, unlockedSecrets, onSlotClick, onLandmarkClick, onAIPlaceClick, onViewportCenterChange }: MapViewProps) {
  const plugins = createMapPlugins();
  const [viewportBounds, setViewportBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  return (
    <MapContainer center={center} zoom={15} className="mapCanvas" zoomControl={false} preferCanvas data-testid="map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ViewportTracker onViewportCenterChange={onViewportCenterChange} onBoundsChange={setViewportBounds} />

      {plugins.map((plugin) => (
        <Fragment key={plugin.id}>{plugin.render({ slots, zones, layers, selectedSlotId, userLocation, routeFocusToken, routeSegments, routeOpacity, routePath, activeRoutePenalty, activeRouteIsEco, carPosition, carAngle, navigationActive, landmarks, activeLandmarkId, aiSlots, aiTrafficZones, aiCameraSlots, aiPlaces, evStations, bikeParking, visitedDestinationIds, unlockedSecrets, onSlotClick, onLandmarkClick, onAIPlaceClick, toLatLng, markerIcon, viewportBounds })}</Fragment>
      ))}
    </MapContainer>
  );
}
