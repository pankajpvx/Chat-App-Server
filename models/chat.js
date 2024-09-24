import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    groupChat: {
      type: Boolean,
      default: false,
    },
    creator: {
      type: Types.ObjectId,
      ref: "user",
    },
    members: [
      {
        type: Types.ObjectId,
        ref: "user",
      },
    ],
  },
  { timestamps: true }
);

export const Chat = model("chat", schema);
