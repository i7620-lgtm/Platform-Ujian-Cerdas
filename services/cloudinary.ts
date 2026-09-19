/**
 * Cloudinary Media Storage Service
 * Handles direct unsigned media uploads for images and audio files
 * to offload media egress from Supabase Storage.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'vkjqkr4t';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'soal_preset';

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  format: string;
  resourceType: string;
}

/**
 * Uploads an image or audio file (as Blob, File, or base64 data URL) to Cloudinary.
 * Uses the auto endpoint so both audio and image files are supported seamlessly.
 */
export async function uploadToCloudinary(
  fileOrDataUrl: Blob | string,
  fileName?: string
): Promise<string | null> {
  try {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      console.warn('Cloudinary config missing, skipping Cloudinary upload.');
      return null;
    }

    const formData = new FormData();
    if (typeof fileOrDataUrl === 'string') {
      formData.append('file', fileOrDataUrl);
    } else {
      formData.append('file', fileOrDataUrl, fileName || 'media_file');
    }

    formData.append('upload_preset', UPLOAD_PRESET);

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cloudinary upload failed with status:', response.status, errorData);
      return null;
    }

    const data = await response.json();
    if (data && data.secure_url) {
      return data.secure_url as string;
    }

    return null;
  } catch (error) {
    console.error('Error uploading media to Cloudinary:', error);
    return null;
  }
}
