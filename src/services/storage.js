import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase.js';

const LOCAL_KEY = 'driveMindNotes';
const COLLECTION = 'notes';

class FirebaseStorage {
  async getNotes() {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async saveNote(note) {
    const ref = await addDoc(collection(db, COLLECTION), {
      ...note,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, ...note };
  }

  async deleteNote(id) {
    await deleteDoc(doc(db, COLLECTION, id));
  }

  async updateNote(id, patch) {
    await updateDoc(doc(db, COLLECTION, id), patch);
  }
}

class LocalStorage {
  async getNotes() {
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async _writeAll(notes) {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(notes));
  }

  async saveNote(note) {
    const notes = await this.getNotes();
    const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const withId = { id, ...note };
    await this._writeAll([withId, ...notes]);
    return withId;
  }

  async deleteNote(id) {
    const notes = await this.getNotes();
    await this._writeAll(notes.filter((n) => n.id !== id));
  }

  async updateNote(id, patch) {
    const notes = await this.getNotes();
    await this._writeAll(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }
}

export const storage = isFirebaseConfigured ? new FirebaseStorage() : new LocalStorage();
export const storageBackend = isFirebaseConfigured ? 'firebase' : 'local';
