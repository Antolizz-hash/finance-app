//import firbase.js
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

  



// Function to fetch and update the amounts
async function loadLoans() {

    const bridgeSnap = await getDoc(
        doc(db, "Loans", "Bridge")
    );

    const fulizaSnap = await getDoc(
        doc(db, "Loans", "Fuliza")
    );
    

    const bridgeBalance = bridgeSnap.data().Amount
        const fulizaBalance = fulizaSnap.data().LoanAmount

    if (bridgeSnap.exists()) {
        
    }


    if (fulizaSnap.exists()) {
        
               
    }
    const totalLoan = fulizaBalance + bridgeBalance;
    const totalLoanElement = document.getElementById('loan-balance');
    totalLoanElement.textContent = `Ksh ${totalLoan.toLocaleString()}`;

    const numberOfLoans = document.getElementById('loan-number');

    const loansRef = collection(db, "Loans");
    const querySnapshot = await getDocs(loansRef);
    const loanCount = querySnapshot.size;
    numberOfLoans.textContent = loanCount;
    

}

loadLoans();