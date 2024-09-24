import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { faker, SimpleFaker } from "@faker-js/faker";

const createUser = async (numUsers) => {
  try {
    const usersPromise = [];
    for (let i = 0; i < numUsers; i++) {
      const tempUser = User.create({
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        bio: faker.lorem.sentence(10),
        password: "password",
        avatar: {
          url: faker.image.avatar(),
          public_id: faker.system.fileName(),
        },
      });
      usersPromise.push(tempUser);
    }

    const all = await Promise.all(usersPromise);
    console.log("users created", all);
    process.exit(1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const createSingleChat = async (numChats) => {
  try {
    const users = await User.find().select("_id");
    const chatsPromise = [];

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        chatsPromise.push(
          Chat.create({
            name: faker.lorem.words(2),
            members: [users[i], users[j]],
          })
        );
      }
    }

    await Promise.all(chatsPromise);
    console.log("chats are created successfully");
    process.exit(1);
  } catch (err) {
    process.exit(1);
    console.error("error");
  }
};

const createGroupChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");
    const chatsPromise = [];

    for (let i = 0; i < numChats; i++) {
      const numMembers = 4;
      const members = [];
      for (let i = 0; i < numMembers; i++) {
        const randomIndex = Math.floor(Math.random() * users.length);
        const randomUser = users[randomIndex];

        if (!members.includes(randomUser)) {
          members.push(randomUser);
        }
      }

      const chat = Chat.create({
        groupChat: true,
        name: faker.lorem.words(1),
        members,
        creator: members[0],
      });

      chatsPromise.push(chat);
    }

    const data = await Promise.all(chatsPromise);
    console.log("chats created Successfully", data[0]);
    process.exit(1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const createMessages = async (msgNum) => {
  try {
    const users = await User.find().select("_id");
    const chats = await Chats.find().select("_id");

    const messagePromises = [];
    for (let i = 0; i < msgNum.length; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomChat = chats[Math.floor(Math.random() * chats.length)];

      messagePromises.push(
        Message.create({
          chat: randomChat,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }

    await Promise.all(messagePromises);
    console.log("messages created successfully");
    process.exit(1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const createMessagesInAChat = async (chatId, msgNum) => {
  try {
    const users = await User.find().select("_id");

    const messagePromises = [];
    for (let i = 0; i < msgNum; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];

      const message = Message.create({
        chat: chatId,
        sender: randomUser,
        content: faker.lorem.sentence(),
      });
      messagePromises.push(message);
    }
    await Promise.all(messagePromises);

    console.log("messages created successfully");
    process.exit(1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export {
  createUser,
  createSingleChat,
  createGroupChats,
  createMessages,
  createMessagesInAChat,
};
