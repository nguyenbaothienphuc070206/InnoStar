"use client";

import L from "leaflet";
import { ReactNode, useEffect } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Circle, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { LayersState, Slot, ZonePoint } from "./types";

type MapPluginContext = {
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
  onSlotClick: (slot: Slot) => void;
  toLatLng: (slot: Slot) => [number, number];
  markerIcon: (slot: Slot, isSelected: boolean) => L.DivIcon;
  viewportBounds: { north: number; south: number; east: number; west: number } | null;
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

function CarFollow({ carPosition, navigationActive }: { carPosition: [number, number] | null; navigationActive: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!carPosition || !navigationActive) {
      return;
    }

    map.flyTo(carPosition, Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 0.4
    });
  }, [carPosition, map, navigationActive]);

  return null;
}

type MapLayerPlugin = {
  id: string;
  render: (context: MapPluginContext) => ReactNode;
};

export function createMapPlugins(): MapLayerPlugin[] {
  function isVisible(
    lat: number,
    lng: number,
    bounds: { north: number; south: number; east: number; west: number } | null,
    margin = 0.0015
  ) {
    if (!bounds) {
      return true;
    }

    return (
      lat <= bounds.north + margin &&
      lat >= bounds.south - margin &&
      lng <= bounds.east + margin &&
      lng >= bounds.west - margin
    );
  }

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
      render: ({ layers, zones, slots, toLatLng }) => {
        if (!layers.heat) {
          return null;
        }

        const points = zones.length
          ? zones
          : slots.map((slot) => {
              const [lat, lng] = toLatLng(slot);
              const value = slot.available ? 88 : slot.soon || (slot.predictedFreeMin ?? 99) <= 10 ? 55 : 18;
              const type = value > 70 ? "green" : value > 40 ? "yellow" : "red";
              return { id: `slot-${slot.id}`, lat, lng, value, type } as ZonePoint;
            });

        return points.map((zone) => {
          const intensity = Math.max(0, Math.min(1, zone.value / 100));
          const color = zone.type === "green" ? "#5DFF34" : zone.type === "yellow" ? "#ffd34d" : "#ef4f53";

          return (
            <Circle
              key={`zone-${zone.id}`}
              center={[zone.lat, zone.lng]}
              radius={50 + intensity * 95}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.16 + intensity * 0.24,
                weight: 1,
                opacity: 0.2 + intensity * 0.55,
                className: "zoneCircle"
              }}
            />
          );
        });
      }
    },
    {
      id: "route",
      render: ({ layers, routePath, routeFocusToken, routeSegments, routeOpacity, activeRoutePenalty, activeRouteIsEco, carPosition, carAngle, navigationActive }) =>
        layers.route && routePath.length > 1 ? (
          <>
            <RouteAutoFit routePath={routePath} routeFocusToken={routeFocusToken} />
            <CarFollow carPosition={carPosition} navigationActive={navigationActive} />

            <Polyline
              positions={routePath}
              pathOptions={{
                color: activeRouteIsEco ? "#5DFF34" : activeRoutePenalty > 40 ? "#ffae42" : "#1FF4FA",
                weight: 10,
                opacity: routeOpacity * (activeRoutePenalty > 40 ? 0.1 : 0.15),
                lineJoin: "round",
                lineCap: "round",
                className: "routeGlow"
              }}
            />

            <Polyline
              positions={routePath}
              pathOptions={{
                color: activeRouteIsEco ? "#5DFF34" : activeRoutePenalty > 40 ? "#ffae42" : "#1FF4FA",
                weight: activeRoutePenalty > 45 ? 3.6 : 4,
                opacity: routeOpacity * (activeRoutePenalty > 45 ? 0.58 : activeRoutePenalty > 22 ? 0.68 : 0.82),
                dashArray: activeRouteIsEco ? "4 8" : "8 12",
                className: "routePulse",
                lineJoin: "round",
                lineCap: "round"
              }}
            />

            {routeSegments.length > 0
              ? routeSegments.map((segment, index) => (
                  <Polyline
                    key={`route-segment-${index}`}
                    positions={segment.positions}
                    pathOptions={{ color: segment.color, weight: 2.2, opacity: routeOpacity * 0.42, dashArray: "2 10", lineJoin: "round", lineCap: "round" }}
                  />
                ))
              : null}

            {routePath
              .filter((_, index) => index > 0 && index < routePath.length - 1 && index % 8 === 0)
              .map((point, index) => (
                <Marker
                  key={`route-arrow-${index}`}
                  position={point}
                  icon={L.divIcon({
                    className: "routeArrow",
                    html: `<span style="color:${activeRouteIsEco ? "#5DFF34" : activeRoutePenalty > 40 ? "#ffae42" : "#1FF4FA"}">➤</span>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                  })}
                />
              ))}

            <Marker
              position={routePath[0]}
              icon={L.divIcon({ className: "routeEndpoint routeStart", html: "<span>📍 Start</span>", iconSize: [60, 20], iconAnchor: [12, 10] })}
            />
            <Marker
              position={routePath[routePath.length - 1]}
              icon={L.divIcon({ className: "routeEndpoint routeEnd", html: "<span>🎯 Destination</span>", iconSize: [86, 22], iconAnchor: [24, 12] })}
            />

            {carPosition ? (
              <Marker
                position={carPosition}
                icon={L.divIcon({
                  className: "carMarker",
                  html: `<span style="display:inline-block;transform:rotate(${carAngle.toFixed(1)}deg);font-size:20px;">🚗</span>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                })}
              />
            ) : null}
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
      render: ({ layers, slots, markerIcon, selectedSlotId, onSlotClick, toLatLng, viewportBounds }) => {
        if (!layers.parking) {
          return null;
        }

        const visibleSlots = slots.filter((slot) => {
          const [lat, lng] = toLatLng(slot);
          return isVisible(lat, lng, viewportBounds);
        });

        const shouldCluster = visibleSlots.length > 80;
        const markers = visibleSlots.map((slot) => (
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
      render: ({ layers, slots, toLatLng, viewportBounds }) => {
        if (!layers.camera) {
          return null;
        }

        const cameraSlots = slots.filter((slot) => {
          if (!slot.cameraOnline) {
            return false;
          }

          const [lat, lng] = toLatLng(slot);
          return isVisible(lat, lng, viewportBounds);
        });
        const shouldCluster = cameraSlots.length > 80;
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
