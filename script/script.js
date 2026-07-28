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

// --- Goals Listener ---
const targetAmountEl   = document.querySelector('.target-amount');
const remainingAmountEl = document.querySelector('.remaining-amount');
const progressBarEl    = document.querySelector('.progress-bar');

onSnapshot(collection(db, "Goals"), (snapshot) => {
    let totalTarget   = 0;
    let totalCurrent  = 0;

    snapshot.forEach((document) => {
        const data = document.data();
        const target  = Number(data.targetAmount)  || 0;
        const current = Number(data.currentAmount) || 0;

        totalTarget  += target;
        totalCurrent += current;
    });

    const totalRemaining = Math.max(totalTarget - totalCurrent, 0);
    const percent        = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    // Update text
    if (targetAmountEl) {
        targetAmountEl.textContent =
            `ksh. ${totalTarget.toLocaleString("en-KE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
    }

    if (remainingAmountEl) {
        remainingAmountEl.textContent =
            `ksh. ${totalRemaining.toLocaleString("en-KE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
    }

    // Update progress bar
    if (progressBarEl) {
        // If your CSS expects an inner fill div, create it once
        let fill = progressBarEl.querySelector('.progress-fill');
        if (!fill) {
            fill = document.createElement('div');
            fill.className = 'progress-fill';
            fill.style.height = '100%';
            fill.style.background = '#4caf50'; // adjust to your theme
            fill.style.borderRadius = 'inherit';
            fill.style.transition = 'width 0.4s ease';
            progressBarEl.appendChild(fill);
        }
        fill.style.width = `${percent}%`;
    }

}, (error) => {
    console.error("Failed to load goals:", error);
});


document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menu-toogle");
    const navLinks = document.getElementById("nav-links");

    if (menuToggle && navLinks) {
        // Toggle on hamburger click
        menuToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            navLinks.classList.toggle("active");
        });

        // Close when clicking a link
        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("active");
            });
        });

        // Close when clicking outside
        document.addEventListener("click", (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove("active");
            }
        });
    }
});