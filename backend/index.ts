import express from "express";
import { createServer } from "http";
import cors from "cors";
import { Server } from "socket.io";
import jwt, { type JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;


const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
}));
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});


type User = {
  id: string;
  username: string;
  email: string;
  password: string;
  socketId?: string;
  status: "Online" | "Offline";
  friends: string[];
  friendRequests: string[]
}



type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

type Conversation = {
  id: string;
  name?: string;
  isGroup: boolean;
  members: string[];
  messages: Message[];
}

let users: User[] = [];

let messages: Message[] = []

app.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = users.find(u => u.username === decoded.username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      id: user.id,
      username: user.username,
      status: user.status,
      friends: user.friends,
      friendRequests: user.friendRequests
    });
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
});

app.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  const existingUsername = users.find(user => user.username === username);
  const existingEmail = users.find(user => user.email === email);

  if (existingUsername) {
    return res.status(400).json({ error:"Username already exists" });
  }

  if(existingEmail) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const newUser: User = {
    id: users.length + 1 + "",
    username,
    email,
    password,
    status: "Online",
    friends: [],
    friendRequests: []
  };

  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, username: newUser.username },
    JWT_SECRET, { expiresIn: "30d" });

  console.log("Registered users: ", users);

  res.status(201).json({ message: "User registered successfully", token });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(400).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ id: user.id, username: user.username },
    JWT_SECRET, { expiresIn: "30d" });

  res.json({ message: "Login successful", token });
});

io.on("connection", (socket) => {
  console.log("User Connected: " + socket.id);

  socket.on("join", (token) => {
    try {
      const decoded: string | JwtPayload = jwt.verify(token, JWT_SECRET);

      const user = users.find(u => u.username === (decoded as JwtPayload).username);
      if (!user) return;

      user.socketId = socket.id;
      user.status = "Online";

      console.log(user.username + " is " + user.status + " with socket:", socket.id);
    } catch (err) {
      console.log("Invalid token on join");
    }
  });

  socket.emit("message", messages);

  socket.on("message", (data) => {
    console.log("Received: " + data);

    const user = users.find(u => u.socketId === socket.id);
    if (!user) {
      console.log("User not found for socket: " + socket.id);
      return;
    }

    messages.push({id:socket.id, text: data, senderId: user.id, timestamp: Date.now()});

    io.emit("message", messages);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
    const user = users.find(u => u.socketId === socket.id);
    if (user) {
      user.status = "Offline";
      console.log(user.username + " is " + user.status);
    }
  });
});

server.listen(4000, () => {
  console.log("Server listening on port 4000");
});
