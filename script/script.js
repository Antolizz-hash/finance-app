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
  getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCnfimw2OR91gMo3zJUy3yy1LfSzRm1Ymw",
    authDomain: "financial-app-c9c7d.firebaseapp.com",
    projectId: "financial-app-c9c7d",
    storageBucket: "financial-app-c9c7d.firebasestorage.app",
    messagingSenderId: "724077414183",
    appId: "1:724077414183:web:14369f03248ec61d000b02",
    measurementId: "G-674KQ28Q6B"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = getFirestore(app);


// Get the element to manipulate
const fulizaAmount = document.querySelector('.fuliza-amount');
const bridgeAmount = document.querySelector('.bridge-amount');
const username = document.querySelector('.username');
const user = document.querySelector('.user');

const fulizaDueDate = document.querySelector('.fuliza-due-date');
const bridgeDueDate = document.querySelector('.bridge-due-date');

// Function to fetch and update the amounts
async function loadLoans() {

    const bridgeSnap = await getDoc(
        doc(db, "Loans", "Bridge")
    );

    const fulizaSnap = await getDoc(
        doc(db, "Loans", "Fuliza")
    );
    

    if (bridgeSnap.exists()) {
        bridgeAmount.textContent =
            `KES ${bridgeSnap.data().Amount}`;
        bridgeDueDate.textContent =
            `Due: ${bridgeSnap.data().dueDate.toDate().toLocaleDateString()}`;
    }


    if (fulizaSnap.exists()) {
        fulizaAmount.textContent =
            `KES ${fulizaSnap.data().Amount}`;
        fulizaDueDate.textContent =
            `Due: ${fulizaSnap.data().dueDate.toDate().toLocaleDateString()}`;
               
    }
}

// get username
async function loadUsers() {
    const usersSnap = await getDoc(doc(db, "Users", "users"));
    if (usersSnap.exists()) {
        username.textContent = `Welcome ${usersSnap.data().firstName}`;
        user.textContent = `Hello ${usersSnap.data().firstName}`;
    }
    
}

// saving data to db


loadUsers();
loadLoans();

// ********************************** expenses page script *****************************************************

const addExpenseBtn = document.getElementById('submitBtn');
addExpenseBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const description = document.querySelector('.description').value;
    const amount = document.querySelector('#expense-amount').value;
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('category').value;

    console.log({ description, amount, date, category });

    try {
        await addDoc(collection(db, "Expenses"), {
        description,
        amount,
        date,
        category
    });

        alert("Expense added successfully!");
        document.querySelector('.description').value = '';
        document.querySelector('#expense-amount').value = '';
        document.getElementById('expense-date').value = '';
        document.getElementById('category').value = '';
    } catch (error) {
        console.error("Error adding expense:", error);
        alert("Failed to add expense. Please try again.");
    }
});

//retrieving expenses from db and displaying them in the preview section
async function loadTotalExpenses() {
    let total = 0;

    const querySnapshot = await getDocs(collection(db, "Expenses"));

    querySnapshot.forEach((doc) => {
        const data = doc.data();

        total += Number(data.amount) || 0;
    });

    const totalExpenses = document.getElementById("total-expenses");
    totalExpenses.textContent = `Ksh ${total.toLocaleString()}`;

    totalExpenses.style.fontSize = "24px";
     totalExpenses.style.color = "blue";
     totalExpenses.style.fontWeight = "bold";
     totalExpenses.style.padding = "10px";


    // document.getElementById("total-expenses").textContent =
    //     `Ksh ${total.toLocaleString()}`;
}

loadTotalExpenses();