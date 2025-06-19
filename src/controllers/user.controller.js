import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadImage, deleteObject } from "../utils/awsS3Utils.js";
import fs from "fs";
import { sendEmail } from "../services/emailService.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { DeviceDetails } from "../models/deviceDetails.model.js";
import Notification from "../models/notification.model.js";
import { isValidObjectId } from "../utils/isValidObjectId.js";

const getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const aggregation = [];

  aggregation.push({
    $match: { role: "user" },
  });
  aggregation.push({
    $sort: { createdAt: -1 },
  });

  aggregation.push({
    $facet: {
      users: [
        { $skip: skip },
        { $limit: limit },
        { $project: { password: 0, __v: 0 } },
      ],
      totalCount: [{ $count: "count" }],
    },
  });


  const result = await User.aggregate(aggregation);
  const users = result[0].users;
  const totalRecords =
    result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
  const totalPages = Math.ceil(totalRecords / limit);

  res.json(
    new ApiResponse(
      200,
      users.length > 0 ? "Fetched all users successfully" : "No users found",
      users.length > 0
        ? {
          users,
          total_page: totalPages,
          current_page: page,
          total_records: totalRecords,
          per_page: limit,
        }
        : null
    )
  );
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findOne({ userId });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.isVerified === false) {
    throw new ApiError(400, "User Email is not verified");
  }

  const { username, name, email, mobile, address, password } = req.body;

  const userNameLower = username.toLowerCase();

  const existingUser = await User.findOne({
    username: userNameLower,
    userId: { $ne: userId },
  });
  if (existingUser) {
    throw new ApiError(400, "Username already exists");
  }

  let profile_image = user.profile_image;

  if (req.files && req.files.profile_image) {
    if (user.profile_image) {
      await deleteObject(user.profile_image);
    }

    const updateStatus = await uploadImage(req.files.profile_image[0]);

    if (updateStatus.success) {
      profile_image = updateStatus.fileUrl;
    }
  }

  //   send email

  const html = fs.readFileSync(
    "./src/emails/sendUsernamePassword.html",
    "utf-8"
  );
  const subject = "Login Credentials for Your Account";
  const usernameHTML = new RegExp(`{{USER_NAME}}`, "g");
  const updatedHtml = html.replace(usernameHTML, userNameLower);
  const passwordHTML = new RegExp(`{{PASSWORD}}`, "g");
  const updatedHtml1 = updatedHtml.replace(passwordHTML, password);
  const year = new RegExp(`{{YEAR}}`, "g");
  const updatedHtml2 = updatedHtml1.replace(year, new Date().getFullYear());

  const send = await sendEmail(user.email, subject, updatedHtml2);

  user.username = userNameLower;
  user.name = name;
  //   user.email = email;
  //   user.mobile = mobile;
  user.address = address;
  user.password = password;
  user.profile_image = profile_image;

  const updatedUser = await user.save();

  res.json(
    new ApiResponse(200, "User details updated successfully", updatedUser)
  );
});

const EnableDisable2FA = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (status !== "enable" && status !== "disable") {
    throw new ApiError(400, "Invalid status for 2FA");
  }

  const user = req.user;

  user.is2FAEnabled = status === "enable" ? true : false;
  await user.save();

  res.json(
    new ApiResponse(200, `2FA has been ${status}d successfully`, {
      userId: user.userId,
      is2FAEnabled: user.is2FAEnabled,
    })
  );
});

const getProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.json(
    new ApiResponse(200, "User profile fetched successfully", {
      userId: user.userId,
      username: user.username,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      address: user.address,
      profile_image: user.profile_image ?? `/placeholder/person.png`,
      is2FAEnabled: user.is2FAEnabled,
    })
  );
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, mobile, address } = req.body;
  const user = req.user;
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const existMobileNumber = await User.findOne({
    mobile: mobile,
    userId: { $ne: user.userId },
  });
  if (existMobileNumber) {
    throw new ApiError(400, "Mobile number already exists");
  }

  let profile_image = user.profile_image;

  if (req.files && req.files.profile_image) {
    // if (user.profile_image) {
    //   await deleteObject(user.profile_image);
    // }

    const updateStatus = await uploadImage(req.files.profile_image[0]);

    if (updateStatus.success) {
      profile_image = updateStatus.fileUrl;
    }
  }

  user.name = name;
  // user.email = email;
  user.mobile = mobile;
  user.address = address;
  user.profile_image = profile_image;


  const updatedUser = await user.save();

  res.json(new ApiResponse(200, "Profile updated successfully", updatedUser));
});


const getAllVerifiedUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isVerified: true, role: "user" }).select("userId username name");
  res.json(
    new ApiResponse(
      200,
      users.length > 0 ? "Fetched all verified users successfully" : "No verified users found",
      users.length > 0
        ? users
        : null
    )
  );
});

const getDashboard = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments({ isVerified: true, role: "user" });
  const totalProjects = await Project.countDocuments({});
  const totalTasks = await Task.countDocuments({});



  res.json(
    new ApiResponse(200, "Dashboard data fetched successfully", {
      totalUsers,
      totalProjects,
      totalTasks,
    })
  );
});

const securitySetting = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const deviceDetails = await DeviceDetails.find({ userId: user.userId });

  res.json(
    new ApiResponse(200, "Security settings fetched successfully", {
      is2FAEnabled: user.is2FAEnabled,
      deviceDetails,
    })
  );

});


const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const duration = req.query.duration || "all";

  if (!["all", "week", "month"].includes(duration)) {
    throw new ApiError(400, "Invalid duration parameter. Use 'all', 'week', or 'month'.");
  }

  const aggregation = [];
  aggregation.push({
    $match: { receiverId: req.user.userId },
  });

  aggregation.push({
    $match: {
      createdAt: {
        $gte: duration === "all" ? new Date(0) :
          duration === "week" ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) :
            duration === "month" ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) :
              new Date(0)
      }
    }
  });

  aggregation.push({
    $sort: { createdAt: -1 },
  });

  aggregation.push({
    $facet: {
      notifications: [
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            notificationId: "$_id",
            // senderId: 1,
            receiverId: 1,
            title: 1,
            body: 1,
            isRead: 1,
            createdAt: 1,
          },
        },
      ],
      totalCount: [{ $count: "count" }],
    },
  });

  const result = await Notification.aggregate(aggregation);
  const notifications = result[0].notifications;
  const totalRecords =
    result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
  const totalPages = Math.ceil(totalRecords / limit);

  res.json(
    new ApiResponse(
      200,
      notifications.length > 0 ? "Fetched notifications successfully" : "No notifications found",
      notifications.length > 0
        ? {
          notifications,
          total_page: totalPages,
          current_page: page,
          total_records: totalRecords,
          per_page: limit,
        }
        : null
    )
  );
});


const updateNotification = asyncHandler(async (req, res) => {
  const { notificationId , isRead } = req.body;
  if (!notificationId) {
    throw new ApiError(400, "Notification ID is required");
  }

  if(!isValidObjectId(notificationId)) {
    throw new ApiError(400, "Invalid Notification ID");
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (notification.receiverId !== req.user.userId) {
    throw new ApiError(403, "You are not authorized to update this notification");
  }
  notification.isRead = isRead;
  await notification.save();
  res.json(
    new ApiResponse(200, "Notification status updated successfully", {
      notificationId: notification._id,
      isRead: notification.isRead,
    })
  );

});

export {
  getAllUsers,
  updateUserDetails,
  EnableDisable2FA,
  getProfile,
  updateProfile,
  getAllVerifiedUsers,
  getDashboard,
  securitySetting,
  getNotifications,
  updateNotification
};
