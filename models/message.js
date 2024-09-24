import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    content: {
      type: String,
    },
    attachments: [
      {
        public_id: {
          type: String,
        },
        url: {
          type: String,
        },
      },
    ],
    sender: {
      type: Types.ObjectId,
      ref: "user",
      required: true,
    },
    chat: {
      type: Types.ObjectId,
      ref: "chat",
      required: true,
    },
  },
  { timestamps: true }
);

export const Message = model("message", schema);
