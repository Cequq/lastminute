// Хоёр цэгийн хоорондох зай (км), Haversine томьёо
export function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const kmLabel = (km) => (km == null ? '' : km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1)} км`);

// Хөтчийн байршлыг Promise хэлбэрээр авна
export function getMyLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Таны хөтөч байршил тодорхойлохыг дэмждэггүй')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.code === 1 ? 'Байршил ашиглах зөвшөөрөл өгөөгүй байна' : 'Байршил тодорхойлж чадсангүй')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  });
}
