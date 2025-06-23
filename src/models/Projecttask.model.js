import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
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
    taskQuantity: {
        type: Number,
        required: true,
        min: 1
    },
    taskCompletedQuantity: {
        type: Number,
        required: true,
        min: 1
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
        required: false,
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

const ProjectTask = mongoose.model('ProjectTask', taskSchema);
export default ProjectTask;
