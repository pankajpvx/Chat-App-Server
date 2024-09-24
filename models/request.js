import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected"],
    },
    sender: {
      type: Types.ObjectId,
      ref: "user",
      required: true,
    },
    receiver: {
      type: Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true }
);

export const Request = model("request", schema);
