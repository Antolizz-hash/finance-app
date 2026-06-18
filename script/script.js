import {db} from './firebase.js'
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


// Get the element to manipulate
const fulizaAmount = document.querySelector('.fuliza-amount');
const bridgeAmount = document.querySelector('.bridge-amount');

const fulizaDueDate = document.querySelector('.fuliza-due-date');
const bridgeDueDate = document.querySelector('.bridge-due-date');



  const username = document.querySelector('.username');
  const user = document.querySelector('.user');


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
            `KES ${fulizaSnap.data().LoanAmount}`;
        fulizaDueDate.textContent =
            `Due: ${fulizaSnap.data().dueDate.toDate().toLocaleDateString()}`;
               
    }
}

loadLoans();

// function to load balance from accounts collection

const loadBalance = async () => {

    const monthlyIncomeDisplay = document.querySelector('.monthly-income-amount')
    const incomeDisplay = document.getElementById('income-display');
    const savingsDisplay = document.getElementById('savings-display');
    



    const accountsCashRef = doc(db, "Accounts", "cash");
    const accountsMpesaRef = doc(db, "Accounts", "mpesa");
    const accountsSavingsRef = doc(db, "Accounts", "savings");

    const accountsCashSnapshot = await getDoc(accountsCashRef);
    const accountsMpesaSnapshot = await getDoc(accountsMpesaRef);
    const accountsSavingsSnapshot = await getDoc(accountsSavingsRef);


    if(!accountsCashSnapshot.exists() || !accountsMpesaSnapshot.exists()){
        throw new Error("Account documents do not exist in DB!");
    
    }
    if(!accountsSavingsSnapshot.exists()){
        throw new Error("Account documents do not exist in DB!");
    }

    const accountsSavingsBalance = accountsSavingsSnapshot.data().savingsBalance;
    const accountsCashBalance = accountsCashSnapshot.data().cashBalance;
    const accountsMpesaBalance = accountsMpesaSnapshot.data().mpesaBalance;

    const totalBalance = accountsCashBalance + accountsMpesaBalance;

    incomeDisplay.textContent = `Ksh. ${totalBalance}`
    savingsDisplay.textContent = `Ksh. ${accountsSavingsBalance}`

}

loadBalance();
