"use client";

import L from "leaflet";
import { ReactNode, useEffect } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Circle, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { LayersState, Slot } from "./types";

type MapPluginContext = {
  slots: Slot[];
  layers: LayersState;
  selectedSlotId: number | null;
  userLocation: [number, number];
  routeFocusToken: number;
  routeSegments: Array<{ positions: Array<[number, number]>; color: string }>;
  routeOpacity: number;
  routePath: Array<[number, number]>;
  onSlotClick: (slot: Slot) => void;
  toLatLng: (slot: Slot) => [number, number];
  markerIcon: (slot: Slot, isSelected: boolean) => L.DivIcon;
};

type RouteAutoFitProps = {
  routePath: Array<[number, number]>;
  routeFocusToken: number;
};

function RouteAutoFit({ routePath, routeFocusToken }: RouteAutoFitProps) {
  const map = useMap();

  useEffect(() => {
    if (!routeFocusToken || routePath.length < 2) {
      return;
    }

    const bounds = L.latLngBounds(routePath.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 16,
      animate: true,
      duration: 0.8
    });
  }, [map, routeFocusToken, routePath]);

  return null;
}

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
      id: "heat",
      render: ({ layers, slots, toLatLng }) => {
        if (!layers.heat) {
          return null;
        }

        return slots.map((slot) => {
          const [lat, lng] = toLatLng(slot);
          const intensity = slot.available ? 0.3 : slot.soon || (slot.predictedFreeMin ?? 99) <= 10 ? 0.6 : 0.95;
          const color = intensity > 0.8 ? "#ff7e36" : intensity > 0.45 ? "#ffd167" : "#67f8b4";

          return (
            <Circle
              key={`heat-${slot.id}`}
              center={[lat, lng]}
              radius={30 + intensity * 45}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.2 + intensity * 0.28,
                weight: 0
              }}
            />
          );
        });
      }
    },
    {
      id: "route",
      render: ({ layers, routePath, routeFocusToken, routeSegments, routeOpacity }) =>
        layers.route && routePath.length > 1 ? (
          <>
            <RouteAutoFit routePath={routePath} routeFocusToken={routeFocusToken} />
            {routeSegments.length > 0
              ? routeSegments.map((segment, index) => (
                  <Polyline
                    key={`route-segment-${index}`}
                    positions={segment.positions}
                    pathOptions={{ color: segment.color, weight: 5, opacity: routeOpacity * 0.92, dashArray: "8 10", className: "routePulse", lineJoin: "round", lineCap: "round" }}
                  />
                ))
              : <Polyline positions={routePath} pathOptions={{ color: "#1FF4FA", weight: 5, opacity: routeOpacity, dashArray: "8 10", className: "routePulse", lineJoin: "round", lineCap: "round" }} />}
          </>
        ) : null
    },
    {
      id: "user-location",
      render: ({ userLocation }) => (
        <Marker
          position={userLocation}
          icon={L.divIcon({ className: "userMarker", html: "<span>YOU</span>", iconSize: [44, 22], iconAnchor: [22, 11] })}
        >
          <Popup>Your current position</Popup>
        </Marker>
      )
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
              S{slot.id} - {slot.available ? "Available" : slot.soon || (slot.predictedFreeMin ?? 99) <= 10 ? "Likely soon" : "Full"} - {slot.zone}
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
