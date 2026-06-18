console.log("loans.js loaded");
//import firbase.js

import {db} from './firebase.js'
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
getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

  



// Function to fetch and update the amounts
async function loadLoans() {
    try {
        console.log("loadLoans started");

        const bridgeSnap = await getDoc(
            doc(db, "Loans", "Bridge")
        );
        console.log("bridge loaded");

        const fulizaSnap = await getDoc(
            doc(db, "Loans", "Fuliza")
        );
        console.log("fuliza loaded");

        let bridgeBalance = 0;
        let fulizaBalance = 0;

        if (bridgeSnap.exists()) {
            bridgeBalance = bridgeSnap.data().Amount || 0;
        }

        if (fulizaSnap.exists()) {
            fulizaBalance = fulizaSnap.data().LoanAmount || 0;
        }

        console.log("balances calculated");

        const totalLoan = bridgeBalance + fulizaBalance;
        document.getElementById("loan-balance").textContent =
            `Ksh ${totalLoan.toLocaleString()}`;

        console.log("loan balance displayed");

        const loansRef = collection(db, "Loans");
        const querySnapshot = await getDocs(loansRef);

        console.log("collection query completed");

        document.getElementById("loan-number").textContent =
            querySnapshot.size;

    } catch (error) {
        console.error("loadLoans failed:", error);
    }
}

loadLoans();