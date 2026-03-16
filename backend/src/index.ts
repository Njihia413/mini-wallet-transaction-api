import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db/pool';
import { runMigrations } from './db/migrate';
import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import { AppError } from './utils/errors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Swagger Configuration ────────────────────────────

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
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Middleware ───────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// ─── Start Server ────────────────────────────────────

async function start() {
  try {
    await testConnection();
    await runMigrations();

    app.listen(PORT, () => {
      console.log(`\n🚀 Mini Wallet API running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
