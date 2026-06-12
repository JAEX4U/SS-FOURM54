import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, query, orderBy,
  serverTimestamp, doc, updateDoc, increment, onSnapshot, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBpMt95E1aiZDa6wyNp4VXFts5LADvWNHE",
  authDomain: "spin-c4f96.firebaseapp.com",
  projectId: "spin-c4f96",
  storageBucket: "spin-c4f96.firebasestorage.app",
  messagingSenderId: "705516153422",
  appId: "1:705516153422:web:dec1210da7b2510756b11f",
  measurementId: "G-7DER1HVKWB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.db = db;
window.auth = auth;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.getDoc = getDoc;
window.query = query;
window.orderBy = orderBy;
window.serverTimestamp = serverTimestamp;
window.doc = doc;
window.updateDoc = updateDoc;
window.increment = increment;
window.onSnapshot = onSnapshot;
window.deleteDoc = deleteDoc;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.sendEmailVerification = sendEmailVerification;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.firebaseReady = true;
window.dispatchEvent(new Event("firebase-ready"));
