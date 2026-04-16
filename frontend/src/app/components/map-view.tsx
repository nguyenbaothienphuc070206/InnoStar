"use client";

import L from "leaflet";
import { Fragment } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import { createMapPlugins } from "./map-plugins";
import { LayersState, Slot } from "./types";

type MapViewProps = {
  slots: Slot[];
  layers: LayersState;
  selectedSlotId: number | null;
  routePath: Array<[number, number]>;
  onSlotClick: (slot: Slot) => void;
};

const center: [number, number] = [10.772, 106.698];

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
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

export default function MapView({ slots, layers, selectedSlotId, routePath, onSlotClick }: MapViewProps) {
  const plugins = createMapPlugins();

  return (
    <MapContainer center={center} zoom={15} className="mapCanvas" zoomControl={false} preferCanvas data-testid="map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {plugins.map((plugin) => (
        <Fragment key={plugin.id}>{plugin.render({ slots, layers, selectedSlotId, routePath, onSlotClick, toLatLng, markerIcon })}</Fragment>
      ))}
    </MapContainer>
  );
}
