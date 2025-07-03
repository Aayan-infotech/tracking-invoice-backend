import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    taskName: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 100
    },
    amount: {
        type: Number,
        required: false,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active'
    },
    description: {
        type: String,
        required: false,
        maxlength: 500,
        default: null
    },
}, {
    timestamps: true,
    versionKey: false
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
