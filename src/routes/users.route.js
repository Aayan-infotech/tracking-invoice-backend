import { Router } from "express";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getAllUsers,
  updateUserDetails,
  EnableDisable2FA,
  getProfile,
  updateProfile,
  getAllVerifiedUsers,
  getDashboard,
  securitySetting,
  getNotifications,
  updateNotification,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  updateProfileSchema,
  updateUserDetailsSchema,
  updateNotificationSchema,
} from "../validators/userValidator.js";

const router = Router();

router.get("/get-all-users", verifyJWT, getAllUsers);
router.put(
  "/update-user-detail/:userId",
  verifyJWT,
  upload.fields([
    {
      name: "profile_image",
      maxCount: 1,
    },
  ]),
  validateRequest(updateUserDetailsSchema),
  updateUserDetails
);
router.post("/enable-disable-2fa", verifyJWT, EnableDisable2FA);
router.get("/get-profile", verifyJWT, getProfile);
router.put(
  "/update-profile",
  verifyJWT,
  upload.fields([
    {
      name: "profile_image",
      maxCount: 1,
    },
  ]),
  validateRequest(updateProfileSchema),
  updateProfile
);
router.get('/all-verified-users',verifyJWT,getAllVerifiedUsers);
router.get('/dashboard',verifyJWT,getDashboard);
router.get('/security-setting',verifyJWT,securitySetting);
router.get('/get-notifications',verifyJWT,getNotifications);
router.put('/update-notification-status',verifyJWT,validateRequest(updateNotificationSchema),updateNotification);

export default router;
