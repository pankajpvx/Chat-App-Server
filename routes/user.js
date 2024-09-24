import express from "express";
import {
  acceptFriendRequest,
  getMyFriends,
  getMyNotifications,
  getMyProfile,
  login,
  logout,
  newUser,
  searchUser,
  sendFriendRequest,
} from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  acceptReqValidator,
  loginValidator,
  registerValidator,
  sendReqValidator,
  validateHandler,
} from "../utils/validators.js";

const router = express.Router();

router.post(
  "/new",
  singleAvatar,
  registerValidator(),
  validateHandler,
  newUser
);

router.post("/login", loginValidator(), validateHandler, login);

// after login

router.use(isAuthenticated); // middleware

router.get("/me", getMyProfile);
router.get("/logout", logout);
router.get("/search", searchUser);

router.put(
  "/sendRequest",
  sendReqValidator(),
  validateHandler,
  sendFriendRequest
);
router.put(
  "/acceptRequest",
  acceptReqValidator(),
  validateHandler,
  acceptFriendRequest
);

router.get("/notifications", getMyNotifications);
router.get("/friends", getMyFriends);

export default router;
