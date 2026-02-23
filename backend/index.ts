import { createServer } from "http";
import { Server } from "socket.io";

const server = createServer();

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

type Message = {
  id: string;
  text: string;
  timestamp: number;
}

let messages: Message[] = []

io.on("connection", (socket) => {
  console.log("User Connected: " + socket.id);

  socket.emit("message", messages);

  socket.on("message", (data) => {
    console.log("Received: " + data);

    messages.push({id:socket.id, text: data, timestamp: Date.now()});

    io.emit("message", messages);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
  });
});

server.listen(4000, () => {
  console.log("Server listening on port 4000");
});
