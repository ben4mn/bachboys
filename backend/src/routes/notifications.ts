import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { pushService } from '../services/PushService.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/notifications/vapid-public-key - Get VAPID public key
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  const publicKey = pushService.getPublicKey();
  if (!publicKey) {
    res.status(503).json({
      status: 'error',
      message: 'Push notifications not configured',
    });
    return;
  }
  res.json({ publicKey });
});

// POST /api/notifications/subscribe - Subscribe to push notifications
router.post('/subscribe', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new AppError('Invalid subscription object', 400);
    }

    await pushService.saveSubscription(req.user!.userId, subscription);

    res.json({ status: 'ok', message: 'Subscribed to push notifications' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/subscribe - Unsubscribe from push notifications
router.delete('/subscribe', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pushService.removeSubscription(req.user!.userId);
    res.json({ status: 'ok', message: 'Unsubscribed from push notifications' });
  } catch (error) {
    next(error);
  }
});

export default router;
