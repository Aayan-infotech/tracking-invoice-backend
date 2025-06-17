import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { generateUniqueUserId, generateOTP, generateUniqueUserName } from "../utils/HelperFunctions.js";
import { sendEmail } from "../services/emailService.js";
import fs from "fs";
import { loadConfig } from "../config/loadConfig.js";
import { DeviceDetails } from "../models/deviceDetails.model.js";

const secret = await loadConfig();

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    let refreshToken = user.refreshToken;
    try {
      jwt.verify(refreshToken, secret.REFRESH_TOKEN_SECRET);
    } catch (error) {
      refreshToken = user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    }

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const options = {
  httpOnly: true,
  secure: true,
};

const register = asyncHandler(async (req, res) => {
  const { email } = req.body;

  let userEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: userEmail, isVerified: true });

  if (existingUser) {
    throw new ApiError(400, "User already exists with this email");
  }

  const userId = await generateUniqueUserId();
  const otp = await generateOTP();
  const username = await generateUniqueUserName(userEmail);

  const html = fs.readFileSync("./src/emails/otpTemplate.html", "utf-8");
  const subject = "OTP Verification";
  const otpHTML = new RegExp(`{{OTP}}`, "g");
  const updatedHtml = html.replace(otpHTML, otp);

  // const namehtml = new RegExp(`{{name}}`, "g");
  // const updatedHtml1 = updatedHtml.replace(namehtml, name);

  const year = new RegExp(`{{year}}`, "g");
  const updatedHtml2 = updatedHtml.replace(year, new Date().getFullYear());

  const send = await sendEmail(userEmail, subject, updatedHtml2);

  if (!send.success) {
    // throw new ApiError(500, "Failed to send OTP to mobile number");
    throw new ApiError(500, "Failed to send OTP to Email");
  }

  const existingUserVerified = await User.findOne({ email: userEmail });
  if (!existingUserVerified) {
    const user = new User({
      userId,
      email: userEmail,
      username,
      otp,
      otpExpire: new Date(Date.now() + 10 * 60 * 1000),
    });

    await user.save();



    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    // check if user is created
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken -otp -otpExpire -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "User registered successfully, Please Check Email to Verify you mail...!!!",
          { user: createdUser, accessToken, refreshToken }
        )
      );

  } else {

    existingUserVerified.otp = otp;
    existingUserVerified.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
    await existingUserVerified.save();

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      existingUserVerified._id
    );
    const updatedUser = await User.findById(existingUserVerified._id).select(
      "-password -refreshToken -otp -otpExpire -refreshToken"
    );


    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "User registered successfully, Please Check Email to Verify you mail...!!!",
          { user: updatedUser, accessToken, refreshToken }
        )
      );
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    throw new ApiError(400, "Username Is Required Field..!!");
  }
  if (!password) {
    throw new ApiError(400, "Password Is Required Field..!!");
  }
  let user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(404, "User Doesn't Exist Or Invalid Username");
  }

  // check if the user is verified
  if (!user.isVerified) {
    throw new ApiError(400, "User is not verified");
  }

  const isValidPassword = await user.isPasswordCorrect(password);

  if (!isValidPassword) {
    throw new ApiError(401, "Invalid Password");
  }

  // check if user Enabled 2FA

  if (user.is2FAEnabled) {
    // If 2FA is enabled, we can send a verification code to the user
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    const html = fs.readFileSync("./src/emails/otpTemplate.html", "utf-8");

    const subject = "2FA Verification Code";
    const otpHTML = new RegExp(`{{OTP}}`, "g");
    const updatedHtml = html.replace(otpHTML, otp);
    const year = new RegExp(`{{year}}`, "g");
    const updatedHtml2 = updatedHtml.replace(year, new Date().getFullYear());
    const send = await sendEmail(user.email, subject, updatedHtml2);
    if (!send.success) {
      throw new ApiError(500, "Failed to send 2FA code to Email");
    }
  }

  // Send Access & Refresh Token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select("-password -otp -otpExpire -createdAt -updatedAt -refreshToken -__v");

  // cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User Logged in Successfully", {
        user: loggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const decoded = jwt.verify(token, secret.REFRESH_TOKEN_SECRET);

  const user = await User.findOne({ email: decoded.email });

  if (!user) {
    throw new ApiError(400, "Invalid or expired token");
  }

  user.isVerified = true;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Email verified successfully", user));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  let user = await User.findOne({ email, username: { $ne: null } });
  if (!user) {
    throw new ApiError(404, "User Doesn't Exist Or Invalid Email");
  }

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  //   mobile OTP send code
  //   const send = await sendOTP(mobile, otp);

  const html = fs.readFileSync("./src/emails/otpTemplate.html", "utf-8");
  const subject = "OTP Verification";
  const otpHTML = new RegExp(`{{OTP}}`, "g");
  const updatedHtml = html.replace(otpHTML, otp);

  const year = new RegExp(`{{year}}`, "g");
  const updatedHtml2 = updatedHtml.replace(year, new Date().getFullYear());

  const send = await sendEmail(user.email, subject, updatedHtml2);
  if (!send.success) {
    // throw new ApiError(500, "Failed to send OTP to mobile number");
    throw new ApiError(500, "Failed to send OTP to Email");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "OTP has been send to your email"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, password, confirm_password } = req.body;
  if (!email || !password || !confirm_password) {
    throw new ApiError(
      400,
      "Email, Password and Confirm Password are required"
    );
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User Not Found");
  }

  if (password !== confirm_password) {
    throw new ApiError(400, "Password and confirm Password Are Not Match");
  }

  user.password = password;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Password updated successfully", user));
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const user = await User.findOne({ email: email });

  if (!user) {
    throw new ApiError(404, "User Not Found");
  }

  if (user.otp != otp) {
    throw new ApiError(400, "Invalid OTP");
  }
  //  check if otp is expired

  if (new Date() > user.otpExpire) {
    throw new ApiError(400, "OTP Expired");
  }

  user.otp = null;
  user.otpExpire = null;
  user.isVerified = true;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "OTP verified successfully", user));
});

const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  const userEmail = email.toLowerCase();
  let user = await User.findOne({ email: userEmail });

  if (!user) {
    throw new ApiError(404, "User Doesn't Exist Or Invalid Email");
  }

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  const html = fs.readFileSync("./src/emails/otpTemplate.html", "utf-8");
  const subject = "OTP Verification";
  const otpHTML = new RegExp(`{{OTP}}`, "g");
  const updatedHtml = html.replace(otpHTML, otp);

  const year = new RegExp(`{{year}}`, "g");
  const updatedHtml2 = updatedHtml.replace(year, new Date().getFullYear());

  const send = await sendEmail(user.email, subject, updatedHtml2);

  if (!send.success) {
    throw new ApiError(500, "Failed to send OTP to Email");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "OTP has been send to your email"));
});

const logoutUser = asyncHandler(async (req, res) => {
  const { deviceToken } = req.body;
  if (!deviceToken) {
    throw new ApiError(400, "Device token is required");
  }

  // get the deviceToken update the isloggedIn to false

  const device = await DeviceDetails.findOne({
    deviceToken: deviceToken,
    userId: req.user.userId,
  });

  console.log("Device Details", device);

  if (device) {
    device.isLoggedIn = false;
    await device.save();
  }

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User Logged Out"));
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  const user = req.user;
  if (!user) {
    throw new ApiError(401, "User not found");
  }
  if (currentPassword === newPassword) {
    throw new ApiError(
      400,
      "New Password should not be same as Current Password"
    );
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Confirm Password should be same as New Password");
  }



  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Password updated successfully", user));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken = req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Invalid Token");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      secret.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(404, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    //Generate a new Access Token and update the refresh token of the user
    const option = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(200, "Access Token refreshed Successfully", {
          accessToken,
          refreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Token");
  }
});

const saveDeviceDetails = asyncHandler(async (req, res) => {
  const { deviceToken, deviceType, deviceName, modelName } = req.body;
  const user = req.user;

  // save device details

  const deviceDetails = new DeviceDetails({
    userId: user.userId,
    deviceToken,
    deviceType,
    deviceName,
    deviceModel: modelName,
  });

  await deviceDetails.save();

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Device Details saved successfully", deviceDetails)
    );
});

export {
  register,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyOtp,
  resendOTP,
  logoutUser,
  changePassword,
  refreshAccessToken,
  saveDeviceDetails,
};
