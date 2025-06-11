import mongoose from "mongoose";

const taskUpdateHistorySchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    updateDescription: {
        type: String,
        required: true,
        maxlength: 1000
    },
    status:{
        type: String,
        enum: ['pending', 'in progress', 'completed'],
        default: 'pending'
    },
    updatePhotos: [{
        type: String,
        required: false
    }],
    updateDocuments: [{
        type: String,
        required: false
    }],
    updatedBy: {
        type: String,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});
export default mongoose.model("TaskUpdateHistory", taskUpdateHistorySchema);