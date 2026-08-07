const firebaseConfig = {
  apiKey: "AIzaSyB9piq4AQbrFbDIVkEEoL_FEbAu-lqf_e4",
  authDomain: "documentos-aea.firebaseapp.com",
  projectId: "documentos-aea",
  storageBucket: "documentos-aea.firebasestorage.app",
  messagingSenderId: "858263251706",
  appId: "1:858263251706:web:5e589129044d257ea03743",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
