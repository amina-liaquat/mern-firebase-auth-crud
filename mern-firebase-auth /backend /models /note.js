import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String },
  userId: { type: String, required: true } // Firebase UID
}, { timestamps: true });

export default mongoose.model("Note", noteSchema);
