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

function markerIcon(available: boolean): L.DivIcon {
  return L.divIcon({
    className: "slotMarkerHost",
    html: `<span class="slotMarker ${available ? "slotMarkerGreen" : "slotMarkerRed"}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

export default function MapView({ slots, layers, routePath, onSlotClick }: MapViewProps) {
  const plugins = createMapPlugins();

  return (
    <MapContainer center={center} zoom={15} className="mapCanvas" zoomControl={false} preferCanvas data-testid="map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {plugins.map((plugin) => (
        <Fragment key={plugin.id}>{plugin.render({ slots, layers, routePath, onSlotClick, toLatLng, markerIcon })}</Fragment>
      ))}
    </MapContainer>
  );
}
