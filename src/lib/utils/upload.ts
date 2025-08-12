import { supabase } from "../supabase";

export async function uploadImage(file: File) {
  if (!file) throw new Error("No file provided");

  // Validate file type
  if (!file.type.match(/^image\/(jpeg|png|jpg|svg\+xml)$/)) {
    throw new Error("Please upload an image file (PNG, JPG, JPEG, or SVG)");
  }

  // Validate file size (2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File size must be less than 2MB");
  }

  try {
    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error("Failed to upload image");
  }
}