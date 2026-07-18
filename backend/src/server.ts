import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import notesRoutes from "./routes/notes";
import authRoutes from "./routes/auth";

dotenv.config();

const fastify = Fastify({ logger: true });

// Ruxsat berilgan frontend manzillari (vergul bilan ajratilgan bo'lishi mumkin)
// Masalan: FRONTEND_URL="http://localhost:3000,https://notes-frontend.onrender.com"
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

fastify.register(cors, {
  origin: allowedOrigins,
});

// Render kabi platformalar servisning tirikligini shu manzil orqali tekshiradi
fastify.get("/", async () => {
  return { status: "ok", service: "notes-backend" };
});

// Routelarni ulash
fastify.register(notesRoutes);
fastify.register(authRoutes);

// Serverni ishga tushirish
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`✅ Server http://localhost:${port} da ishlayapti`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
