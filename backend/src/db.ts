import { PrismaClient } from "@prisma/client";

// Butun ilova uchun bitta Prisma Client
// Har bir faylda "new PrismaClient()" yozish shart emas
const prisma = new PrismaClient();

export default prisma;
