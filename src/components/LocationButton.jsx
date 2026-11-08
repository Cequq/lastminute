import { lazy, Suspense, useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { Modal } from './ui/Modal';
import { distanceKm, kmLabel } from '../lib/geo';
import { useMyLocation } from '../lib/useMyLocation';

const PlacesMap = lazy(() => import('./PlacesMap'));

// "Байршил харах": газрын зургийг сайт дотроо цонхонд нээж, тухайн газрыг тэмдэглэнэ.
// place: { id, name, lat, lng, address, district, category_color, ... }
export default function LocationButton({ place, className = 'btn-dark w-full', label = 'Байршил харах', iconOnly = false }) {
  const [open, setOpen] = useState(false);
  const { pos } = useMyLocation();
  if (place?.lat == null) return null;

  const km = distanceKm(pos, place);
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <MapPin className={iconOnly ? 'h-3 w-3' : 'h-4 w-4'} /> {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={place.name} wide>
        <div className="overflow-hidden rounded-2xl border border-line">
          {open && (
            <Suspense fallback={<div className="h-80 animate-pulse bg-line" />}>
              <PlacesMap places={[place]} selectedId={place.id} me={pos} className="h-80 sm:h-[420px]"
                         zoom={16} center={[place.lat, place.lng]} />
            </Suspense>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 text-sm">
            <p className="flex items-start gap-1.5 font-bold"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {place.district}{km != null && <span className="text-brand">, {kmLabel(km)}</span>}</p>
            {place.address && <p className="ml-5.5 mt-0.5 pl-0.5 text-ink-soft">{place.address}</p>}
          </div>
          <a href={googleUrl} target="_blank" rel="noreferrer" className="btn-outline shrink-0">
            Google Maps-д нээх <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </Modal>
    </>
  );
}
