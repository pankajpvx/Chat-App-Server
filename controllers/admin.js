import Jwt from "jsonwebtoken";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import { cookieOptions } from "../utils/features.js";

const adminLogin = async (req, res, next) => {
  try {
    const { secretKey } = req.body;
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || "sisko";
    const isMatch = secretKey === adminSecretKey;

    if (!isMatch) return next(new ErrorHandler("Invalid Admin Key", 401));

    const token = Jwt.sign(secretKey, process.env.JWT_SECRET);
    res.status(200).cookie("chat-admin-token", token, cookieOptions).json({
      success: true,
      message: "Authenticated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const adminLogout = async (req, res, next) => {
  try {
    res
      .status(200)
      .cookie("chat-admin-token", "", { ...cookieOptions, maxAge: 0 })
      .json({
        success: true,
        message: "logged out successfully",
      });
  } catch (err) {
    next(err);
  }
};

const getAdmin = (req, res) => {
  return res.status(200).json({
    admin: true,
  });
};

const allUsers = async (req, res, next) => {
  try {
    const users = await User.find({});

    const transformUsers = await Promise.all(
      users.map(async ({ _id, name, username, avatar }) => {
        const [friends, groups] = await Promise.all([
          Chat.countDocuments({ groupChat: false, members: _id }),
          Chat.countDocuments({ groupChat: true, members: _id, creator: _id }),
        ]);
        return {
          name,
          username,
          avatar: avatar.url,
          _id,
          groups,
          friends,
        };
      })
    );

    res.status(200).json({
      status: "success",
      totalUsers: transformUsers.length,
      users: transformUsers,
    });
  } catch (err) {
    next(err);
  }
};

const allChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({})
      .populate("members", "name avatar")
      .populate("creator", "name avatar");

    const transformedChats = await Promise.all(
      chats.map(async ({ members, _id, groupChat, name, creator }) => {
        const totalMessages = await Message.countDocuments({ chat: _id });

        return {
          _id,
          groupChat,
          name,
          avatar: members.slice(0, 3).map((member) => member.avatar.url),
          members: members.map(({ _id, name, avatar }) => ({
            _id,
            name,
            avatar: avatar.url,
          })),
          creator: {
            name: creator?.name || "none",
            avatar: creator?.avatar.url || "",
          },
          totalMembers: members.length,
          totalMessages,
        };
      })
    );

    return res.status(200).json({
      status: "success",
      chats: transformedChats,
    });
  } catch (err) {
    next(err);
  }
};

const allMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({})
      .populate("sender", "name avatar")
      .populate("chat", "groupChat");

    const transformedMessages = messages.map(
      ({ _id, content, sender, attachments, createdAt, chat }) => ({
        _id,
        content,
        attachments,
        createdAt,
        chat: chat._id,
        groupChat: chat.groupChat,
        sender: {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar.url,
        },
      })
    );

    return res.status(200).json({
      success: true,
      messages: transformedMessages,
    });
  } catch (err) {
    next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [groupsCount, userCount, messageCount, totalChatCounts] =
      await Promise.all([
        Chat.countDocuments({ groupChat: true }),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
      ]);

    const today = new Date();
    const last7days = new Date();
    last7days.setDate(last7days.getDate() - 7);

    const last7daysMessages = await Message.find({
      createdAt: {
        $gte: last7days,
        $lte: today,
      },
    }).select("createdAt");

    const messages = new Array(7).fill(0);

    last7daysMessages.forEach((message) => {
      const ApproxIndex =
        (today.getTime() - message.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      const approx = Math.floor(ApproxIndex);
      messages[6 - approx]++;
    });

    const stats = {
      groupsCount,
      userCount,
      messageCount,
      totalChatCounts,
      messages,
    };

    return res.status(200).json({
      success: true,
      stats: stats,
    });
  } catch (err) {
    next(err);
  }
};

export {
  allUsers,
  getAdmin,
  allChats,
  allMessages,
  getDashboardStats,
  adminLogin,
  adminLogout,
};
