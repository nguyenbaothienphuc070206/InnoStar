"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
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
  return (
    <MapContainer center={center} zoom={15} className="mapCanvas" zoomControl={false} preferCanvas>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {layers.traffic ? (
        <TileLayer
          opacity={0.35}
          attribution='&copy; <a href="https://stamen.com/">Stamen</a>'
          url="https://stamen-tiles.a.ssl.fastly.net/toner-lines/{z}/{x}/{y}.png"
        />
      ) : null}

      {layers.route && routePath.length > 1 ? <Polyline positions={routePath} color="#1FF4FA" weight={5} opacity={0.9} /> : null}

      {layers.parking
        ? slots.map((slot) => (
            <Marker key={slot.id} position={toLatLng(slot)} icon={markerIcon(slot.available)} eventHandlers={{ click: () => onSlotClick(slot) }}>
              <Popup>
                S{slot.id} - {slot.available ? "Available" : "Full"} - {slot.zone}
              </Popup>
            </Marker>
          ))
        : null}

      {layers.camera
        ? slots
            .filter((slot) => slot.cameraOnline)
            .map((slot) => (
              <Marker key={`camera-${slot.id}`} position={toLatLng(slot)} icon={L.divIcon({ className: "cameraMarker", html: "<span>CAM</span>" })}>
                <Popup>Live camera near S{slot.id}</Popup>
              </Marker>
            ))
        : null}
    </MapContainer>
  );
}
