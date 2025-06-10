import mongoose from "mongoose";

const pageSchema = new mongoose.Schema({
    pageName: { type: String, required: true },
    pageUrl: { type: String, required: true },
    description: { type: String, required: true },
}, { timestamps: true });

const Page = mongoose.model("Page", pageSchema);

export default Page;
