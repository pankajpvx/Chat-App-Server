import express from "express";
import {
  adminLogin,
  adminLogout,
  allChats,
  allMessages,
  allUsers,
  getAdmin,
  getDashboardStats,
} from "../controllers/admin.js";
import { adminLoginValidator, validateHandler } from "../utils/validators.js";
import { adminOnly } from "../middlewares/auth.js";

const router = express.Router();

router.post("/verify", adminLoginValidator(), validateHandler, adminLogin);

router.get("/logout", adminLogout);

// only admin can access these routes
router.use(adminOnly);

router.get("/", getAdmin);

router.get("/users", allUsers);

router.get("/chats", allChats);

router.get("/messages", allMessages);

router.get("/stats", getDashboardStats);

export default router;
