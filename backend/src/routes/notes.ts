import { FastifyInstance } from "fastify";
import prisma from "../db";

type NoteBody = {
  title?: string;
  content?: string;
  userId?: string;
  color?: string;
  isPinned?: boolean;
  isTrashed?: boolean;
};

type NotesView = "notes" | "pinned" | "trash";

async function verifyUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
}

async function findOwnedNote(id: string, userId: string) {
  return prisma.note.findFirst({
    where: { id, userId },
  });
}

function resolveView(view: NotesView) {
  if (view === "trash") {
    return { isTrashed: true };
  }

  if (view === "pinned") {
    return { isTrashed: false, isPinned: true };
  }

  return { isTrashed: false };
}

export default async function notesRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: { userId: string };
    Querystring: { view?: NotesView };
  }>("/notes/:userId", async (request, reply) => {
    const { userId } = request.params;
    const view = request.query.view ?? "notes";

    const notes = await prisma.note.findMany({
      where: {
        userId,
        ...resolveView(view),
      },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    });

    return reply.send(notes);
  });

  fastify.post<{ Body: Required<Pick<NoteBody, "userId">> & NoteBody }>(
    "/notes",
    async (request, reply) => {
      const { title, content, userId, color } = request.body;

      if (!userId?.trim()) {
        return reply.code(400).send({ error: "userId majburiy" });
      }

      const user = await verifyUser(userId);
      if (!user) {
        return reply.code(404).send({ error: "Foydalanuvchi topilmadi" });
      }

      const cleanTitle = title?.trim() ?? "";
      const cleanContent = content?.trim() ?? "";

      if (!cleanTitle && !cleanContent) {
        return reply.code(400).send({
          error: "Hech bo'lmaganda title yoki content kiritish kerak",
        });
      }

      const note = await prisma.note.create({
        data: {
          title: cleanTitle || cleanContent.slice(0, 40) || "Yangi yozuv",
          content: cleanContent || cleanTitle || "",
          userId,
          color: color || "yellow",
          isPinned: false,
          isTrashed: false,
        },
      });

      return reply.code(201).send(note);
    }
  );

  fastify.put<{
    Params: { id: string };
    Body: NoteBody;
  }>("/notes/:id", async (request, reply) => {
    const { id } = request.params;
    const { title, content, color, userId, isPinned, isTrashed } =
      request.body;

    if (!userId?.trim()) {
      return reply.code(400).send({ error: "userId majburiy" });
    }

    const note = await findOwnedNote(id, userId);
    if (!note) {
      return reply.code(404).send({ error: "Yozuv topilmadi" });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(content !== undefined ? { content: content.trim() } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(isPinned !== undefined ? { isPinned } : {}),
        ...(isTrashed !== undefined ? { isTrashed } : {}),
      },
    });

    return reply.send(updated);
  });

  fastify.patch<{
    Params: { id: string };
    Body: { userId?: string };
  }>("/notes/:id/pin", async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.body;

    if (!userId?.trim()) {
      return reply.code(400).send({ error: "userId majburiy" });
    }

    const note = await findOwnedNote(id, userId);
    if (!note) {
      return reply.code(404).send({ error: "Yozuv topilmadi" });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { isPinned: !note.isPinned },
    });

    return reply.send(updated);
  });

  fastify.patch<{
    Params: { id: string };
    Body: { userId?: string };
  }>("/notes/:id/restore", async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.body;

    if (!userId?.trim()) {
      return reply.code(400).send({ error: "userId majburiy" });
    }

    const note = await findOwnedNote(id, userId);
    if (!note) {
      return reply.code(404).send({ error: "Yozuv topilmadi" });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { isTrashed: false, isPinned: false },
    });

    return reply.send(updated);
  });

  fastify.delete<{
    Params: { id: string };
    Body: { userId?: string };
  }>("/notes/:id", async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.body;

    if (!userId?.trim()) {
      return reply.code(400).send({ error: "userId majburiy" });
    }

    const note = await findOwnedNote(id, userId);
    if (!note) {
      return reply.code(404).send({ error: "Yozuv topilmadi" });
    }

    if (note.isTrashed) {
      await prisma.note.delete({ where: { id } });
      return reply.code(204).send();
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { isTrashed: true, isPinned: false },
    });

    return reply.send(updated);
  });
}
