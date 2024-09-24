import express from "express";
import userRoute from "./routes/user.js";
import { connectDB } from "./utils/features.js";
import dotenv from "dotenv";
import { errorMiddlerware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import chatRoute from "./routes/chat.js";
import adminRoute from "./routes/admin.js";
import { Server } from "socket.io";
import http from "http";
import {
  CHAT_JOINED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
} from "./constants/events.js";
import { v4 as uuid } from "uuid";
import { getSockets } from "./utils/utility.js";
import { Message } from "./models/message.js";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import { corsOptions } from "./constants/config.js";
import { socketAuthentication } from "./middlewares/auth.js";

dotenv.config({
  path: "./.env",
});

const env_mode = process.env.NODE_ENV || "PRODUCTION";

const userSocketIds = new Map();
const onlineUsers = new Set();

const port = process.env.PORT || 3000;
connectDB(process.env.MONGO_URI);

const app = express();
const server = http.createServer(app);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const io = new Server(server, {
  cors: corsOptions(),
});

app.set("io", io);

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthentication(err, socket, next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user;

  userSocketIds.set(user._id.toString(), socket.id);

  // console.log(`${user.name} connected`);

  socket.on(CHAT_JOINED, (members) => {
    onlineUsers.add(user._id.toString());
    const users = getSockets([...members, user._id.toString()]);
    io.to(users).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDb = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const membsersSocket = getSockets(members);
    io.to(membsersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });

    io.to(membsersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDb);
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("disconnect", () => {
    userSocketIds.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

// createUser(10);

// createMessagesInAChat("66c4c792e659691b81479c08", 50);

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors(corsOptions()));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.use(errorMiddlerware);

server.listen(port, () =>
  console.log(`server is running on ${port} in ${env_mode} mode`)
);

export { env_mode, userSocketIds };
