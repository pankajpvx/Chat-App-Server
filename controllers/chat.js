import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { Chat } from "../models/chat.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  UploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";
import { User } from "../models/user.js";
import { Message } from "../models/message.js";

const newGroupChat = async (req, res, next) => {
  try {
    const { name, members } = req.body;
    const allMembers = [...members, req.user];

    await Chat.create({
      name,
      members: allMembers,
      creator: req.user,
      groupChat: true,
    });

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(201).json({
      success: true,
      message: "Group created",
    });
  } catch (error) {
    next(error);
  }
};

const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.user }).populate(
      "members",
      "name avatar"
    );

    const transformedChat = chats.map(
      ({ _id, name, members, groupChat, creator }) => {
        const otherMember = members.find(
          (member) => member._id.toString() !== req.user.toString()
        );

        return {
          _id,
          name: groupChat ? name : otherMember.name,
          members: members.reduce((prev, currentValue) => {
            if (currentValue._id.toString() !== req.user.toString()) {
              prev.push(currentValue._id);
            }
            return prev;
          }, []),

          groupChat,
          avatar: groupChat
            ? members.slice(0, 3).map(({ avatar }) => avatar.url)
            : [otherMember.avatar.url],
        };
      }
    );

    res.status(200).json({
      success: true,
      chats: transformedChat,
    });
  } catch (err) {
    next(err);
  }
};

const getMyGroups = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      creator: req.user,
      groupChat: true,
      members: req.user,
    }).populate("members", "name avatar");

    const groups = chats.map(({ name, _id, groupChat, members }) => ({
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));

    return res.status(200).json({ success: true, groups });
  } catch (err) {
    next(err);
  }
};

const addMemebers = async (req, res, next) => {
  try {
    const { members, chatId } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (!chat.groupChat)
      return next(new ErrorHandler("This is not a group chat", 400));

    if (chat.creator.toString() !== req.user.toString())
      return next(new ErrorHandler("You are not allowed to add members", 403));

    const allNewMembersPromise = members?.map((member) =>
      User.findById(member, "name")
    );
    const allNewMembers = await Promise.all(allNewMembersPromise);

    const uniqueMembers = allNewMembers.filter(
      (i) => !chat.members.includes(i._id.toString())
    );

    chat.members.push(...uniqueMembers.map((i) => i._id));

    if (chat.members.length > 100)
      return next(new ErrorHandler("Group members limit exceeded", 400));

    await chat.save();

    const allUserName = uniqueMembers.map((i) => i.name).join(",");

    emitEvent(
      req,
      ALERT,
      chat.members,
      `${allUserName} have been added in the group`
    );

    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
      success: true,
      message: "members added successfully",
    });
  } catch (err) {
    next(err);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;
    const [chat, user] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId),
    ]);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (!chat.groupChat)
      return next(new ErrorHandler("This is not a group chat", 400));

    if (chat.creator.toString() !== req.user.toString())
      return next(
        new ErrorHandler("You are not allowed to remove any member", 403)
      );

    if (chat.members.length <= 3)
      return next(new ErrorHandler("Group must have at least 3 members", 400));

    chat.members = chat.members.filter(
      (member) => member.toString() !== userId.toString()
    );

    await chat.save();

    emitEvent(
      req,
      ALERT,
      chat.members,
      `${user.name} has been removed from the group.`
    );
    emitEvent(req, REFETCH_CHATS, [...chat.members, userId]);

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (err) {
    next(err);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    const otherMembers = chat.members.filter(
      (member) => member.toString() !== req.user.toString()
    );

    if (otherMembers.length < 3)
      return next(new ErrorHandler("group must have at least 3 members", 400));

    if (chat.creator.toString() === req.user.toString()) {
      const randomIndex = Math.floor(Math.random() * otherMembers.length);
      const newCreator = otherMembers[randomIndex];
      chat.creator = newCreator;
    }

    chat.members = otherMembers;

    const [user] = await Promise.all([
      User.findById(req.user, "name"),
      chat.save(),
    ]);

    emitEvent(req, ALERT, chat.members, `user ${user.name} has left the group`);

    return res.json({
      success: true,
      message: "you left the group successfully",
    });
  } catch (err) {
    next(err);
  }
};

const sendAttachements = async (req, res, next) => {
  try {
    const { chatId } = req.body;

    const files = req.files || [];
    if (files.length < 1)
      return next(new ErrorHandler("Please upload attachements", 400));
    if (files.length > 5)
      return next(new ErrorHandler("Files can't be more than 5", 400));

    const [chat, user] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.user, "name"),
    ]);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    const attachments = await UploadFilesToCloudinary(files);

    const messageForDB = {
      content: "",
      attachments,
      sender: user._id,
      chat: chatId,
    };

    const messageForRealTime = {
      ...messageForDB,
      sender: {
        _id: user._id,
        name: user.name,
      },
    };

    const message = await Message.create(messageForDB);

    emitEvent(req, NEW_MESSAGE, chat.members, {
      message: messageForRealTime,
      chatId,
    });
    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, {
      chatId,
    });

    return res.json({
      success: true,
      message,
    });
  } catch (err) {
    next(err);
  }
};

const getChatDetails = async (req, res, next) => {
  try {
    if (req.query.populate === "true") {
      const chat = await Chat.findOne({ _id: req.params.id, members: req.user })
        .populate("members", "name avatar")
        .lean();

      if (!chat) return next(new ErrorHandler("Chat not found", 404));

      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar?.url,
      }));

      return res.status(200).json({
        success: true,
        chat,
      });
    } else {
      const chat = await Chat.findOne({
        _id: req.params.id,
        members: req.user,
      });

      if (!chat) return next(new ErrorHandler("Chat not found", 404));

      return res.status(200).json({
        success: true,
        chat,
      });
    }
  } catch (err) {
    next(err);
  }
};

const renameGroup = async (req, res, next) => {
  try {
    const { name } = req.body;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    if (!chat.groupChat)
      return next(new ErrorHandler("This is not a group", 400));
    if (chat.creator.toString() !== req.user.toString())
      return next(
        new ErrorHandler("You are not allowed to rename the group", 403)
      );

    chat.name = name;
    chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);
    return res.status(200).json({
      success: true,
      messaage: "Group renamed successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    const members = chat.members;

    if (chat.groupChat && chat.creator.toString() !== req.user.toString())
      return next(
        new ErrorHandler("You are not allowed to delete the group", 403)
      );

    if (!chat.groupChat && !chat.members.includes(req.user.toString()))
      return next(
        new ErrorHandler("You are not allowed to delete the group", 403)
      );

    const messagesWithAttachements = await Message.find({
      chat: chatId,
      attachments: {
        $exists: true,
        $ne: [],
      },
    });

    const public_ids = [];

    messagesWithAttachements.forEach(({ attachments }) => {
      attachments.forEach(({ public_id }) => public_ids.push(public_id));
    });

    await Promise.all([
      deleteFilesFromCloudinary(public_ids),
      chat.deleteOne(),
      Message.deleteMany({ chat: chatId }),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
      success: true,
      message: "chat deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { page = 1 } = req.query;

    const chat = await Chat.findById(chatId);
    if (!chat) return next(new ErrorHandler("chat not found", 404));

    if (!chat.members.includes(req.user.toString()))
      return next(
        new ErrorHandler("You are not allowed to access this chat", 403)
      );

    const resultPerPage = 20;
    const skip = (page - 1) * resultPerPage;
    const messagePromises = Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resultPerPage)
      .populate("sender", "name")
      .lean();

    const [messages, totalMessagesCount] = await Promise.all([
      messagePromises,
      Message.countDocuments({ chat: chatId }),
    ]);

    const totalPages = Math.ceil(totalMessagesCount / resultPerPage);

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      totalPages,
      totalMessagesCount,
      currentPage: page,
    });
  } catch (err) {
    next(err);
  }
};

export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMemebers,
  removeMember,
  leaveGroup,
  sendAttachements,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
};
