import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool';
import { validateBody } from '../middleware/validation';
import { NotFoundError } from '../utils/errors';

const router = Router();

// ─── Validation Schemas ──────────────────────────────

const createAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .trim(),
  type: z
    .string()
    .min(1, 'Type is required')
    .max(50, 'Type must be 50 characters or less')
    .toUpperCase(),
});

// ─── POST /api/accounts ─ Create a new account ──────

router.post(
  '/',
  validateBody(createAccountSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, type } = req.body;

      const result = await pool.query(
        `INSERT INTO accounts (name, type) VALUES ($1, $2)
         RETURNING id, name, type, balance, created_at, updated_at`,
        [name, type || 'SAVINGS']
      );

      const account = result.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: account.id,
          name: account.name,
          type: account.type,
          balance: parseFloat(account.balance),
          createdAt: account.created_at,
          updatedAt: account.updated_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/accounts ─ List all accounts ───────────

router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        `SELECT id, name, type, balance, created_at, updated_at
         FROM accounts
         ORDER BY created_at DESC`
      );

      const accounts = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        balance: parseFloat(row.balance),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      res.json({
        success: true,
        data: accounts,
        count: accounts.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/accounts/:id ─ Get account details ────

router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = req.params.id as string;

      const result = await pool.query(
        `SELECT id, name, type, balance, created_at, updated_at
         FROM accounts
         WHERE id = $1`,
        [accountId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Account', accountId);
      }

      const account = result.rows[0];

      res.json({
        success: true,
        data: {
          id: account.id,
          name: account.name,
          type: account.type,
          balance: parseFloat(account.balance),
          createdAt: account.created_at,
          updatedAt: account.updated_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
