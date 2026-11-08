
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  CircleMarker,
} from 'react-leaflet';
import L from 'leaflet';
import { useMyLocation } from '../lib/useMyLocation';
import { useTheme } from '../context/ThemeContext';

// Улаанбаатарын төв (Сүхбаатарын талбай)
export const UB_CENTER = [47.9185, 106.9176];

// Ангиллын өнгөтэй, хямдралын тэмдэглэгээ
function markerIcon(place, active) {
  const discount = place.quiet_discount_now;

  const html = `
    <div style="position:relative;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center">
      <div style="display:flex;align-items:center;gap:4px;padding:${discount ? '4px 8px 4px 4px' : '4px'};border-radius:999px;
                  background:${active ? '#0E1E28' : '#fff'};box-shadow:0 6px 16px -4px rgba(21,18,46,.35);
                  border:2px solid ${active ? '#0E1E28' : '#fff'};white-space:nowrap">
        <span style="width:20px;height:20px;border-radius:999px;background:${place.category_color};display:block"></span>
        ${discount ? `<span style="font:800 11px Manrope,sans-serif;color:${active ? '#EDB45C' : '#E4684A'}">−${discount}%</span>` : ''}
      </div>
      <div style="width:2px;height:8px;background:${active ? '#0E1E28' : '#fff'}"></div>
    </div>`;

  return L.divIcon({
    html,
    className: 'lm-marker',
    iconSize: [0, 0],
  });
}

// Газрын зураг сонгосон байршил руу шилжүүлэх
function FlyTo({ target }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo(
        [target.lat, target.lng],
        Math.max(map.getZoom(), 14),
        { duration: 0.6 }
      );
    }
  }, [target?.lat, target?.lng, map]);

  return null;
}

// Газрын зураг
export default function PlacesMap({
  places = [],
  selectedId,
  onSelect,
  me,
  className = 'h-[480px]',
  interactive = true,
  zoom = 12,
  center,
}) {
  const { isDark } = useTheme();

  // Хэрэглэгчийн байршлыг автоматаар авах
  const { pos, loading, request } = useMyLocation({ auto: true });

  // Гараар дамжуулсан байршил байвал түүнийг ашиглана
  const myPosition = me ?? pos;

  // Координаттай газрууд
  const withCoords = useMemo(
    () => places.filter(
      (p) => p.lat != null && p.lng != null
    ),
    [places]
  );

  const selected = withCoords.find(
    (p) => p.id === selectedId
  );

  return (
    <div className="relative w-full">
      <MapContainer
        center={center ?? UB_CENTER}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        attributionControl
        className={`${className} w-full`}
      >
        <TileLayer
          key="openstreetmap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* Хямдралтай газрууд */}
        {withCoords.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={markerIcon(p, p.id === selectedId)}
            eventHandlers={{
              click: () => onSelect?.(p.id),
            }}
          >
            {interactive && (
              <Popup>
                <p
                  style={{ margin: 0 }}
                  className="text-xs font-bold text-ink-soft"
                >
                  {p.category_name}
                </p>

                <p
                  style={{ margin: '2px 0 6px' }}
                  className="text-sm font-extrabold text-ink"
                >
                  {p.name}
                </p>

                <p
                  style={{ margin: 0 }}
                  className="text-xs text-ink-soft"
                >
                  {p.active_deals} идэвхтэй хямдрал
                </p>

                <Link
                  to={`/places/${p.id}`}
                  className="mt-2 inline-block text-xs font-bold text-brand"
                >
                  Дэлгэрэнгүй үзэх
                </Link>
              </Popup>
            )}
          </Marker>
        ))}

        {/* Хэрэглэгчийн бодит байршил */}
        {myPosition && (
          <CircleMarker
            center={[myPosition.lat, myPosition.lng]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#12756E',
              fillOpacity: 1,
            }}
          >
            <Popup>
              Миний одоогийн байршил
            </Popup>
          </CircleMarker>
        )}

        {/* Сонгосон газар эсвэл хэрэглэгчийн байршил */}
        <FlyTo
          target={
            selected
              ? { lat: selected.lat, lng: selected.lng }
              : myPosition
          }
        />
      </MapContainer>

      {/* Миний байршил руу очих товч */}
      {interactive && (
        <button
          type="button"
          onClick={() => {
            if (myPosition) {
              return;
            }
            request();
          }}
          disabled={loading}
          title="Миний байршил"
          className="absolute bottom-5 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl shadow-lg hover:bg-gray-100 disabled:opacity-50"
        >
          {loading ? '...' : '◎'}
        </button>
      )}
    </div>
  );
}
