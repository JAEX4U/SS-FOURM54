import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
    doc,
    updateDoc,
    increment,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.query = query;
window.orderBy = orderBy;
window.serverTimestamp = serverTimestamp;
window.doc = doc;
window.updateDoc = updateDoc;
window.increment = increment;
window.onSnapshot = onSnapshot;