import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import notesRoutes from "./routes/notes";
import authRoutes from "./routes/auth";

dotenv.config();

const fastify = Fastify({ logger: true });

// Frontend (localhost:3000) dan so'rov qabul qilish uchun
fastify.register(cors, {
  origin: "http://localhost:3000",
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
