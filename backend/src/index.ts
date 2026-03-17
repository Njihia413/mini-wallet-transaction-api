import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db/pool';
import { runMigrations } from './db/migrate';
import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import debugRoutes from './routes/debug';
import { AppError } from './utils/errors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Swagger Configuration ────────────────────────────
/**
 * @openapi
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         type:
 *           type: string
 *         balance:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [DEPOSIT, TRANSFER]
 *         amount:
 *           type: number
 *         description:
 *           type: string
 *         fromAccountId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         fromAccountName:
 *           type: string
 *           nullable: true
 *         toAccountId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         toAccountName:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             message:
 *               type: string
 */

// Use absolute paths for Swagger apis to ensure endpoints are discovered
const routesPath = process.env.NODE_ENV === 'production'
  ? path.resolve(__dirname, './routes/*.js')
  : path.resolve(__dirname, './routes/*.ts');

const indexPath = process.env.NODE_ENV === 'production'
  ? path.resolve(__dirname, './index.js')
  : path.resolve(__dirname, './index.ts');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mini Wallet Transaction API',
      version: '1.0.0',
      description: 'A RESTful API for managing wallet accounts and transactions',
    },
    servers: [
      {
        url: process.env.RAILWAY_PUBLIC_DOMAIN 
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
      {
        url: 'http://0.0.0.0:5000',
        description: 'Local (0.0.0.0)',
      },
    ],
  },
  apis: [routesPath, indexPath],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Middleware ───────────────────────────────────────

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5000',
      'http://0.0.0.0:5000',
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// ─── Health Check ────────────────────────────────────

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Check API health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: Mini Wallet Transaction API
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Mini Wallet Transaction API',
  });
});

// ─── Routes ──────────────────────────────────────────

app.use('/api/accounts', accountRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api', transactionRoutes);

// ─── 404 Handler ─────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ─── Global Error Handler ────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    const response: any = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Include validation details if available
    if ('details' in err) {
      response.error.details = (err as any).details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle invalid UUID format errors from PostgreSQL
  if ((err as any).code === '22P02') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format. Expected a valid UUID.',
      },
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
    },
  });
});

/// ─── Start Server ────────────────────────────────────
async function testConnectionWithRetry(retries = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`⏳ DB connection attempt ${attempt}/${retries}...`);
    try {
      await testConnection();
      return;
    } catch (err: any) {
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`⏸ Retrying in ${delayMs / 1000}s...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        throw err;
      }
    }
  }
}

async function start() {
  // Bind to port FIRST so Railway sees the service as alive
  await new Promise<void>((resolve) => {
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`\n🚀 Mini Wallet API running on http://0.0.0.0:${PORT}`);
      console.log(`📋 Health check: http://0.0.0.0:${PORT}/api/health\n`);
      resolve();
    });
  });

  // Then connect to DB + run migrations in background
  try {
    await testConnectionWithRetry();
    await runMigrations();
    console.log('✅ DB ready and migrations complete');
  } catch (err) {
    console.error('💥 Failed to initialize DB after retries:', err);
    process.exit(1);
  }
}

start();

export default app;
