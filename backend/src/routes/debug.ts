import { Router, Request, Response, NextFunction } from 'express';
import { resetDatabase } from '../db/migrate';

const router = Router();

/**
 * @openapi
 * /api/debug/reset:
 *   post:
 *     summary: Reset the database (Delete all data and re-seed)
 *     description: 'This endpoint drops all tables and re-runs the initial schema. WARNING: This will delete all existing data.'
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: Database reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Database reset failed
 */
router.post('/reset', async (_req: Request, res: Response, next: NextFunction) => {
  // Security check: Only allow in development or if a specific debug flag is set
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEBUG_RESET) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Database reset is disabled in production environments',
      },
    });
  }

  try {
    await resetDatabase();
    res.json({
      success: true,
      message: 'Database has been reset successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
