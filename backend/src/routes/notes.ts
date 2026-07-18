import { FastifyInstance } from "fastify";
import prisma from "../db";
import { requireAuth } from "../auth";

type NoteBody = {
  title?: string;
  content?: string;
  color?: string;
};

type NotesView = "notes" | "pinned" | "trash";

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
  // Shu pluginga tegishli barcha routelar tokenni talab qiladi.
  // userId endi hech qachon clientdan emas, tokendan olinadi.
  fastify.addHook("preHandler", requireAuth);

  fastify.get<{
    Querystring: { view?: NotesView };
  }>("/notes", async (request, reply) => {
    const userId = request.userId!;
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

  fastify.post<{ Body: NoteBody }>("/notes", async (request, reply) => {
    const userId = request.userId!;
    const { title, content, color } = request.body ?? {};

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
  });

  fastify.put<{
    Params: { id: string };
    Body: NoteBody;
  }>("/notes/:id", async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params;
    const { title, content, color } = request.body ?? {};

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
      },
    });

    return reply.send(updated);
  });

  fastify.patch<{
    Params: { id: string };
  }>("/notes/:id/pin", async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params;

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
  }>("/notes/:id/restore", async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params;

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
  }>("/notes/:id", async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params;

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
