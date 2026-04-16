"use client";

import L from "leaflet";
import { ReactNode } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { LayersState, Slot } from "./types";

type MapPluginContext = {
  slots: Slot[];
  layers: LayersState;
  selectedSlotId: number | null;
  routePath: Array<[number, number]>;
  onSlotClick: (slot: Slot) => void;
  toLatLng: (slot: Slot) => [number, number];
  markerIcon: (slot: Slot, isSelected: boolean) => L.DivIcon;
};

type MapLayerPlugin = {
  id: string;
  render: (context: MapPluginContext) => ReactNode;
};

export function createMapPlugins(): MapLayerPlugin[] {
  return [
    {
      id: "traffic",
      render: ({ layers }) =>
        layers.traffic ? (
          <TileLayer
            opacity={0.35}
            attribution='&copy; <a href="https://stamen.com/">Stamen</a>'
            url="https://stamen-tiles.a.ssl.fastly.net/toner-lines/{z}/{x}/{y}.png"
          />
        ) : null
    },
    {
      id: "route",
      render: ({ layers, routePath }) =>
        layers.route && routePath.length > 1 ? (
          <Polyline positions={routePath} pathOptions={{ color: "#1FF4FA", weight: 5, opacity: 0.9, dashArray: "8 10", className: "routePulse" }} />
        ) : null
    },
    {
      id: "parking",
      render: ({ layers, slots, markerIcon, selectedSlotId, onSlotClick, toLatLng }) => {
        if (!layers.parking) {
          return null;
        }

        const shouldCluster = slots.length > 100;
        const markers = slots.map((slot) => (
          <Marker
            key={slot.id}
            position={toLatLng(slot)}
            icon={markerIcon(slot, selectedSlotId === slot.id)}
            eventHandlers={{ click: () => onSlotClick(slot) }}
          >
            <Popup>
              S{slot.id} - {slot.available ? "Available" : "Full"} - {slot.zone}
            </Popup>
          </Marker>
        ));

        return shouldCluster ? <MarkerClusterGroup chunkedLoading>{markers}</MarkerClusterGroup> : markers;
      }
    },
    {
      id: "camera",
      render: ({ layers, slots, toLatLng }) => {
        if (!layers.camera) {
          return null;
        }

        const cameraSlots = slots.filter((slot) => slot.cameraOnline);
        const shouldCluster = cameraSlots.length > 100;
        const markers = cameraSlots.map((slot) => (
          <Marker key={`camera-${slot.id}`} position={toLatLng(slot)} icon={L.divIcon({ className: "cameraMarker", html: "<span>CAM</span>" })}>
            <Popup>Live camera near S{slot.id}</Popup>
          </Marker>
        ));

        return shouldCluster ? <MarkerClusterGroup chunkedLoading>{markers}</MarkerClusterGroup> : markers;
      }
    }
  ];
}
