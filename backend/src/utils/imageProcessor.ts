import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface ProcessedImage {
  filePath: string;
  thumbPath: string;
  width: number;
  height: number;
  fileSize: number;
}

const UPLOAD_BASE = '/app/uploads/gallery';
const FULL_MAX_WIDTH = 1200;
const THUMB_MAX_WIDTH = 300;

export async function processGalleryImage(buffer: Buffer, originalFilename: string): Promise<ProcessedImage> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const id = uuidv4();

  const dir = path.join(UPLOAD_BASE, year, month);
  await fs.mkdir(dir, { recursive: true });

  const fullPath = path.join(dir, `${id}.jpg`);
  const thumbPath = path.join(dir, `${id}_thumb.jpg`);

  // Process full-size image
  const fullImage = await sharp(buffer)
    .rotate() // auto-orient based on EXIF
    .resize(FULL_MAX_WIDTH, FULL_MAX_WIDTH, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(fullPath);

  // Process thumbnail
  await sharp(buffer)
    .rotate()
    .resize(THUMB_MAX_WIDTH, THUMB_MAX_WIDTH, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  // Return paths relative to /app for URL serving
  return {
    filePath: fullPath.replace('/app', ''),
    thumbPath: thumbPath.replace('/app', ''),
    width: fullImage.width,
    height: fullImage.height,
    fileSize: fullImage.size,
  };
}

export async function deleteGalleryImage(filePath: string, thumbPath: string): Promise<void> {
  const fullAbsPath = path.join('/app', filePath);
  const thumbAbsPath = path.join('/app', thumbPath);
  await Promise.allSettled([
    fs.unlink(fullAbsPath),
    fs.unlink(thumbAbsPath),
  ]);
}
