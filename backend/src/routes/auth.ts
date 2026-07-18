import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../db";

// Bu yerda ro'yxatdan o'tish (register) va kirish (login) mantiqi joylashgan
export default async function authRoutes(fastify: FastifyInstance) {
  // 1. Ro'yxatdan o'tish
  fastify.post<{ Body: { email: string; password: string } }>(
    "/auth/register",
    async (request, reply) => {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.code(400).send({ error: "email va password majburiy" });
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

      return reply.code(201).send({ id: user.id, email: user.email });
    }
  );

  // 2. Kirish
  fastify.post<{ Body: { email: string; password: string } }>(
    "/auth/login",
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: "Email yoki parol noto'g'ri" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return reply.code(401).send({ error: "Email yoki parol noto'g'ri" });
      }

      return { id: user.id, email: user.email };
    }
  );
}
