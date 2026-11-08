import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB — Storage bucket-ийн хязгаартай ижил
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Зөвхөн JPG, PNG, WEBP зураг оруулна уу';
  if (file.size > MAX_IMAGE_BYTES) return `Зургийн хэмжээ 2MB-аас бага байх ёстой (${(file.size / 1048576).toFixed(1)}MB)`;
  return null;
}

// Зургийг сонгоход Storage-д оруулахаас ӨМНӨ урьдчилан харуулна
export default function ImageUpload({ currentUrl, file, onFileChange, error, onError }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url); // санах ой чөлөөлөх
  }, [file]);

  const handle = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const err = validateImage(f);
    if (err) { onError?.(err); return; }
    onError?.(null);
    onFileChange(f);
  };

  const shown = preview ?? currentUrl;

  return (
    <div>
      <span className="label">Зураг</span>
      {shown ? (
        <div className="relative overflow-hidden rounded-xl border border-line">
          <img src={shown} alt="Урьдчилан харах" className="h-44 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-midnight/70 p-3">
            <span className="text-xs font-semibold text-white">{file ? 'Шинэ зураг (хадгалаагүй)' : 'Одоогийн зураг'}</span>
            <div className="flex gap-2">
              <label className="cursor-pointer rounded-lg bg-surface/90 px-2.5 py-1 text-xs font-bold text-ink">
                Солих
                <input type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={handle} />
              </label>
              {file && (
                <button type="button" onClick={() => onFileChange(null)} className="rounded-lg bg-surface/90 p-1 text-ink" aria-label="Шинэ зургийг болих">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <label className={`flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-ink-mute transition-colors hover:border-brand hover:text-brand ${error ? 'border-rose' : 'border-line'}`}>
          <ImagePlus className="h-7 w-7" />
          <span className="text-sm font-semibold">Зураг сонгох</span>
          <span className="text-xs">JPG, PNG, WEBP · 2MB хүртэл</span>
          <input type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={handle} />
        </label>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
