import { AUTH_TOKEN } from "../constants/config.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

const isAuthenticated = (req, res, next) => {
  const token = req.cookies[AUTH_TOKEN];
  if (!token) return next(new ErrorHandler("Please login to access", 401));

  const user = jwt.verify(token, process.env.JWT_SECRET);
  req.user = user._id;
  next();
};

const adminOnly = (req, res, next) => {
  const token = req.cookies["chat-admin-token"];
  if (!token)
    return next(new ErrorHandler("Only admin can access this route", 401));

  const adminId = jwt.verify(token, process.env.JWT_SECRET);
  if (!adminId)
    return next(new ErrorHandler("Only admin can access this route", 401));

  next();
};

const socketAuthentication = async (err, socket, next) => {
  try {
    if (err) return next(err);
    const authToken = socket.request.cookies[AUTH_TOKEN];
    if (!authToken)
      return next(new ErrorHandler("Please login to access this route", 401));

    const decoded_data = jwt.verify(authToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded_data._id);
    if (!user)
      return next(new ErrorHandler("Please login to access this route", 401));

    socket.user = user;

    return next();
  } catch (e) {
    console.log(e);
    return next(new ErrorHandler("Please login to access this route", 401));
  }
};

export { isAuthenticated, adminOnly, socketAuthentication };
