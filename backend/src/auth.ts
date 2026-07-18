import jwt from "jsonwebtoken";
import { FastifyReply, FastifyRequest } from "fastify";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_TTL = "30d";

export type TokenPayload = {
  id: string;
  email: string;
};

// Foydalanuvchi login/register qilganda shu token beriladi
export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Fastify request obyektiga userId qo'shib beramiz, shunda
// har bir route "kimning so'rovi ekanini" client aytgan ma'lumotdan emas,
// tokendan ishonchli tarzda biladi.
declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return reply.code(401).send({ error: "Avtorizatsiya talab qilinadi" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    request.userId = decoded.id;
  } catch {
    return reply.code(401).send({ error: "Token yaroqsiz yoki muddati tugagan" });
  }
}
