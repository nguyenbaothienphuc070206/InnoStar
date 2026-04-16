"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";

type Slot = {
  id: number;
  type: "car" | "bike";
  zone: "green" | "standard";
  available: boolean;
  x: number;
  y: number;
};

type LiveMapProps = {
  slots: Slot[];
  routePath?: Array<[number, number]>;
};

const center: [number, number] = [10.7768, 106.7009];

function slotToLatLng(slot: Slot): [number, number] {
  const lat = 10.7702 + slot.y * 0.00012;
  const lng = 106.6932 + slot.x * 0.00014;
  return [lat, lng];
}

export default function LiveMap({ slots, routePath = [] }: LiveMapProps) {
  return (
    <MapContainer center={center} zoom={15} className="leafletCanvas" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routePath.length > 1 ? <Polyline positions={routePath} color="#1FF4FA" weight={5} opacity={0.85} /> : null}

      {slots.map((slot) => (
        <CircleMarker
          key={slot.id}
          center={slotToLatLng(slot)}
          radius={slot.available ? 10 : 8}
          pathOptions={{
            color: slot.available ? "#5DFF34" : "#e95454",
            fillColor: slot.available ? "#5DFF34" : "#e95454",
            fillOpacity: slot.available ? 0.55 : 0.35
          }}
        >
          <Popup>
            Slot {slot.id} ({slot.type}) - {slot.available ? "Available" : "Occupied"} - {slot.zone} zone
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
