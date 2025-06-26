import mongoose from "mongoose";

const documentTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    trim: true,
    required: true,
  },
  description: {
    type: String,
    required: false,
  }
},{
    timestamps: true,
    versionKey: false
});

const DocumentType = mongoose.model("DocumentType", documentTypeSchema);

export default DocumentType;
