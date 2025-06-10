import { Router } from "express";
import {
  register,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyOtp,
  resendOTP,
  logoutUser,
  changePassword,
  refreshAccessToken,
  saveDeviceDetails,
} from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  loginValidationSchema,
  userValidationSchema,
  setPasswordValidationSchema,
  changePasswordSchema,
  saveDeviceDetailsSchema
} from "../validators/userValidator.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(validateRequest(userValidationSchema), register);
router.route("/login").post(validateRequest(loginValidationSchema), loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOTP);
router.post("/reset-password",validateRequest(setPasswordValidationSchema),resetPassword);
router.post("/logout",verifyJWT,logoutUser);
router.post("/change-password",verifyJWT,validateRequest(changePasswordSchema),changePassword);
router.post("/refresh-token",refreshAccessToken);
router.post('/save-device-details',verifyJWT,validateRequest(saveDeviceDetailsSchema),saveDeviceDetails);

export default router;
