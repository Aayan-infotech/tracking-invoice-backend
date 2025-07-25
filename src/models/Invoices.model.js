import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: function () {
            return this.invoiceType === 'task';
        }
    },
    userId: {
        type: String,
        ref: 'User',
        required: function () {
            return this.invoiceType === 'task';
        }
    },
    taskCompletedQuantity: {
        type: Number,
        required: function () {
            return this.invoiceType === 'task';
        },
        min: 1
    },
    invoiceUrl: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['unpaid', 'paid', 'draft'],
        default: 'unpaid'
    },
    InvoiceDate: {
        type: Date,
        required: true,
    },
    invoiceType: {
        type: String,
        enum: ['task', 'project'],
        required: true,
    }
}, {
    timestamps: true,
    versionKey: false
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;