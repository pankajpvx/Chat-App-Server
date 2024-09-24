import { compare } from "bcrypt";
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import {
  cookieOptions,
  emitEvent,
  sendToken,
  UploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";

const newUser = async (req, res, next) => {
  try {
    const { name, username, password, bio } = req.body;
    const file = req.file;

    if (!file) return next(new ErrorHandler("Please upload avatar", 400));

    const result = await UploadFilesToCloudinary([file]);

    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    };

    const user = await User.create({
      name,
      username,
      password,
      bio,
      avatar,
    });

    sendToken(res, user, 201, "user created");
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).select("+password").lean();
    if (!user)
      return next(new ErrorHandler("Invalid Username or Password", 404));
    const isMatch = await compare(password, user.password);
    if (!isMatch)
      return next(new ErrorHandler("Invalid Username or Password", 404));

    sendToken(res, user, 200, "Welcome back!");
  } catch (error) {
    next(error);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user);
    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  return res
    .status(200)
    .cookie("auth-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out successfully",
    });
};

const searchUser = async (req, res) => {
  const { name = "" } = req.query;
  const myChats = await Chat.find({ groupChat: false, members: req.user });
  const allMyFriends = myChats.flatMap(({ members }) => members);
  const unkownUsers = await User.find({
    _id: { $nin: allMyFriends.length === 0 ? [req.user] : allMyFriends },
    name: { $regex: name, $options: "i" },
  });

  const users = unkownUsers.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    users,
  });
};

const sendFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const request = await Request.findOne({
      $or: [
        { sender: req.user, receiver: userId },
        { sender: userId, receiver: req.user },
      ],
    });
    if (request) return next(new ErrorHandler("Request already sent", 400));

    await Request.create({
      sender: req.user,
      receiver: userId,
    });

    emitEvent(req, NEW_REQUEST, [userId]);

    return res.status(201).json({
      success: true,
      message: "Friend request sent successfully",
    });
  } catch (err) {
    next(err);
  }
};

const acceptFriendRequest = async (req, res, next) => {
  try {
    const { requestId, accept } = req.body;
    const request = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("receiver", "name");

    if (!request) return next(new ErrorHandler("Request not found", 404));
    if (request.receiver._id.toString() !== req.user.toString())
      return next(
        new ErrorHandler("You are not authorized to accept this request", 401)
      );

    if (!accept) {
      await Request.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Request deleted successfully",
      });
    }

    const members = [request.sender._id, request.receiver._id];

    await Promise.all([
      Chat.create({
        members,
        name: `${request.sender._id}-${request.receiver._id}`,
      }),
      request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
      success: true,
      message: "Friend Request Accepted",
      senderId: request.sender._id,
    });
  } catch (err) {
    next(err);
  }
};

const getMyNotifications = async (req, res, next) => {
  try {
    const requests = await Request.find({ receiver: req.user }).populate(
      "sender",
      "name avatar"
    );

    const allRequests = requests.map(({ _id, sender, receiver }) => ({
      _id,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    }));

    return res.status(200).json({
      success: true,
      allRequests,
    });
  } catch (e) {
    next(e);
  }
};

const getMyFriends = async (req, res, next) => {
  try {
    const { chatId } = req.query;
    const chats = await Chat.find({
      groupChat: false,
      members: req.user,
    }).populate("members", "name avatar");

    const friends = chats.map(({ members }) => {
      const otherMember = members.find((member) => {
        return member._id.toString() !== req.user.toString();
      });

      return {
        _id: otherMember._id,
        name: otherMember.name,
        avatar: otherMember.avatar.url,
      };
    });

    if (chatId) {
      const chat = await Chat.findById(chatId);
      const availableFriends = friends.filter(
        (friend) => !chat.members.includes(friend._id)
      );

      return res.status(200).json({
        success: true,
        friends: availableFriends,
      });
    } else {
      return res.status(200).json({
        success: true,
        friends,
      });
    }
  } catch (err) {
    next(err);
  }
};

export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getMyNotifications,
  getMyFriends,
};
