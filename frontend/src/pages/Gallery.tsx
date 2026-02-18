import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Camera, X, Trash2, ImageIcon } from 'lucide-react';
import { Header } from '../components/shared/Header';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useAuthStore } from '../store/authStore';
import { getGalleryPhotos, uploadPhoto, deletePhoto } from '../api/gallery';
import type { GalleryPhoto } from '../api/gallery';

function Lightbox({
  photo,
  onClose,
  onDelete,
  canDelete,
  isDeleting,
}: {
  photo: GalleryPhoto;
  onClose: () => void;
  onDelete: () => void;
  canDelete: boolean;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {photo.photo_url ? (
            <img src={photo.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm">
              {photo.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-white font-medium text-sm">{photo.display_name}</div>
            <div className="text-gray-400 text-xs">{format(parseISO(photo.created_at), 'MMM d, yyyy · h:mm a')}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            >
              {isDeleting ? <LoadingSpinner size="sm" /> : <Trash2 className="w-5 h-5" />}
            </button>
          )}
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.file_path}
          alt={photo.caption || ''}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {photo.caption && (
        <div className="p-4 text-center">
          <p className="text-white text-sm">{photo.caption}</p>
        </div>
      )}
    </div>
  );
}

function UploadModal({ onClose, onUpload, isUploading }: {
  onClose: () => void;
  onUpload: (file: File, caption: string) => void;
  isUploading: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    onUpload(selectedFile, caption);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Photo</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg bg-gray-100 dark:bg-gray-700" />
            <button
              onClick={() => { setSelectedFile(null); setPreview(null); }}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:border-primary-500 transition-colors"
          >
            <Camera className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Tap to select photo</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption (optional)"
          className="input"
        />

        <button
          onClick={handleSubmit}
          disabled={!selectedFile || isUploading}
          className="btn-primary w-full h-12"
        >
          {isUploading ? <LoadingSpinner size="sm" /> : 'Upload'}
        </button>
      </div>
    </div>
  );
}

export default function Gallery() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['gallery', page],
    queryFn: () => getGalleryPhotos(page),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, caption }: { file: File; caption: string }) => uploadPhoto(file, caption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      setShowUpload(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePhoto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      setSelectedPhoto(null);
    },
  });

  const handleUpload = useCallback((file: File, caption: string) => {
    uploadMutation.mutate({ file, caption });
  }, [uploadMutation]);

  const canDeletePhoto = (photo: GalleryPhoto) => {
    return photo.user_id === user?.id || user?.is_admin === true;
  };

  const photos = data?.photos || [];
  const pagination = data?.pagination;

  return (
    <>
      <Header
        title="Photos"
        rightElement={
          <button
            onClick={() => setShowUpload(true)}
            className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            <Camera className="w-5 h-5" />
          </button>
        }
      />

      <main className="px-4 py-4 max-w-lg mx-auto pb-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-center">
            Failed to load photos
          </div>
        )}

        {!isLoading && photos.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p>No photos yet</p>
            <p className="text-sm mt-1">Be the first to share a photo!</p>
            <button
              onClick={() => setShowUpload(true)}
              className="btn-primary mt-4"
            >
              Upload Photo
            </button>
          </div>
        )}

        {photos.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-1">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-square overflow-hidden rounded-sm"
                >
                  <img
                    src={photo.thumb_path}
                    alt={photo.caption || ''}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>

            {pagination && pagination.page < pagination.totalPages && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedPhoto && (
        <Lightbox
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onDelete={() => deleteMutation.mutate(selectedPhoto.id)}
          canDelete={canDeletePhoto(selectedPhoto)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
        />
      )}
    </>
  );
}
