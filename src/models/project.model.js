import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    projectName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 500,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: false,
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'on hold', 'cancelled'],
        default: 'active',
    },
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
