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
      profile_image: user.profile_image ?? `${process.env.APP_URL}/placeholder/person.png`,  
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

  user.name = name;
  user.email = email;
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

export {
  getAllUsers,
  updateUserDetails,
  EnableDisable2FA,
  getProfile,
  updateProfile,
  getAllVerifiedUsers,
  getDashboard,
  securitySetting
};
