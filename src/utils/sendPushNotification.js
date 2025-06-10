// 1. Import the admin SDK and the sendPushNotification function.
import { firebaseAdmin } from "../config/firebase.js";
import Notification from "../models/notification.model.js";

// Send push notification
const sendPushNotification = async (
  deviceToken,
  title,
  body,
  senderId,
  receiverId,
  data = {}
) => {
  const message = {
    tokens: deviceToken,
    notification: {
      title,
      body,
    },
    data,
  };

  // Save notificationi in the database

  const saveNotification = await Notification.create({
    senderId,
    receiverId,
    title,
    body,
    data,
  });

  try {
    const response = await firebaseAdmin
      .messaging()
      .sendEachForMulticast(message);

    console.log("Successfully sent message:", response);
    return response;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export default sendPushNotification;
