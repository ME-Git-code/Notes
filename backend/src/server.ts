import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
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

// Frontend ba'zi so'rovlarda (pin, restore, delete) "Content-Type:
// application/json" sarlavhasini yuboradi, lekin haqiqiy tana (body)
// bo'lmaydi. Fastify standart holatda buni xato deb hisoblab, 400
// "Bad Request" qaytarardi — shu yerda bo'sh JSON tanasini xavfsiz
// qabul qilishni o'rgatamiz.
fastify.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (request, body, done) => {
    const raw = body as string;

    if (!raw || !raw.trim()) {
      done(null, undefined);
      return;
    }

    try {
      done(null, JSON.parse(raw));
    } catch (error) {
      done(error as Error, undefined);
    }
  }
);

// Umumiy himoya: bitta IP manzil daqiqasiga 100 tadan ortiq so'rov
// yubora olmaydi. Bu server-darajasidagi DDoS/spam'ning oldini olishga
// yordam beradi (haqiqiy katta DDoS uchun Cloudflare kabi CDN kerak,
// lekin bu ilova darajasidagi birinchi himoya qatlami).
fastify.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
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
