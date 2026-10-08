"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, useMap } from "react-leaflet";
import { BAND_COLOR, CATEGORY_LABEL, type IssueWithPriority } from "@/lib/issues";

function FlyTo({ target }: { target: IssueWithPriority | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
  }, [target, map]);
  return null;
}

export default function IssueMap({
  issues, center, selectedId, showResolved, onSelect,
}: {
  issues: IssueWithPriority[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  showResolved: boolean;
  onSelect: (id: string) => void;
}) {
  const selected = issues.find((i) => i.id === selectedId) || null;
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={15} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo target={selected} />
      {issues.map((i) => {
        if (i.status === "resolved") {
          if (!showResolved) return null;
          return (
            <CircleMarker
              key={i.id} center={[i.lat, i.lng]} radius={5}
              pathOptions={{ color: "#64748b", fillColor: "#94a3b8", fillOpacity: 0.9, weight: 1 }}
              eventHandlers={{ click: () => onSelect(i.id) }}
            />
          );
        }
        const color = BAND_COLOR[i.band];
        return (
          <span key={i.id}>
            <Circle
              center={[i.lat, i.lng]} radius={60 + i.priority * 8}
              pathOptions={{ stroke: false, fillColor: color, fillOpacity: 0.2 }}
              interactive={false}
            />
            <CircleMarker
              center={[i.lat, i.lng]} radius={6 + i.severity}
              pathOptions={{
                color: i.id === selectedId ? "#0f172a" : "#fff",
                weight: i.id === selectedId ? 3 : 1.5,
                fillColor: color, fillOpacity: 0.95,
              }}
              eventHandlers={{ click: () => onSelect(i.id) }}
            >
              <title>{`${CATEGORY_LABEL[i.category]} - priority ${i.priority}`}</title>
            </CircleMarker>
          </span>
        );
      })}
    </MapContainer>
  );
}
