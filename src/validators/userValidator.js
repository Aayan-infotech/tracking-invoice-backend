import Joi from "joi";

const userValidationSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .pattern(/^[^\W_][\w.-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .required()
    .messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email is required.",
      "string.email": "Email must be valid.",
      "string.pattern.base":
        "Email format is invalid. It should not start with special characters.",
      "any.required": "Email is required.",
    }),
});

const loginValidationSchema = Joi.object({
  username: Joi.string().trim().required().messages({
    "string.base": "Username must be a string.",
    "string.empty": "Username is required.",
    "any.required": "Username is required.",
  }),
  password: Joi.string().min(8).max(128).required().messages({
    "string.base": "Password must be a string.",
    "string.empty": "Password is required.",
    "string.min": "Password must be at least 8 characters.",
    "string.max": "Password cannot exceed 128 characters.",
    "any.required": "Password is required.",
  }),
});

const setPasswordValidationSchema = Joi.object({
  email: Joi.string().email().optional().messages({
    "string.base": "Email must be a string.",
    "string.email": "Email must be valid.",
  }),
  // password: Joi.string().min(6).max(15).required().messages({
  //   "string.base": "Password must be a string.",
  //   "string.empty": "Password is required.",
  //   "string.min": "Password must be at least 6 characters.",
  //   "string.max": "Password cannot exceed 15 characters.",
  //   "any.required": "Password is required.",
  // }),
  // confirm_password: Joi.string()
  //   .valid(Joi.ref("password"))
  //   .required()
  //   .messages({
  //     "string.base": "Password must be a string.",
  //     "string.empty": "Confirm Password is required.",
  //     "any.only": "Password and Confirm Password should be same.",
  //     "any.required": "Confirm Password is required.",
  //   }),
  password: Joi.string()
    .min(8)
    .max(15)
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,15}$"
      )
    )
    .required()
    .messages({
      "string.base": "Password must be a string.",
      "string.empty": "Password is required.",
      "string.min": "Password must be at least 8 characters.",
      "string.max": "Password cannot exceed 15 characters.",
      "string.pattern.base":
        "Password must include at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&#).",
      "any.required": "Password is required.",
    }),
  confirm_password: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "string.base": "Password must be a string.",
      "string.empty": "Confirm Password is required.",
      "any.only": "Password and Confirm Password should be same.",
      "any.required": "Confirm Password is required.",
    }),
});

const userValidationSchemaOTP = Joi.object({
  email: Joi.string().email().required().messages({
    "string.base": "Email must be a string.",
    "string.email": "Email must be valid.",
    "any.required": "Email is required.",
  }),
  otp: Joi.string().optional().allow("").messages({
    "string.base": "OTP must be a string.",
  }),
  type: Joi.string().valid("register", null).optional().messages({
    "string.base": "Type must be a string.",
    "any.only": 'Type must be either "register" or null.',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(6).max(128).required().messages({
    "string.base": "Old Password must be a string.",
    "string.empty": "Old Password is required.",
    "string.min": "Old Password must be at least 6 characters.",
    "string.max": "Old Password cannot exceed 128 characters.",
    "any.required": "Old Password is required.",
  }),
  newPassword: Joi.string()
    .min(8)
    .max(15)
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,15}$"
      )
    )
    .required()
    .messages({
      "string.base": "Password must be a string.",
      "string.empty": "Password is required.",
      "string.min": "Password must be at least 8 characters.",
      "string.max": "Password cannot exceed 15 characters.",
      "string.pattern.base":
        "Password must include at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&#).",
      "any.required": "Password is required.",
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "string.base": "Password must be a string.",
      "string.empty": "Confirm Password is required.",
      "any.only": "Password and Confirm Password should be same.",
      "any.required": "Confirm Password is required.",
    }),
});

const wordLimit = (min, max) => {
  return (value, helpers) => {
    const wordCount = value.trim().split(/\s+/).length;
    if (wordCount < min) {
      return helpers.message(`Bio must have at least ${min} words.`);
    }
    if (wordCount > max) {
      return helpers.message(`Bio must not exceed ${max} words.`);
    }
    return value;
  };
};

const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim().messages({
    "string.min": "Name should have at least 3 characters",
    "string.max": "Name should not exceed 50 characters",
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .pattern(/^[^\W_][\w.-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email cannot be empty.",
      "string.email": "Email must be valid.",
      "string.pattern.base":
        "Email format is invalid. It should not start with special characters.",
    }),
    mobile: Joi.string()
    .pattern(/^\d{10}$/)
    .allow("")
    .messages({
      "string.base": "Mobile number must be a string.",
      "string.empty": "Mobile number cannot be empty.",
      "string.pattern.base": "Mobile number must be a valid 10-digit number.",
    }),
  address: Joi.string().max(255).trim().allow("").messages({
    "string.base": "Address must be a string.",
    "string.empty": "Address cannot be empty.",
    "string.max": "Address cannot exceed 255 characters.",
  }),
});

const saveDeviceDetailsSchema = Joi.object({
  deviceToken: Joi.string().required().messages({
    "string.base": "Device Token must be a string.",
    "string.empty": "Device Token is required.",
    "any.required": "Device Token is required.",
  }),
  deviceName: Joi.string().required().messages({
    "string.base": "Device Name must be a string.",
    "string.empty": "Device Name is required.",
    "any.required": "Device Name is required.",
  }),
  modelName: Joi.string().required().messages({
    "string.base": "Device Model must be a string.",
    "string.empty": "Device Model is required.",
    "any.required": "Device Model is required.",
  }),
  deviceType: Joi.string().valid("android", "iOS").required().messages({
    "string.base": "Device Type must be a string.",
    "any.only": "Device Type must be either 'android' or 'iOS'.",
    "any.required": "Device Type is required.",
  }),
});


const updateUserDetailsSchema = Joi.object({
  username: Joi.string().trim().required().lowercase().messages({
    "string.base": "Username must be a string.",
    "string.empty": "Username is required.",
    "any.required": "Username is required.",
  }),
  name: Joi.string().trim().allow("").messages({
    "string.base": "Name must be a string.",
    "string.empty": "Name cannot be empty.",
    "any.required": "Name is required.",
  }),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .pattern(/^[^\W_][\w.-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email cannot be empty.",
      "string.email": "Email must be valid.",
      "string.pattern.base":
        "Email format is invalid. It should not start with special characters.",
      "any.required": "Email is required.",
    }),
  password: Joi.string()
    .min(8)
    .max(15)
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,15}$"
      )
    )
    .required()
    .messages({
      "string.base": "Password must be a string.",
      "string.empty": "Password cannot be empty.",
      "string.min": "Password must be at least 8 characters.",
      "string.max": "Password cannot exceed 15 characters.",
      "string.pattern.base":
        "Password must include at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&#).",
    }),

  mobile: Joi.string()
    .trim()
    .pattern(/^\d{10}$/)
    .allow("")
    .messages({
      "string.base": "Mobile number must be a string.",
      "string.empty": "Mobile number cannot be empty.",
      "string.pattern.base": "Mobile number must be a valid 10-digit number.",
      "any.required": "Mobile number is required.",
    }),

  address: Joi.string().trim().max(255).allow("").messages({
    "string.base": "Address must be a string.",
    "string.empty": "Address cannot be empty.",
    "string.max": "Address cannot exceed 255 characters.",
    "any.required": "Address is required.",
  }),
  profile_image: Joi.string().trim().allow("").messages({
    "string.base": "Profile image must be a string.",
    "string.empty": "Profile image cannot be empty.",
    "any.required": "Profile image is required.",
  }),
});

export {
  userValidationSchema,
  loginValidationSchema,
  setPasswordValidationSchema,
  userValidationSchemaOTP,
  updateProfileSchema,
  changePasswordSchema,
  saveDeviceDetailsSchema,
  updateUserDetailsSchema,
};
