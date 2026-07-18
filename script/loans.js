
import { toTimestamp } from "./helper.js";

import { db } from './firebase.js'
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


// get elements
const addLoanBtn = document.getElementById("addLoanButton");
const payLoanBtn = document.getElementById("payLoanButton");

payLoanBtn.addEventListener('click', async (e) => {
    console.log('button clicked');
    e.preventDefault();
    
    let payment = getPaymentFormValues();
    console.log(payment);
    
    
    if(payment.loanName === "bridge"){
        try {
            await runTransaction(db, async (transaction) => {
                const loanRef = doc(db, "Loans", "Bridge");
                const bridgeSnap = await transaction.get(loanRef);
                
                
                if (!bridgeSnap.exists()) {
                    throw new Error("Loan does not exist!");
                    clearPaymentFields();
                }
                const bridgeLoanData = bridgeSnap.data();
                const bridgeBalance = bridgeLoanData.loanBalance || 0;
                
                if(payment.paymentAccount === "fuliza"){
                    const fulizaRef = doc(db, "Loans", "Fuliza");
                    const fulizaSnap = await transaction.get(fulizaRef);
                    if (!fulizaSnap.exists()) {
                        throw new Error("Fuliza loan does not exist!");
                    } 
                    const fulizaData = fulizaSnap.data();
                    let fulizaLimit = fulizaData.loanLimit || 0;
                    let fulizaBalance = fulizaData.loanBalance || 0; 
                    let availableFulizaLimit = fulizaLimit - fulizaBalance;

                    if(payment.paymentAmount > availableFulizaLimit){
                        throw new Error("Payment amount exceeds available Fuliza limit!");
                    }
                    const newFulizaBalance = fulizaBalance + payment.paymentAmount;
                    transaction.update(fulizaRef, { loanBalance: newFulizaBalance });
                }    
                
                const newBridgebalance = bridgeBalance - payment.paymentAmount;

                
                transaction.update(loanRef, { loanBalance: newBridgebalance });
                alert("Bridge loan payment successful");
                clearPaymentFields();
            });
        } catch (error) {
            console.error("Error paying loan:", error);
            
            alert("Transaction failed: " + error.message);
            clearPaymentFields();
        }
    }
    else if(payment.loanName === "fuliza"){
        try{
            await runTransaction(db, async (transaction) => {
                const loanRef = doc(db, "Loans", payment.loanName);
                const loanSnap = await transaction.get(loanRef);
                if (!loanSnap.exists()) {
                    throw new Error("Loan does not exist!");
                }
                const currentBalance = loanSnap.data().loanBalance || 0;
                const newBalance = currentBalance - payment.paymentAmount;
                transaction.update(loanRef, { loanBalance: newBalance });

                alert("Fuliza loan payment successful");
                clearPaymentFields();
            });
        }catch(error){
            console.error("Error paying loan:", error);
            alert("Transaction failed: " + error.message);
            clearPaymentFields();
        }
    }
});


addLoanBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    if(loanName ==="Bridge"){
        const loan = getLoanFormValues();
        try{
            // add bridge loan to db
            await runTransaction(db, async (transaction) => {
                const loanRef = doc(db, "Loans", loan.loanName);
                const loanSnap = await transaction.get(loanRef);

                transaction.set(loanRef, loan, { merge: true });
            });

            alert("Bridge loan added successfully");
            clearAddLoanFields();

        }catch(error){
            console.error("Error adding loan:", error);
            clearAddLoanFields();
        }
    }

    else if(loanName ==="Fuliza"){
        const loan = getLoanFormValues();
        try{
            // add fuliza loan to db
            await runTransaction(db, async (transaction) => {
                const loanRef = doc(db, "Loans", loan.loanName);
                const loanSnap = await transaction.get(loanRef);
                transaction.set(loanRef, loan, { merge: true });
            });

            alert("Fuliza loan added successfully");
            clearAddLoanFields();   
        }catch(error){  
            console.error("Error adding loan:", error);
            clearAddLoanFields();
        }
    }
});

const loansRef = collection(db, "Loans");

onSnapshot(loansRef, (querySnapshot) => {

    console.log("Loans updated");

    let bridgeBalance = 0;
    let fulizaBalance = 0;
    let bridgeData = null;

    document.getElementById("loan-number").textContent = querySnapshot.size;

    querySnapshot.forEach((document) => {

        const data = document.data();

        if (document.id === "Bridge") {
            bridgeData = data;
            bridgeBalance = Number(data.loanBalance) || 0;
        }

        if (document.id === "Fuliza") {
            fulizaBalance = Number(data.LoanAmount) || 0;
        }

    });

    const totalLoan = bridgeBalance + fulizaBalance;

    document.getElementById("loan-balance").textContent =
        `Ksh ${totalLoan.toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    // Calculate Bridge interest whenever the document changes
    if (bridgeData) {
        calculateInterest(bridgeData);
    }

}, (error) => {

    console.error("Loan listener failed:", error);

});

// Accept the data as a parameter
async function calculateInterest(bridgeData) {
    console.log("Bridge data received:", bridgeData);

    const principal = bridgeData.loanAmount || 0;
    const dateTaken = bridgeData.dateTaken;
    const dueDate = bridgeData.dueDate;
    const lastInterestDate = bridgeData.lastInterestDate;
    const dailyInterest = bridgeData.interestRate || 0; 
    const loanBalance = bridgeData.loanBalance || 0;

    // Today's date (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Last interest date (midnight)
    const lastDate = lastInterestDate.toDate();
    lastDate.setHours(0, 0, 0, 0);

    // Days passed
    const daysPassed = Math.floor(
        (today - lastDate) / (1000 * 60 * 60 * 24)
    );

    console.log("Days passed:", daysPassed);

    if (daysPassed <= 0) {
        console.log("No interest accrued yet.");
        return loanBalance;
    }

    // Interest to add
    const interestCharged = parseFloat(
        (daysPassed * dailyInterest).toFixed(2)
    );

    // Updated balance
    const newBalance = parseFloat(
        (loanBalance + interestCharged).toFixed(2)
    );

    console.log("Interest charged:", interestCharged);
    console.log("New balance:", newBalance);

    const loanRef = doc(db, "Loans", "Bridge");

    try {
        await runTransaction(db, async (transaction) => {
            const loanSnap = await transaction.get(loanRef);

            if (!loanSnap.exists()) {
                throw new Error("Loan does not exist!");
            }

            transaction.update(loanRef, {
                loanBalance: newBalance,
                lastInterestDate: toTimestamp(today)
            });
        });

        console.log("Loan balance updated successfully.");

        // Update the object in memory so the UI has the latest value
        bridgeData.loanBalance = newBalance;
        bridgeData.lastInterestDate = today;

    } catch (error) {
        console.error("Error updating loan balance:", error);
    }

    console.log("Principal:", principal);
    console.log("Date taken:", dateTaken);
    console.log("Due date:", dueDate);

    return newBalance;
}

async function calculateFulizaLoan(fulizaData){
    console.log("Fuliza data received:", fulizaData);
    const fulizaLoan = fulizaData.LoanAmount || 0;
    let loanAmount = 0;
    let accessFee = 0;

    if(loanAmount<=100){
        accessFee = 0.01*loanAmount;
        loanAmount += accessFee;
        maintenanceFee = 0;



    }
}

function clearAddLoanFields() {
    

    const loanName = document.getElementById("addLoanName").value = "";
    const loanAmount = document.getElementById("loanAmount").value = "";
    const loanBalance = document.getElementById("loanBalance").value = "";
    const dueDate = document.getElementById("dueDate").value = "";
    const dateTaken = document.getElementById("dateTaken").value = "";
    const lastInterestDate = document.getElementById("lastInterestDate").value = "";
    const interestRate = document.getElementById("interest").value = "";
    const loanLimit = document.getElementById("loanLimit").value = "";
}

function clearPaymentFields() {
    const loanName = document.getElementById("loanName").value = "";
    const paymentAmount = document.getElementById("paymentAmount").value = "";
    const paymentDate = document.getElementById("paymentDate").value = "";
    const paymentAccount = document.getElementById("paymentAccount").value = "";
}

function getLoanFormValues() {
    return {
        loanName: document.getElementById("addLoanName").value,
        loanBalance: Number(document.getElementById("loanBalance").value),
        loanAmount : (document.getElementById("loanAmount").value),
        dueDate: new Date(document.getElementById("dueDate").value),
        dateTaken: new Date(document.getElementById("dateTaken").value),
        lastInterestDate: new Date(document.getElementById("lastInterestDate").value),
        interestRate: Number(document.getElementById("interest").value),
        loanLimit: Number(document.getElementById("loanLimit").value)
    };
}

function getPaymentFormValues() {
    return {
        loanName: document.getElementById("loanName").value,
        paymentAmount: Number(document.getElementById("paymentAmount").value),
        paymentDate: new Date(document.getElementById("paymentDate").value),
        paymentAccount: document.getElementById("paymentAccount").value
    };
}

// Call the entry function
loadLoans();
// calculateInterest(bridgeData);
// displayLoanDetails(bridgeData, fulizaData);
