import { useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import axios from "axios";

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [editNoteId, setEditNoteId] = useState(null);

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return unsubscribe;
  }, []);

  // Author 
  const signup = () => createUserWithEmailAndPassword(auth, email, password);
  const login = () => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  // Helper
  const getToken = async () => user && (await user.getIdToken());

  // Fetch notes
  const fetchNotes = async () => {
    const token = await getToken();
    const res = await axios.get("http://localhost:5000/api/notes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotes(res.data);
  };

  // Add new note
  const addNote = async () => {
    const token = await getToken();
    const res = await axios.post("http://localhost:5000/api/notes", newNote, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotes([...notes, res.data]);
    setNewNote({ title: "", content: "" });
  };

  // Delete
  const deleteNote = async (id) => {
    const token = await getToken();
    await axios.delete(`http://localhost:5000/api/notes/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotes(notes.filter((n) => n._id !== id));
  };

  // Edit
  const startEditing = (note) => {
    setEditNoteId(note._id);
    setNewNote({ title: note.title, content: note.content });
  };

  const updateNote = async () => {
    const token = await getToken();
    const res = await axios.put(
      `http://localhost:5000/api/notes/${editNoteId}`,
      newNote,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setNotes(notes.map((n) => (n._id === editNoteId ? res.data : n)));
    setEditNoteId(null);
    setNewNote({ title: "", content: "" });
  };

  return (
    <div style={{ textAlign: "center", marginTop: 60 }}>
      {!user ? (
        <>
          <h2>Firebase Auth + MongoDB CRUD</h2>
          <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <input
            placeholder="Password"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <br /><br />
          <button onClick={signup}>Signup</button>
          <button onClick={login}>Login</button>
        </>
      ) : (
        <>
          <h3>Welcome {user.email}</h3>
          <button onClick={logout}>Logout</button>
          <br /><br />

          <h2>{editNoteId ? "✏️ Edit Note" : "Add Note"}</h2>
          <input
            placeholder="Title"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
          />
          <input
            placeholder="Content"
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
          />
          <button onClick={editNoteId ? updateNote : addNote}>
            {editNoteId ? "Update" : "Add"}
          </button>
          <button onClick={fetchNotes}>Fetch Notes</button>

          <ul style={{ marginTop: 20, listStyle: "none" }}>
            {notes.map((n) => (
              <li key={n._id}>
                <b>{n.title}</b>: {n.content}{" "}
                <button onClick={() => startEditing(n)}>✏️</button>
                <button onClick={() => deleteNote(n._id)}>❌</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
