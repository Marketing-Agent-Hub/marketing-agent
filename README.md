# Open Campus Vietnam – AI RSS Bot

Hệ thống tự động theo dõi, phân tích và tổng hợp nội dung từ các nguồn RSS về giáo dục (Education/EdTech), blockchain tech, và Open Campus ecosystem.

## 📋 Trạng thái dự án

### ✅ Phase 1: Source Manager Backend (COMPLETED)
Backend đã hoàn thành với đầy đủ chức năng:
- ✅ Express API Server với TypeScript strict mode
- ✅ PostgreSQL + Prisma ORM
- ✅ JWT Authentication
- ✅ Source CRUD API
- ✅ RSS Feed Validation
- ✅ Error Handling & Logging
- ✅ Unit Tests (7/7 passing)
- ✅ ESLint & Prettier (0 errors, 0 warnings)

Chi tiết: [`server/BUILD_STATUS.md`](server/BUILD_STATUS.md)

### ✅ Phase 3: Source Management Frontend (COMPLETED)
Frontend đã hoàn thành với đầy đủ chức năng:
- ✅ Vite + React + TypeScript (strict mode)
- ✅ Login & Authentication UI
- ✅ Protected Routes & Auth Context
- ✅ Source CRUD UI (Create, Read, Update, Delete)
- ✅ Source Form with Validation (React Hook Form + Zod)
- ✅ RSS Feed Validation UI
- ✅ Toggle Enable/Disable Sources
- ✅ Real-time Search (by name, URL, tags)
- ✅ TailwindCSS v4 Responsive Design
- ✅ Build Successful (0 TypeScript errors)

Chi tiết: [`web/README.md`](web/README.md) | [`web/BUILD_STATUS.md`](web/BUILD_STATUS.md)

### 🚧 Phase 2: RSS Ingest & AI Pipeline (Coming Next)
- RSS feed ingestion with intervals
- Content extraction from HTML
- AI-powered filtering & summarization
- Digest generation (5 posts/day)

## 🚀 Quick Start

### Backend Server

```bash
# Navigate to server
cd server

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URL and credentials

# Setup database
npm run prisma:migrate
npm run prisma:generate

# Start development server
npm run dev
```

Server chạy tại: `http://localhost:3001`

Chi tiết: [`server/README.md`](server/README.md)

### Frontend Web App

```bash
# Navigate to web
cd web

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env if needed (default: http://localhost:3001/api)

# Start development server
npm run dev
```

Web app chạy tại: `http://localhost:5173`

Chi tiết: [`web/README.md`](web/README.md)

## 📚 Documentation

- [`srs.md`](srs.md) - Software Requirements Specification
- [`ARCHITECHTURE.md`](ARCHITECHTURE.md) - System Architecture
- [`todolist.md`](todolist.md) - Development Checklist
- [`server/API.md`](server/API.md) - API Documentation
- [`server/DATABASE.md`](server/DATABASE.md) - Database Setup
- [`server/BUILD_STATUS.md`](server/BUILD_STATUS.md) - Build Status

## 🏗 Architecture

```
┌────────────────────────────┐
│     Vite Web UI            │
│  (Dashboard + CRUD)        │
└───────────▲────────────────┘
            │ REST API
            ▼
┌────────────────────────────┐
│  Express Server            │
│  - Source Manager ✅       │
│  - RSS Validate ✅         │
│  - Ingest (Phase 2)        │
│  - AI Pipeline (Phase 2)   │
└───────────▲────────────────┘
            │
            ▼
      ┌──────────────┐
      │ PostgreSQL   │
      └──────────────┘
```

## 🛠 Tech Stack

### Backend (✅ Completed)
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 14+ + Prisma ORM
- **Validation**: Zod
- **Auth**: JWT + bcrypt
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

### Frontend (✅ Completed)
- **Build Tool**: Vite 7
- **Framework**: React 18
- **Language**: TypeScript (strict mode)
- **Routing**: React Router DOM v7
- **State Management**: TanStack Query v5 (React Query)
- **Forms**: React Hook Form + Zod
- **Styling**: TailwindCSS v4 + PostCSS
- **HTTP Client**: Fetch API with custom wrapper

## 📝 API Endpoints (Phase 1)

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current user

### Sources
- `GET /api/sources` - List all sources
- `GET /api/sources/:id` - Get single source
- `POST /api/sources` - Create source
- `PATCH /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source
- `POST /api/sources/validate` - Validate RSS feed

Xem đầy đủ: [`server/API.md`](server/API.md)

## 🗃 Database Schema (Phase 1)

### sources Table
- Source configuration & metadata
- RSS feed URL (unique)
- Language (VI/EN/MIXED)
- Topic tags
- Trust score (0-100)
- Deny keywords
- Validation status
- Enabled/disabled state

Chi tiết: [`server/DATABASE.md`](server/DATABASE.md)

## ✅ Nghiệm thu Phase 1

### Functional Requirements
- ✅ Login với JWT
- ✅ CRUD sources
- ✅ Validate RSS feeds (RSS & Atom)
- ✅ Database updates correctly
- ✅ Data normalization (tags, keywords, URLs)

### Non-functional Requirements
- ✅ Validate timeout < 10s
- ✅ Server không crash với invalid feeds
- ✅ Unit tests pass (7/7)
- ✅ ESLint pass (0 errors)
- ✅ TypeScript strict mode (0 errors)
- ✅ UI không lỗi runtime (N/A for Phase 1)

### Code Quality
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier configured
- ✅ Separation of concerns
- ✅ Error handling middleware
- ✅ Input validation (Zod)
- ✅ Security best practices

## 🔒 Security

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS configuration
- ✅ Input validation (Zod)
- ✅ No secrets in repo (.env.example only)
- ✅ SQL injection protection (Prisma ORM)

## 🧪 Testing

```bash
cd server
npm test              # Run unit tests
npm run test:coverage # Run with coverage
```

Current coverage: 7/7 tests passing

## 📦 Scripts

### Backend Server
```bash
npm run dev          # Development server (watch mode)
npm run build        # Build TypeScript
npm start            # Production server
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm test             # Run tests
```

## 🔮 Roadmap

### ✅ Phase 1: Source Manager Backend (DONE)
- Backend API server
- Database schema
- Authentication
- Source CRUD
- RSS validation

### ✅ Phase 3: Source Management Frontend (DONE)
- Web dashboard with React + TypeScript
- Login & authentication UI
- Source CRUD interface
- Form validation
- Search functionality
- RSS feed validation UI
- Toggle enabled/disabled

### 🚧 Phase 2: Content Pipeline (Next)
- RSS feed ingestion
- Content extraction
- AI filtering (Stage A)
- AI summarization (Stage B)
- Digest generation
- Draft creation

### 🚧 Phase 4: Publishing & Review (After Phase 2)
- Draft review UI
- Edit & approve flows
- Facebook integration
- Post scheduling

## 📄 License

MIT

## 👥 Team

Open Campus Vietnam

---

**Status**: Phase 1 + Phase 3 Complete ✅ | Ready for Phase 2 🚀  
**Integration**: Backend + Frontend ready for full-stack testing
