import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool';
import { validateBody, validateQuery } from '../middleware/validation';
import {
  NotFoundError,
  InsufficientBalanceError,
  SameAccountError,
} from '../utils/errors';

const router = Router();

// ─── Validation Schemas ──────────────────────────────

const depositSchema = z.object({
  amount: z
    .number({ error: 'Amount must be a number' })
    .min(1, 'Amount must be at least 1')
    .max(1_000_000, 'Amount exceeds maximum allowed (KES 1,000,000)'),
  description: z.string().max(500).optional(),
});

const transferSchema = z.object({
  fromAccountId: z.string().uuid('Invalid sender account ID'),
  toAccountId: z.string().uuid('Invalid receiver account ID'),
  amount: z
    .number({ error: 'Amount must be a number' })
    .min(1, 'Amount must be at least 1')
    .max(1_000_000, 'Amount exceeds maximum allowed (KES 1,000,000)'),
  description: z.string().max(500).optional(),
});

const transactionQuerySchema = z.object({
  type: z.enum(['DEPOSIT', 'TRANSFER']).optional(),
  accountId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── POST /api/accounts/:id/deposit ─ Deposit funds ─

/**
 * @openapi
 * /api/accounts/{id}/deposit:
 *   post:
 *     summary: Deposit funds into an account
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Deposit successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 *                     account:
 *                       $ref: '#/components/schemas/Account'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Account not found
 */
router.post(
  '/accounts/:id/deposit',
  validateBody(depositSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const client = await pool.connect();

    try {
      const accountId = req.params.id as string;
      const { amount, description } = req.body;

      await client.query('BEGIN');

      // Check account exists (lock row)
      const accountResult = await client.query(
        'SELECT id, name, balance FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new NotFoundError('Account', accountId);
      }

      // Update balance
      const updatedAccount = await client.query(
        `UPDATE accounts
         SET balance = balance + $1
         WHERE id = $2
         RETURNING id, name, balance, created_at, updated_at`,
        [amount, accountId]
      );

      // Record the transaction
      const transaction = await client.query(
        `INSERT INTO transactions (type, amount, description, to_account_id)
         VALUES ('DEPOSIT', $1, $2, $3)
         RETURNING id, type, amount, description, from_account_id, to_account_id, created_at`,
        [amount, description || 'Deposit', accountId]
      );

      await client.query('COMMIT');

      const account = updatedAccount.rows[0];
      const txn = transaction.rows[0];

      res.status(201).json({
        success: true,
        data: {
          transaction: {
            id: txn.id,
            type: txn.type,
            amount: parseFloat(txn.amount),
            description: txn.description,
            fromAccountId: txn.from_account_id,
            toAccountId: txn.to_account_id,
            createdAt: txn.created_at,
          },
          account: {
            id: account.id,
            name: account.name,
            balance: parseFloat(account.balance),
          },
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// ─── POST /api/transfers ─ Transfer between accounts ─

/**
 * @openapi
 * /api/transfers:
 *   post:
 *     summary: Transfer funds between two accounts
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromAccountId, toAccountId, amount]
 *             properties:
 *               fromAccountId:
 *                 type: string
 *                 format: uuid
 *               toAccountId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *                 minimum: 1
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 *                     sender:
 *                       $ref: '#/components/schemas/Account'
 *                     receiver:
 *                       $ref: '#/components/schemas/Account'
 *       400:
 *         description: Validation error / Same account error
 *       404:
 *         description: Account not found
 *       422:
 *         description: Insufficient balance
 */
router.post(
  '/transfers',
  validateBody(transferSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const client = await pool.connect();

    try {
      const { fromAccountId, toAccountId, amount, description } = req.body;

      // Cannot transfer to self
      if (fromAccountId === toAccountId) {
        throw new SameAccountError();
      }

      await client.query('BEGIN');

      // Lock both accounts (ordered by ID to prevent deadlocks)
      const [firstId, secondId] =
        fromAccountId < toAccountId
          ? [fromAccountId, toAccountId]
          : [toAccountId, fromAccountId];

      const lockedAccounts = await client.query(
        'SELECT id, name, balance FROM accounts WHERE id IN ($1, $2) ORDER BY id FOR UPDATE',
        [firstId, secondId]
      );

      if (lockedAccounts.rows.length < 2) {
        // Find which account(s) are missing
        const foundIds = lockedAccounts.rows.map((r: any) => r.id);
        if (!foundIds.includes(fromAccountId)) {
          throw new NotFoundError('Sender account', fromAccountId);
        }
        if (!foundIds.includes(toAccountId)) {
          throw new NotFoundError('Receiver account', toAccountId);
        }
      }

      const sender = lockedAccounts.rows.find(
        (r: any) => r.id === fromAccountId
      );
      const receiver = lockedAccounts.rows.find(
        (r: any) => r.id === toAccountId
      );

      // Check sufficient balance
      if (parseFloat(sender.balance) < amount) {
        throw new InsufficientBalanceError(
          fromAccountId,
          sender.balance,
          amount.toString()
        );
      }

      // Debit sender
      const updatedSender = await client.query(
        `UPDATE accounts SET balance = balance - $1 WHERE id = $2
         RETURNING id, name, balance`,
        [amount, fromAccountId]
      );

      // Credit receiver
      const updatedReceiver = await client.query(
        `UPDATE accounts SET balance = balance + $1 WHERE id = $2
         RETURNING id, name, balance`,
        [amount, toAccountId]
      );

      // Record the transaction
      const transaction = await client.query(
        `INSERT INTO transactions (type, amount, description, from_account_id, to_account_id)
         VALUES ('TRANSFER', $1, $2, $3, $4)
         RETURNING id, type, amount, description, from_account_id, to_account_id, created_at`,
        [amount, description || 'Transfer', fromAccountId, toAccountId]
      );

      await client.query('COMMIT');

      const txn = transaction.rows[0];

      res.status(201).json({
        success: true,
        data: {
          transaction: {
            id: txn.id,
            type: txn.type,
            amount: parseFloat(txn.amount),
            description: txn.description,
            fromAccountId: txn.from_account_id,
            toAccountId: txn.to_account_id,
            createdAt: txn.created_at,
          },
          sender: {
            id: updatedSender.rows[0].id,
            name: updatedSender.rows[0].name,
            balance: parseFloat(updatedSender.rows[0].balance),
          },
          receiver: {
            id: updatedReceiver.rows[0].id,
            name: updatedReceiver.rows[0].name,
            balance: parseFloat(updatedReceiver.rows[0].balance),
          },
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// ─── GET /api/transactions ─ List transactions ───────

/**
 * @openapi
 * /api/transactions:
 *   get:
 *     summary: List transaction history
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DEPOSIT, TRANSFER]
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: List of transactions
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
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 */
router.get(
  '/transactions',
  validateQuery(transactionQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, accountId, limit, offset } = req.query as any;

      let query = `
        SELECT
          t.id, t.type, t.amount, t.description,
          t.from_account_id, t.to_account_id, t.created_at,
          fa.name as from_account_name,
          ta.name as to_account_name
        FROM transactions t
        LEFT JOIN accounts fa ON t.from_account_id = fa.id
        LEFT JOIN accounts ta ON t.to_account_id = ta.id
      `;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (type) {
        conditions.push(`t.type = $${paramIndex++}`);
        params.push(type);
      }

      if (accountId) {
        conditions.push(
          `(t.from_account_id = $${paramIndex} OR t.to_account_id = $${paramIndex})`
        );
        params.push(accountId);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM transactions t';
      if (conditions.length > 0) {
        countQuery +=
          ' WHERE ' +
          conditions.join(' AND ');
      }

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, params.length - 2)),
      ]);

      const transactions = dataResult.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        amount: parseFloat(row.amount),
        description: row.description,
        fromAccountId: row.from_account_id,
        fromAccountName: row.from_account_name,
        toAccountId: row.to_account_id,
        toAccountName: row.to_account_name,
        createdAt: row.created_at,
      }));

      res.json({
        success: true,
        data: transactions,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit,
          offset,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
