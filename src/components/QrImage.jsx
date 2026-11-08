import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// QPay qr_image (base64 PNG) байвал түүнийг, үгүй бол текстээс QR зурна
export default function QrImage({ base64, text, size = 240, className = '' }) {
  const [src, setSrc] = useState(base64 ? `data:image/png;base64,${base64}` : null);

  useEffect(() => {
    if (base64) { setSrc(`data:image/png;base64,${base64}`); return; }
    if (!text) return;
    QRCode.toDataURL(text, { width: size * 2, margin: 1, color: { dark: '#0E1E28', light: '#FFFFFF' } })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [base64, text, size]);

  if (!src) return <div style={{ width: size, height: size }} className={`animate-pulse rounded-xl bg-line ${className}`} />;
  return <img src={src} width={size} height={size} alt="Төлбөрийн QR код" className={`rounded-xl ${className}`} />;
}
