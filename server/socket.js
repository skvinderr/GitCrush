// mast logic hai
const socketIo = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function initSocket(server, sessionMiddleware) {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // socket.io me session daalo
  const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
  io.use(wrap(sessionMiddleware));

  // auth zaruri hai
  io.use((socket, next) => {
    if (socket.request.session && socket.request.session.userId) {
      socket.userId = socket.request.session.userId;
      next();
    } else {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.userId}`);

    // match room me jao
    socket.on("join_room", async ({ matchId }) => {
      // security check (match me hai ya nahi)
      const match = await prisma.match.findUnique({ where: { id: matchId }});
      if (!match || (match.user1Id !== socket.userId && match.user2Id !== socket.userId)) {
        return socket.emit("error", "Unauthorized access to room");
      }
      
      socket.join(matchId);
      console.log(`User ${socket.userId} joined room ${matchId}`);
    });

    // message bhejo
    socket.on("send_message", async ({ matchId, content, type = "text", language = null }) => {
      try {
        const message = await prisma.message.create({
          data: {
            matchId,
            senderId: socket.userId,
            content,
            type,
            language,
            reactions: {} // Empty JSON initially
          },
          include: { sender: true }
        });

        // sabko bhej do room me
        io.to(matchId).emit("message_received", message);
      } catch (err) {
        console.error("Error saving message:", err);
      }
    });

    // typing dikhao
    socket.on("typing_indicator", ({ matchId, isTyping }) => {
      // Broadcast to others in the room
      socket.to(matchId).emit("typing_indicator", { userId: socket.userId, isTyping });
    });

    // read receipt
    socket.on("mark_read", async ({ matchId }) => {
      // jo maine nahi bheje unhe read mark karo
      await prisma.message.updateMany({
        where: {
          matchId,
          senderId: { not: socket.userId },
          readAt: null
        },
        data: { readAt: new Date() }
      });
      // Notify the sender that their messages were read
      socket.to(matchId).emit("messages_read", { matchId, readBy: socket.userId });
    });

    // reaction handle karo
    socket.on("add_reaction", async ({ messageId, emoji }) => {
      try {
        const msg = await prisma.message.findUnique({ where: { id: messageId }});
        if (!msg) return;

        let reactions = msg.reactions || {};
        if (!reactions[emoji]) reactions[emoji] = [];
        
        // Add user if not already reacted
        if (!reactions[emoji].includes(socket.userId)) {
          reactions[emoji].push(socket.userId);
        } else {
          // Toggle off if they react again
          reactions[emoji] = reactions[emoji].filter(id => id !== socket.userId);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        }

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { reactions }
        });

        io.to(msg.matchId).emit("message_updated", updated);
      } catch (err) {
        console.error("Error updating reaction:", err);
      }
    });

    // challenge update notification
    socket.on("notify_challenge_update", ({ matchId }) => {
      socket.to(matchId).emit("challenge_updated");
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
}

module.exports = { initSocket };
