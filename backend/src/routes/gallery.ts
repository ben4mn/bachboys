import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { query, queryOne } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { processGalleryImage, deleteGalleryImage } from '../utils/imageProcessor.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400) as unknown as Error);
    }
  },
});

// GET /api/gallery - List photos (paginated, newest first)
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const photos = await query<{
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
    }>(
      `SELECT p.*, u.display_name, u.photo_url
       FROM photos p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await queryOne<{ count: string }>('SELECT COUNT(*) FROM photos');
    const total = parseInt(countResult?.count || '0');

    res.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/gallery - Upload a photo
router.post('/', authenticate, upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const caption = (req.body.caption as string) || null;
    const processed = await processGalleryImage(req.file.buffer, req.file.originalname);

    const photo = await queryOne<{ id: string; created_at: string }>(
      `INSERT INTO photos (user_id, caption, file_path, thumb_path, original_filename, file_size, width, height)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [
        req.user!.userId,
        caption,
        processed.filePath,
        processed.thumbPath,
        req.file.originalname,
        processed.fileSize,
        processed.width,
        processed.height,
      ]
    );

    res.status(201).json({ photo: { id: photo!.id, created_at: photo!.created_at } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/gallery/:id - Delete own photo (or admin)
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const photo = await queryOne<{ id: string; user_id: string; file_path: string; thumb_path: string }>(
      'SELECT id, user_id, file_path, thumb_path FROM photos WHERE id = $1',
      [req.params.id]
    );

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    // Check ownership or admin
    const user = await queryOne<{ is_admin: boolean }>('SELECT is_admin FROM users WHERE id = $1', [req.user!.userId]);
    if (photo.user_id !== req.user!.userId && !user?.is_admin) {
      throw new AppError('Not authorized to delete this photo', 403);
    }

    // Delete files from disk
    await deleteGalleryImage(photo.file_path, photo.thumb_path);

    // Delete from DB
    await query('DELETE FROM photos WHERE id = $1', [req.params.id]);

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
