import { apiClient } from './client';

export interface GalleryPhoto {
  id: string;
  user_id: string;
  caption: string | null;
  file_path: string;
  thumb_path: string;
  original_filename: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  display_name: string;
  photo_url: string | null;
}

interface GalleryResponse {
  photos: GalleryPhoto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getGalleryPhotos(page = 1, limit = 20): Promise<GalleryResponse> {
  const response = await apiClient.get<GalleryResponse>('/gallery', {
    params: { page, limit },
  });
  return response.data;
}

export async function uploadPhoto(file: File, caption?: string): Promise<{ photo: { id: string; created_at: string } }> {
  const formData = new FormData();
  formData.append('photo', file);
  if (caption) {
    formData.append('caption', caption);
  }
  const response = await apiClient.post('/gallery', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deletePhoto(id: string): Promise<void> {
  await apiClient.delete(`/gallery/${id}`);
}
