import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Community } from "../../../drizzle/schema";

// Fix Leaflet default icon paths broken by Vite bundler
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

const PIAUI_CENTER: [number, number] = [-7.72, -42.73];
const PIAUI_IBGE_CODE = 22;

function communityColor(c: Community): string {
  if (c.reservoirLevel < 20 || c.daysWithoutWater > 10) return "#ef4444";
  if (c.reservoirLevel < 50 || c.daysWithoutWater > 5) return "#f97316";
  return "#14b8a6";
}

function deliveryStatusColor(status: string): string {
  switch (status) {
    case "completed": return "#22c55e";
    case "in_progress": return "#f97316";
    case "failed": return "#ef4444";
    default: return "#eab308";
  }
}

function numberedIcon(n: number, color: string) {
  return L.divIcon({
    html: `<div style="background:${color};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:13px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.4)">${n}</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function driverIcon() {
  return L.divIcon({
    html: `<div style="background:#3b82f6;border-radius:50%;width:20px;height:20px;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,.4)"></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// Auto-fit map to given bounds
function BoundsFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

// Fetch and render Piauí GeoJSON boundaries from IBGE
function PiauiBoundary() {
  const [geo, setGeo] = useState<object | null>(null);

  useEffect(() => {
    fetch(
      `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${PIAUI_IBGE_CODE}?resolucao=5&formato=application/vnd.geo+json`
    )
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => null);
  }, []);

  if (!geo) return null;

  return (
    <GeoJSON
      data={geo as GeoJSON.GeoJsonObject}
      style={() => ({
        color: "#14b8a6",
        weight: 0.8,
        fillColor: "#0f4c45",
        fillOpacity: 0.08,
      })}
    />
  );
}

// ─── Communities overview map ─────────────────────────────────────────────────

interface CommunitiesMapProps {
  communities: Community[];
  height?: string;
}

export function CommunitiesMap({ communities, height = "500px" }: CommunitiesMapProps) {
  const fitPoints = communities.map((c): [number, number] => [c.latitude, c.longitude]);

  return (
    <MapContainer
      center={PIAUI_CENTER}
      zoom={7}
      style={{ height, width: "100%", borderRadius: "inherit" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <PiauiBoundary />

      {fitPoints.length > 0 && <BoundsFitter points={fitPoints} />}

      {communities.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.latitude, c.longitude]}
          radius={10}
          fillColor={communityColor(c)}
          color="white"
          weight={2}
          fillOpacity={0.9}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <strong style={{ fontSize: 14 }}>{c.name}</strong>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <div>
                  <span style={{ color: "#888" }}>Reservatório: </span>
                  <span
                    style={{
                      color: c.reservoirLevel < 20 ? "#ef4444" : c.reservoirLevel < 50 ? "#f97316" : "#22c55e",
                      fontWeight: "bold",
                    }}
                  >
                    {c.reservoirLevel}%
                  </span>
                </div>
                <div>
                  <span style={{ color: "#888" }}>Sem água: </span>
                  <span style={{ fontWeight: "bold" }}>{c.daysWithoutWater} dias</span>
                </div>
                <div>
                  <span style={{ color: "#888" }}>População: </span>
                  {c.population} pessoas
                </div>
                <div>
                  <span style={{ color: "#888" }}>Temperatura: </span>
                  {c.temperature}°C
                </div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

// ─── Driver route map ─────────────────────────────────────────────────────────

export interface RouteDelivery {
  id: number;
  sequenceOrder: number;
  status: string;
  community: Community;
}

interface DriverRouteMapProps {
  deliveries: RouteDelivery[];
  driverPosition: [number, number] | null;
  height?: string;
}

export function DriverRouteMap({ deliveries, driverPosition, height = "500px" }: DriverRouteMapProps) {
  const sorted = [...deliveries].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  const routePoints: [number, number][] = [];
  if (driverPosition) routePoints.push(driverPosition);
  sorted.forEach((d) => {
    routePoints.push([d.community.latitude, d.community.longitude]);
  });

  const fitPoints: [number, number][] = [
    ...(driverPosition ? [driverPosition] : []),
    ...sorted.map((d): [number, number] => [d.community.latitude, d.community.longitude]),
  ];

  return (
    <MapContainer
      center={driverPosition ?? PIAUI_CENTER}
      zoom={driverPosition ? 12 : 7}
      style={{ height, width: "100%", borderRadius: "inherit" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <PiauiBoundary />

      {fitPoints.length > 0 && <BoundsFitter points={fitPoints} />}

      {/* Rota */}
      {routePoints.length > 1 && (
        <Polyline positions={routePoints} color="#14b8a6" weight={3} opacity={0.8} dashArray="10 6" />
      )}

      {/* Posição do motorista */}
      {driverPosition && (
        <Marker position={driverPosition} icon={driverIcon()}>
          <Popup>Sua localização atual</Popup>
        </Marker>
      )}

      {/* Marcadores de entrega */}
      {sorted.map((d, i) => (
        <Marker
          key={d.id}
          position={[d.community.latitude, d.community.longitude]}
          icon={numberedIcon(i + 1, deliveryStatusColor(d.status))}
        >
          <Popup>
            <div style={{ minWidth: 170 }}>
              <strong style={{ fontSize: 13 }}>
                #{i + 1} — {d.community.name}
              </strong>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <div>
                  <span style={{ color: "#888" }}>Status: </span>
                  <span
                    style={{
                      color: deliveryStatusColor(d.status),
                      fontWeight: "bold",
                      textTransform: "capitalize",
                    }}
                  >
                    {d.status === "completed" ? "Concluída" : d.status === "in_progress" ? "Em andamento" : d.status === "failed" ? "Falhou" : "Pendente"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#888" }}>Reservatório: </span>
                  {d.community.reservoirLevel}%
                </div>
                <div>
                  <span style={{ color: "#888" }}>Pop.: </span>
                  {d.community.population}
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
