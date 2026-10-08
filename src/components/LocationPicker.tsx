"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";

export interface LatLng { lat: number; lng: number }

function Clicks({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Recenter({ to }: { to: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.setView([to.lat, to.lng], Math.max(map.getZoom(), 17));
  }, [to, map]);
  return null;
}

export default function LocationPicker({
  center, value, onPick,
}: { center: LatLng; value: LatLng | null; onPick: (p: LatLng) => void }) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={16} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Clicks onPick={onPick} />
      <Recenter to={value} />
      {value && (
        <CircleMarker
          center={[value.lat, value.lng]} radius={11}
          pathOptions={{ color: "#fff", weight: 3, fillColor: "#dc2626", fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
}
