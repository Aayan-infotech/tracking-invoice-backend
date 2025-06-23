import mongoose from "mongoose";

const projectInvoiceSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: String, ref: "User", required: true },
    invoiceUrl: { type: String, required: true },
}, {
    timestamps: true,
    versionKey: false
});

const ProjectInvoice = mongoose.model("ProjectInvoice", projectInvoiceSchema);
export default ProjectInvoice;
