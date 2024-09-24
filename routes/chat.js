import express from "express";
import { attachementsMulter } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  addMemebers,
  deleteChat,
  getChatDetails,
  getMessages,
  getMyChats,
  getMyGroups,
  leaveGroup,
  newGroupChat,
  removeMember,
  renameGroup,
  sendAttachements,
} from "../controllers/chat.js";
import {
  addMembersValidator,
  ChatDetailsValidator,
  newGroupValidator,
  removeMemberValidator,
  renameValidator,
  sendAttachementValidator,
  validateHandler,
} from "../utils/validators.js";

const router = express.Router();

router.use(isAuthenticated); // middleware

router.post("/new", newGroupValidator(), validateHandler, newGroupChat);
router.get("/my", getMyChats);
router.get("/my/groups", getMyGroups);
router.put("/add_members", addMembersValidator(), validateHandler, addMemebers);
router.put(
  "/remove_member",
  removeMemberValidator(),
  validateHandler,
  removeMember
);
router.delete(
  "/leave_group/:id",
  ChatDetailsValidator(),
  validateHandler,
  leaveGroup
);

//send attachements

router.post(
  "/message",
  attachementsMulter,
  sendAttachementValidator(),
  validateHandler,
  sendAttachements
);

router.get(
  "/messages/:id",
  ChatDetailsValidator(),
  validateHandler,
  getMessages
);

router
  .route("/:id")
  .get(ChatDetailsValidator(), validateHandler, getChatDetails)
  .put(renameValidator(), validateHandler, renameGroup)
  .delete(ChatDetailsValidator(), validateHandler, deleteChat);

export default router;
