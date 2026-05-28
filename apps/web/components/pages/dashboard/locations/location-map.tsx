"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon path resolution in Webpack environments
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationMapProps {
  latitude: number;
  longitude: number;
  name: string;
  city: string;
  country: string;
}

export default function LocationMap({
  latitude,
  longitude,
  name,
  city,
  country,
}: LocationMapProps) {
  const position: [number, number] = [latitude, longitude];

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-border relative z-0">
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div className="text-sm p-1">
              <strong className="font-semibold block text-foreground">
                {name}
              </strong>
              <span className="text-muted-foreground block text-xs">
                {city}, {country}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-1">
                Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
