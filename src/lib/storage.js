import { supabase } from './supabase';
import { validateImage } from '../components/ImageUpload';

// Зургийг Supabase Storage-ийн "images" bucket-д оруулж, нийтийн URL буцаана
export async function uploadImage(file, folder) {
  const err = validateImage(file);
  if (err) throw new Error(err);

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('images').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
  });
  if (error) throw error;

  return supabase.storage.from('images').getPublicUrl(path).data.publicUrl;
}
