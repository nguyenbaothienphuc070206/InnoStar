"use client";

import L from "leaflet";
import { ReactNode, useEffect } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Circle, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import CameraPopup from "./camera-popup";
import { destinations } from "../data/destinations";
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
  toLatLng: (slot: Slot) => [number, number];
  markerIcon: (slot: Slot, isSelected: boolean) => L.DivIcon;
  viewportBounds: { north: number; south: number; east: number; west: number } | null;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchDestinationId(name: string): string | null {
  const normalizedName = normalizeText(name);
  const matched = destinations.find((item) => {
    const candidate = normalizeText(item.name);
    return candidate.includes(normalizedName) || normalizedName.includes(candidate);
  });

  return matched?.id ?? null;
}

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

  function mobilityIcon(kind: "ev" | "bike", available: number, total: number): L.DivIcon {
    const ratio = total > 0 ? available / total : 0;
    const moodClass = ratio > 0.6 ? "good" : ratio > 0.25 ? "warn" : "bad";
    const emoji = kind === "ev" ? "⚡" : "🚲";
    const label = kind === "ev" ? "EV" : "BIKE";

    return L.divIcon({
      className: `mobilityMarkerHost mobility-${kind} ${moodClass}`,
      html: `<span class="mobilityMarker mobility-${kind} ${moodClass}">${emoji}<small>${label}</small></span>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  return [
    {
      id: "ai-traffic",
      render: ({ layers, aiTrafficZones, viewportBounds }) => {
        if (!layers.traffic) {
          return null;
        }

        return aiTrafficZones
          .filter((item) => isVisible(item.lat, item.lng, viewportBounds, 0.003))
          .map((item) => {
            const color = item.level === "HIGH" ? "#ef4f53" : item.level === "MEDIUM" ? "#ffd34d" : "#59e38f";
            const radius = item.level === "HIGH" ? 80 : item.level === "MEDIUM" ? 60 : 45;

            return (
              <Circle
                key={`ai-traffic-${item.zone}`}
                center={[item.lat, item.lng]}
                radius={radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.16, weight: 1, opacity: 0.55 }}
              >
                <Popup>
                  <strong>{item.zone}</strong>
                  <br />
                  Traffic: {item.level}
                </Popup>
              </Circle>
            );
          });
      }
    },
    {
      id: "ai-parking",
      render: ({ layers, aiSlots, viewportBounds }) => {
        if (!layers.heat) {
          return null;
        }

        return aiSlots
          .filter((slot) => isVisible(slot.lat, slot.lng, viewportBounds, 0.0028))
          .map((slot) => {
            const ratio = slot.capacity > 0 ? slot.available / slot.capacity : 0;
            const color = ratio > 0.6 ? "#5DFF34" : ratio > 0.25 ? "#ffd34d" : "#ef4f53";
            return (
              <Circle
                key={`ai-slot-${slot.id}`}
                center={[slot.lat, slot.lng]}
                radius={20 + Math.max(0, slot.capacity - slot.available) * 1.2}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1, opacity: 0.5 }}
              >
                <Popup>
                  AI S{slot.id}: {slot.available}/{slot.capacity}
                </Popup>
              </Circle>
            );
          });
      }
    },
    {
      id: "mobility-hubs",
      render: ({ layers, evStations, bikeParking, viewportBounds }) => {
        if (!layers.parking) {
          return null;
        }

        const evMarkers = evStations
          .filter((item) => isVisible(item.lat, item.lng, viewportBounds, 0.0022))
          .map((item) => (
            <Marker
              key={`ev-station-${item.id}`}
              position={[item.lat, item.lng]}
              icon={mobilityIcon("ev", item.available, item.plugs)}
            >
              <Popup>
                <strong>{item.name}</strong>
                <br />
                EV station • {item.available}/{item.plugs} available • {item.speed}
                <br />
                {item.operator}
              </Popup>
            </Marker>
          ));

        const bikeMarkers = bikeParking
          .filter((item) => isVisible(item.lat, item.lng, viewportBounds, 0.0022))
          .map((item) => (
            <Marker
              key={`bike-hub-${item.id}`}
              position={[item.lat, item.lng]}
              icon={mobilityIcon("bike", item.available, item.docks)}
            >
              <Popup>
                <strong>{item.name}</strong>
                <br />
                Public bike parking • {item.available}/{item.docks} docks free
                <br />
                {item.guarded ? "Guarded" : "Open access"}
              </Popup>
            </Marker>
          ));

        return [...evMarkers, ...bikeMarkers];
      }
    },
    {
      id: "ai-places",
      render: ({ aiPlaces, viewportBounds, onAIPlaceClick, visitedDestinationIds, unlockedSecrets }) =>
        aiPlaces
          .filter((place) => isVisible(place.lat, place.lng, viewportBounds, 0.003))
          .map((place) => {
            const destinationId = matchDestinationId(place.name);
            const isCompleted = destinationId ? visitedDestinationIds.includes(destinationId) : false;
            const isSecret = destinationId ? unlockedSecrets.includes(`${destinationId}-walk-secret`) : false;
            const progressClass = isSecret ? "progress-gold" : isCompleted ? "progress-green" : "progress-grey";

            return (
              <Marker
                key={`ai-place-${place.id}`}
                position={[place.lat, place.lng]}
                eventHandlers={{ click: () => onAIPlaceClick(place) }}
                icon={L.divIcon({
                  className: "landmarkDotHost",
                  html: `<span class="landmarkDotMarker ${progressClass}"></span>`,
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
                })}
              >
                <Popup>
                  <strong>{place.name}</strong>
                  <br />
                  {place.desc}
                </Popup>
              </Marker>
            );
          })
    },
    {
      id: "ai-camera",
      render: ({ layers, aiCameraSlots, viewportBounds }) => {
        if (!layers.camera) {
          return null;
        }

        return aiCameraSlots
          .filter((cam) => isVisible(cam.lat, cam.lng, viewportBounds, 0.002))
          .map((cam) => (
            <Marker
              key={`ai-camera-${cam.id}`}
              position={[cam.lat, cam.lng]}
              icon={L.divIcon({ className: "cameraMarker", html: `<span>${cam.occupied ? "BUSY" : "FREE"}</span>` })}
            >
              <Popup>
                <CameraPopup cam={cam} />
              </Popup>
            </Marker>
          ));
      }
    },
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
      id: "landmarks",
      render: ({ landmarks, activeLandmarkId, onLandmarkClick, viewportBounds, visitedDestinationIds, unlockedSecrets }) => {
        const visible = landmarks.filter((item) => isVisible(item.lat, item.lng, viewportBounds, 0.003));

        return visible.map((item) => {
          const destinationId = matchDestinationId(item.name);
          const isCompleted = destinationId ? visitedDestinationIds.includes(destinationId) : false;
          const isSecret = destinationId ? unlockedSecrets.includes(`${destinationId}-walk-secret`) : false;
          const progressClass = isSecret ? "progress-gold" : isCompleted ? "progress-green" : "progress-grey";

          return (
            <Marker
              key={item.id}
              position={[item.lat, item.lng]}
              eventHandlers={{ click: () => onLandmarkClick(item) }}
              icon={L.divIcon({
                className: "landmarkDotHost",
                html: `<span class="landmarkDotMarker ${progressClass} ${activeLandmarkId === item.id ? "active" : ""}"></span>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })}
            >
              <Popup>
                <strong>{item.name}</strong>
                <br />
                {item.description}
              </Popup>
            </Marker>
          );
        });
      }
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
