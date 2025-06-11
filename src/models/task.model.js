import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    taskName: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'in progress', 'completed'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    taskUpdateDescription: {
        type: String,
        required: false,
        maxlength: 1000
    },
    taskUpdatePhotos: [{
        type: String,
        required: false
    }],
    taskUpdateDocuments: [{
        type: String,
        required: false
    }],
    updateBy: {
        type: String,
        required: true,
        ref: 'User'
    },
    invoiceUrl: {
        type: String,
        required: false
    },
}, {
    timestamps: true,
    versionKey: false
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
