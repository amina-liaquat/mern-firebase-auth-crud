import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import Note from "./models/Note.js";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

// Load environment variables first thing
dotenv.config();

const app = express();

// Basic middleware setup
app.use(cors());
app.use(express.json());

// Firebase Admin setup - took me a while to get this right!
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected successfully");
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });

// Token verification middleware - this handles Firebase auth
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Check if token exists
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }
  
  const token = authHeader.split(" ")[1]; // Extract Bearer token
  
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach user info to request
    next();
  } catch (error) {
    console.log("Token verification failed:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// API Routes for notes management

// Create a new note
app.post("/api/notes", verifyFirebaseToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    const newNote = await Note.create({
      title: title,
      content: content,
      userId: req.user.uid
    });
    
    res.status(201).json(newNote);
  } catch (err) {
    console.error("Error creating note:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get all notes for the authenticated user
app.get("/api/notes", verifyFirebaseToken, async (req, res) => {
  try {
    const userNotes = await Note.find({ userId: req.user.uid });
    res.json(userNotes);
  } catch (err) {
    console.error("Error fetching notes:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// Update an existing note
app.put("/api/notes/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    const updateData = req.body;
    
    const updatedNote = await Note.findOneAndUpdate(
      { _id: noteId, userId: req.user.uid }, // Make sure user owns the note
      updateData,
      { new: true } // Return the updated document
    );
    
    if (!updatedNote) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }
    
    res.json(updatedNote);
  } catch (err) {
    console.error("Error updating note:", err);
    res.status(400).json({ error: err.message });
  }
});

// Delete a note
app.delete("/api/notes/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    
    const deletedNote = await Note.findOneAndDelete({ 
      _id: noteId, 
      userId: req.user.uid 
    });
    
    if (!deletedNote) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }
    
    res.json({ message: "Note deleted successfully", deletedNote: deletedNote });
  } catch (err) {
    console.error("Error deleting note:", err);
    res.status(400).json({ error: err.message });
  }
});

// TODO: Add error handling middleware later
// TODO: Maybe add rate limiting for production

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});
