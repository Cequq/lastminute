import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import { UB_CENTER } from './PlacesMap';
import { useTheme } from '../context/ThemeContext';

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }) });
  return null;
}

// Газрын зураг дээр дарж байгууллагын байршлыг сонгоно
export default function LocationPicker({ value, onChange }) {
  const { isDark } = useTheme();
  const has = value?.lat != null && value?.lng != null;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <MapContainer center={has ? [value.lat, value.lng] : UB_CENTER} zoom={has ? 15 : 12} className="h-64 w-full">
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          url={isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'}
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        <ClickHandler onPick={onChange} />
        {has && <CircleMarker center={[value.lat, value.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#E4684A', fillOpacity: 1 }} />}
      </MapContainer>
      <p className="bg-paper px-3 py-2 text-xs text-ink-soft">
        {has ? `Сонгосон: ${value.lat}, ${value.lng}` : 'Газрын зураг дээр байгууллагынхаа байршилд дарна уу'}
      </p>
    </div>
  );
}
