import {db} from './firebase.js'
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
import {
collection,
getDocs,
doc,
addDoc,
setDoc,
runTransaction,
persistentLocalCache,
persistentMultipleTabManager,
initializeFirestore,
getDoc,
onSnapshot
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";


// Get the element to manipulate
const fulizaAmount = document.querySelector('.fuliza-amount');
const bridgeAmount = document.querySelector('.bridge-amount');

const fulizaDueDate = document.querySelector('.fuliza-due-date');
const bridgeDueDate = document.querySelector('.bridge-due-date');



const username = document.querySelector(".username");
const user = document.querySelector(".user");

onSnapshot(doc(db, "Users", "users"), (usersSnap) => {

    if (!usersSnap.exists()) {
        console.log("User document does not exist.");
        return;
    }

    const data = usersSnap.data();

    username.textContent = `Welcome ${data.firstName}`;
    user.textContent = `Hello ${data.firstName}`;

}, (error) => {
    console.error("Failed to load user:", error);
});



// Function to fetch and update the amounts
const loansRef = collection(db, "Loans");

onSnapshot(loansRef, (snapshot) => {

    let finalBridgeAmount = 0;
    let finalFulizaAmount = 0;

    snapshot.forEach((document) => {

        const data = document.data();

        if (document.id === "Bridge") {

            finalBridgeAmount = Number(data.loanBalance) || 0;

            bridgeAmount.textContent =
                `KES ${finalBridgeAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;

            bridgeDueDate.textContent =
                `Due: ${data.dueDate.toDate().toLocaleDateString()}`;
        }

        else if (document.id === "Fuliza") {

            finalFulizaAmount = Number(data.loanBalance) || 0;

            fulizaAmount.textContent =
                `KES ${finalFulizaAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;

            fulizaDueDate.textContent =
                `Due: ${data.dueDate.toDate().toLocaleDateString()}`;
        }

    });

    // Update dashboard total
    const totalLoanBalanceEl = document.getElementById("loan-balance");

    if (totalLoanBalanceEl) {

        const totalLoan = finalBridgeAmount + finalFulizaAmount;

        totalLoanBalanceEl.textContent =
            `Ksh ${totalLoan.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
    }

}, (error) => {

    console.error("Loan listener failed:", error);

});

// function to load balance from accounts collection

const monthlyIncomeDisplay = document.querySelector('.monthly-income-amount');
const incomeDisplay = document.getElementById('income-display');
const savingsDisplay = document.getElementById('savings-display');

// Listen for Cash account
onSnapshot(doc(db, "Accounts", "cash"), (cashSnap) => {

    if (!cashSnap.exists()) return;

    updateBalances();

});

// Listen for Mpesa account
onSnapshot(doc(db, "Accounts", "mpesa"), (mpesaSnap) => {

    if (!mpesaSnap.exists()) return;

    updateBalances();

});

// Listen for Savings account
onSnapshot(doc(db, "Accounts", "savings"), (savingsSnap) => {

    if (!savingsSnap.exists()) return;

    updateBalances();

});

onSnapshot(collection(db, "Accounts"), (snapshot) => {

    let cashBalance = 0;
    let mpesaBalance = 0;
    let savingsBalance = 0;

    snapshot.forEach((document) => {

        const data = document.data();

        switch (document.id) {

            case "cash":
                cashBalance = Number(data.cashBalance) || 0;
                break;

            case "mpesa":
                mpesaBalance = Number(data.mpesaBalance) || 0;
                break;

            case "savings":
                savingsBalance = Number(data.savingsBalance) || 0;
                break;
        }

    });

    const totalBalance = cashBalance + mpesaBalance;

    incomeDisplay.textContent =
        `Ksh. ${totalBalance.toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    savingsDisplay.textContent =
        `Ksh. ${savingsBalance.toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

}, (error) => {

    console.error("Failed to load balances:", error);

});
//retrieving expenses from db and displaying them in the preview section
const expensesDisplay = document.getElementById("expenses-display");

onSnapshot(collection(db, "Expenses"), (querySnapshot) => {

    let total = 0;

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        total += Number(data.amount) || 0;
    });

    expensesDisplay.textContent =
        `Ksh. ${total.toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

}, (error) => {
    console.error("Failed to load expenses:", error);
});