import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../db";
import { signToken } from "../auth";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Bu yerda ro'yxatdan o'tish (register) va kirish (login) mantiqi joylashgan
export default async function authRoutes(fastify: FastifyInstance) {
  // 1. Ro'yxatdan o'tish
  fastify.post<{ Body: { email: string; password: string } }>(
    "/auth/register",
    async (request, reply) => {
      const email = normalizeEmail(request.body?.email ?? "");
      const password = request.body?.password ?? "";

      if (!email || !password) {
        return reply.code(400).send({ error: "email va password majburiy" });
      }

      if (password.length < 6) {
        return reply
          .code(400)
          .send({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
      }

      // Parolni shifrlash (hech qachon oddiy holda saqlamaymiz!)
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: { email, password: hashedPassword },
      });

      const token = signToken({ id: user.id, email: user.email });
      return reply.code(201).send({ id: user.id, email: user.email, token });
    }
  );

  // 2. Kirish
  fastify.post<{ Body: { email: string; password: string } }>(
    "/auth/login",
    async (request, reply) => {
      const email = normalizeEmail(request.body?.email ?? "");
      const password = request.body?.password ?? "";

      if (!email || !password) {
        return reply.code(400).send({ error: "email va password majburiy" });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: "Email yoki parol noto'g'ri" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return reply.code(401).send({ error: "Email yoki parol noto'g'ri" });
      }

      const token = signToken({ id: user.id, email: user.email });
      return reply.send({ id: user.id, email: user.email, token });
    }
  );
}
