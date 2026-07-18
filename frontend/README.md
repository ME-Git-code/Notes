# Notes App (Google Keep'ga o'xshash)

Stack: Fastify (backend) + Next.js + PostgreSQL/Prisma

## Ishga tushirish

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name notes-views
npm run dev
```

Backend http://localhost:3001 da ishga tushadi.
.env faylida DATABASE_URL ni o'zingizning PostgreSQL parolingizga moslang.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend http://localhost:3000 da ochiladi.

## Asosiy funksiyalar

- Register va login
- Yozuv yaratish, tahrirlash, o'chirish
- Saralash uchun pin
- O'chirilganlar bo'limi
- Qidiruv
- Grid va list ko'rinish

## Struktura

backend/
  src/routes/notes.ts   - notes, pin, trash, restore endpoints
  src/routes/auth.ts    - register/login endpoints
  src/db.ts             - umumiy Prisma client
  src/server.ts         - Fastify serverni ishga tushiradi
  prisma/schema.prisma  - User va Note modellari

frontend/
  app/page.tsx             - asosiy sahifa (auth, search, views, editor)
  app/layout.tsx           - umumiy layout
  components/NoteCard.tsx  - yozuv kartochkasi
  lib/utils.ts             - yordamchi funksiyalar
