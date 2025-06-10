import mongoose from "mongoose";

const assignTaskSchema = new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: String, ref: "User", required: true },
}, {
    timestamps: true,
    versionKey: false
});

const AssignTask = mongoose.model("AssignTask", assignTaskSchema);
export default AssignTask;
