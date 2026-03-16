# Mini Wallet Transaction API

A full-stack wallet management application built for the **VunaPay Technical Assessment**. Features a modern dark-theme fintech dashboard (Next.js + shadcn/ui) backed by a RESTful API (Express + PostgreSQL).

## 🏗️ Architecture

```
mini-wallet-transaction-api/
├── backend/    # Express + TypeScript + raw pg (node-postgres)
├── frontend/   # Next.js 14 + shadcn/ui + Tailwind CSS
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 (or pgAdmin)
- **npm**

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/mini-wallet-transaction-api.git
cd mini-wallet-transaction-api
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mini_wallet
PORT=5000
FRONTEND_URL=http://localhost:3000
```

Create the database in pgAdmin or via CLI:

```bash
createdb mini_wallet
```

Run the database migrations:

```bash
npm run migrate
```

Start the development server:

```bash
npm run dev
```

The API will be running at **http://localhost:5000**.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

The frontend is pre-configured to connect to `http://localhost:5000/api`. If your backend runs on a different port, create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the development server:

```bash
npm run dev
```

The frontend will be running at **http://localhost:3000**.

---

## 📡 API Endpoints

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/accounts` | Create a new account |
| `GET` | `/api/accounts` | List all accounts |
| `GET` | `/api/accounts/:id` | Get account by ID |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/accounts/:id/deposit` | Deposit funds into an account |
| `POST` | `/api/transfers` | Transfer between two accounts |
| `GET` | `/api/transactions` | List transactions (filterable) |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | API health status |

---

## 📝 Example Requests

### Create an Account

```bash
curl -X POST http://localhost:5000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Wanjiku"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "name": "Alice Wanjiku",
    "balance": 0,
    "createdAt": "2026-03-16T...",
    "updatedAt": "2026-03-16T..."
  }
}
```

### Deposit Funds

```bash
curl -X POST http://localhost:5000/api/accounts/ACCOUNT_ID/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "description": "Salary payment"}'
```

### Transfer Funds

```bash
curl -X POST http://localhost:5000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "SENDER_ID",
    "toAccountId": "RECEIVER_ID",
    "amount": 5000,
    "description": "Rent payment"
  }'
```

**Error response (insufficient balance):**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance: account '...' has KES 3000.00 but tried to transfer KES 5000"
  }
}
```

### List Transactions (with filters)

```bash
# All transactions
curl http://localhost:5000/api/transactions

# Filter by type
curl http://localhost:5000/api/transactions?type=DEPOSIT

# Filter by account
curl http://localhost:5000/api/transactions?accountId=ACCOUNT_ID

# With pagination
curl http://localhost:5000/api/transactions?limit=10&offset=0
```

---

## 🔒 Business Rules

- **Sufficient balance**: Sender must have enough funds before transferring
- **Account existence**: Both accounts must exist for a transfer
- **Positive amounts**: Deposits and transfers must be > 0
- **No self-transfers**: Cannot transfer to the same account
- **Atomic transactions**: All financial operations use SQL `BEGIN/COMMIT/ROLLBACK`
- **Database constraints**: `CHECK (balance >= 0)` prevents overdrafts at the DB level
- **Deadlock prevention**: Accounts locked in consistent order during transfers

## 🛡️ Edge Cases Handled

| Edge Case | Error Code | How to Test |
|-----------|------------|-------------|
| **Negative/zero amounts** | `400 VALIDATION_ERROR` | Enter `0` or `-5` in a deposit or transfer amount field |
| **Insufficient balance** | `422 INSUFFICIENT_BALANCE` | Transfer more than the account's current balance (e.g. Ksh 50,000 from an account with Ksh 1,000) |
| **Amount exceeding max** | `400 VALIDATION_ERROR` | Enter an amount above `1,000,000` in a deposit or transfer |

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Express.js, TypeScript, node-postgres (pg) |
| **Database** | PostgreSQL with raw SQL |
| **Validation** | Zod |
| **Frontend** | Next.js 14, React, shadcn/ui, Tailwind CSS |
| **UI Theme** | Custom dark fintech theme |

## 📦 Project Scripts

### Backend (`/backend`)
```bash
npm run dev      # Start dev server with hot reload
npm run build    # Compile TypeScript
npm run start    # Run compiled JS
npm run migrate  # Run database migrations
```

### Frontend (`/frontend`)
```bash
npm run dev      # Start Next.js dev server
npm run build    # Build for production
npm run start    # Serve production build
npm run lint     # Run ESLint
```
