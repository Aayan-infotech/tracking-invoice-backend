import mongoose from "mongoose";

const qualityAssuranceSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    documentName:{
        type: String,
        required: true,
        minlength: 3,
        maxlength: 100
    },
    typeOfDocument: {
        type: String,
        required: false,
        enum: ['file', 'text']
    },
    documentFile: {
        type: String,
        required: false
    },
    documentHtml: {
        type: String,
        required: false
    },
    status: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
    versionKey: false
});

const QualityAssurance = mongoose.model("QualityAssurance", qualityAssuranceSchema);
export default QualityAssurance;