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

/**
 * @openapi
 * /api/accounts:
 *   post:
 *     summary: Create a new wallet account
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [SAVINGS, BUSINESS, INVESTMENT]
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @openapi
 * /api/accounts:
 *   get:
 *     summary: List all accounts
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: List of accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Account'
 *                 count:
 *                   type: integer
 */
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        `SELECT id, name, type, balance, created_at, updated_at
         FROM accounts
         ORDER BY created_at DESC`
      );

      const accounts = result.rows.map((row: any) => ({
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

/**
 * @openapi
 * /api/accounts/{id}:
 *   get:
 *     summary: Get details for a specific account
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Account details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
