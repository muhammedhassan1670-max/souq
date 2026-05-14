import { requireSupabase } from '@/lib/supabase';

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadMarketImage(file: File, folder: 'products' | 'categories' | 'shops' | 'settings' = 'products') {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP.');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('حجم الصورة كبير. الحد الأقصى 3 ميجا.');
  }

  const extension = file.name.split('.').pop() || 'jpg';
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const client = requireSupabase();
  const { error } = await client.storage.from('market-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = client.storage.from('market-images').getPublicUrl(path);
  return data.publicUrl;
}
