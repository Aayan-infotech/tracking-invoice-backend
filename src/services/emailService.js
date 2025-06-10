import nodemailer from "nodemailer";
import {loadConfig} from "../config/loadConfig.js";
const config = await loadConfig();

const transporter = nodemailer.createTransport({
    // host: "sandbox.smtp.mailtrap.io",
    service: "gmail",
    port: 2525,
    auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
    },
});


export const sendEmail = async (to, subject, html) => {
    try{
        await transporter.sendMail({
            from: `"Tracking " <${config.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        return { success: true };
    }catch(err){
        console.error("Error sending email:", err);
        return { success: false, message: "Failed to send email" };
    }
    
};
