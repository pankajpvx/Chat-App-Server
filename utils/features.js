import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuid } from "uuid";
import { AUTH_TOKEN } from "../constants/config.js";
import { getSockets } from "./utility.js";

export const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

export const connectDB = (url) => {
  mongoose
    .connect(url, { dbName: "chatting" })
    .then(() => console.log("mongoDB connected"));
};

export const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  if (user.password) delete user.password;
  return res.status(code).cookie(AUTH_TOKEN, token, cookieOptions).json({
    success: true,
    message,
    user,
  });
};

export const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const usersSocket = getSockets(users);
  io.to(usersSocket).emit(event, data);
};

export const getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

export const UploadFilesToCloudinary = async (files = []) => {
  const uploadedPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadedPromises);

    const formattedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
    return formattedResults;
  } catch (err) {
    throw new Error("Error uploading files to cloudinary", err);
  }
};

export const deleteFilesFromCloudinary = async (public_ids) => {};
