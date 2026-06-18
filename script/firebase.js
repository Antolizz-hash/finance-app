

// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
  import {
  collection,
  getDocs,
  getFirestore,
  doc,
  addDoc,
  setDoc,
  runTransaction,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  export const firebaseConfig = {
    apiKey: "AIzaSyCnfimw2OR91gMo3zJUy3yy1LfSzRm1Ymw",
    authDomain: "financial-app-c9c7d.firebaseapp.com",
    projectId: "financial-app-c9c7d",
    storageBucket: "financial-app-c9c7d.firebasestorage.app",
    messagingSenderId: "724077414183",
    appId: "1:724077414183:web:14369f03248ec61d000b02",
    measurementId: "G-674KQ28Q6B"
  };

  // Initialize Firebase
  export const app = initializeApp(firebaseConfig);
  export const analytics = getAnalytics(app);
  export const db = getFirestore(app);