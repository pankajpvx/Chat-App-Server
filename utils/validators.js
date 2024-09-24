import { body, check, param, query, validationResult } from "express-validator";
import { ErrorHandler } from "./utility.js";

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMsgs = errors
    .array()
    .map((err) => err.msg)
    .join(", ");

  if (errors.isEmpty()) next();
  else next(new ErrorHandler(errorMsgs, 400));
};

const registerValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("username", "Please enter username").notEmpty(),
  body("bio", "Please enter bio").notEmpty(),
  body("password", "Please enter password").notEmpty(),
];
const loginValidator = () => [
  body("username", "Please enter username").notEmpty(),
  body("password", "Please enter password").notEmpty(),
];

const newGroupValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please enter members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be 2-100"),
];
const addMembersValidator = () => [
  body("chatId", "Please enter chat id").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please enter members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members must be 1-97"),
];
const removeMemberValidator = () => [
  body("chatId", "Please enter chat id").notEmpty(),
  body("userId", "Please enter user id").notEmpty(),
];

const sendAttachementValidator = () => [
  body("chatId", "Please enter chat id").notEmpty(),
];

const ChatDetailsValidator = () => [
  param("id", "Please enter chat id").notEmpty(),
];

const renameValidator = () => [
  param("id", "Please enter chat id").notEmpty(),
  body("name", "Please enter Name").notEmpty(),
];

const sendReqValidator = () => [
  body("userId", "Please enter user ID").notEmpty(),
];
const acceptReqValidator = () => [
  body("requestId", "Please enter request ID").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("Please add accept")
    .isBoolean()
    .withMessage("Accept must be boolean"),
];

const adminLoginValidator = () => [
  body("secretKey", "Please enter secret key ID").notEmpty(),
];
export {
  registerValidator,
  validateHandler,
  loginValidator,
  newGroupValidator,
  addMembersValidator,
  removeMemberValidator,
  sendAttachementValidator,
  ChatDetailsValidator,
  renameValidator,
  sendReqValidator,
  acceptReqValidator,
  adminLoginValidator,
};
