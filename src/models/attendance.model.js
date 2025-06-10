import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: "User"
    },
    clockInTime: {
        type: Date,
        required: true,
    },
    clockOutTime: {
        type: Date,
        required: false,
    },
    latitude: {
        type: String,
        required: true,
    },
    longitude: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false
});
const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;