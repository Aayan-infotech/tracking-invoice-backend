import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    senderId: {
      type: String,
      index: true,
      required: true,
    },
    receiverId: {
      type: String,
      index: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
      default: {},
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationModel = mongoose.model("Notification", notificationSchema);

export default NotificationModel;
