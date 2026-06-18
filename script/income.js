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

const addIncomeBtn = document.getElementById('add-income-btn');

addIncomeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    // Get element values

    
    const cashAmount = Number(document.getElementById('cash-amount').value) || 0;
    const mpesaAmount = Number(document.getElementById('mpesa-amount').value) || 0;
    const addedDate = document.getElementById('income-date').value; // e.g., "2026-06-18"
    const messageDisplay = document.querySelector('.message-display');


    // Reading documents from db
    const cashDocRef = doc(db, "Income", "cash");
    const mpesaDocRef = doc(db, "Income", "mpesa");
    const accountsCashRef = doc(db, "Accounts", "cash");
    const accountsMpesaRef = doc(db, "Accounts", "mpesa");
    const newTransactionRef = doc(collection(db, "Transactions"));

    try {
    await runTransaction(db, async (transaction) => {
        
        const cashSnapshot = await transaction.get(cashDocRef);
        const mpesaSnapshot = await transaction.get(mpesaDocRef);
        const accountsCashSnapshot = await transaction.get(accountsCashRef);
        const accountsMpesaSnapshot = await transaction.get(accountsMpesaRef);



        if (!cashSnapshot.exists() || !mpesaSnapshot.exists()) {
        throw new Error("Income tracking documents do not exist in DB!");
        }
        if (!accountsCashSnapshot.exists() || !accountsMpesaSnapshot.exists()) {
        throw new Error("Account documents do not exist in DB!");
        }

        
        const cashData = cashSnapshot.data();
        const mpesaData = mpesaSnapshot.data();
        const accountsCashData = accountsCashSnapshot.data();
        const accountsMpesaData = accountsMpesaSnapshot.data();


        const currentCashBalance = Number(cashData.cashBalance) || 0;
        const currentMpesaBalance = Number(mpesaData.mpesaBalance) || 0;
        const currentAccountsCashBalance = Number(accountsCashData.cashBalance) || 0;
        const currentAccountsMpesaBalance = Number(accountsMpesaData.mpesaBalance) || 0;
        
    
        const oldDbDate = cashData.addedAt ? cashData.addedAt.toDate() : null;

    
        const newCashBalance = currentCashBalance + cashAmount;
        const newMpesaBalance = currentMpesaBalance + mpesaAmount;
        const newAccountsCashBalance = currentAccountsCashBalance + cashAmount;
        const newAccountsMpesaBalance = currentAccountsMpesaBalance + mpesaAmount;



        const dateObject = addedDate ? new Date(addedDate) : new Date();
        const firestoreTimestamp = Timestamp.fromDate(dateObject);

        transaction.update(cashDocRef, {
        cashBalance: newCashBalance,
        addedAt: firestoreTimestamp
        });

        transaction.update(mpesaDocRef, {
        mpesaBalance: newMpesaBalance,
        addedAt: firestoreTimestamp
        });

        transaction.update(accountsCashRef, {
        cashBalance: newAccountsCashBalance,
        addedAt: firestoreTimestamp
        });
        
        transaction.update(accountsMpesaRef, {
        mpesaBalance: newAccountsMpesaBalance,
        addedAt: firestoreTimestamp
        });


        transaction.set(newTransactionRef, {
        cashAdded: cashAmount,
        mpesaAdded: mpesaAmount,
        addedAt: firestoreTimestamp,
        status: "completed"
        });
    });
    
    messageDisplay.style.color = "green";
    messageDisplay.textContent = "Balances successfully updated!";
    clearForm();
    } catch (error) {
    console.error("Transaction failed: ", error);
    messaggeDisplay.style.color = "red";
    messageDisplay.textContent = "Failed to update balances.";
    clearForm();
    }



});

function clearForm(){
    document.getElementById('cash-amount').value = '';
    document.getElementById('mpesa-amount').value = '';
    const addedDate = document.getElementById('income-date').value = '';
    // const messageDisplay = document.querySelector('.message-display').textContent = '';

}

// function to load balance from accounts collection

const loadBalance = async () => {

    const monthlyIncomeDisplay = document.querySelector('.monthly-income-amount')
    const incomeDisplay = document.getElementById('income-display');



    const accountsCashRef = doc(db, "Accounts", "cash");
    const accountsMpesaRef = doc(db, "Accounts", "mpesa");

    const accountsCashSnapshot = await getDoc(accountsCashRef);
    const accountsMpesaSnapshot = await getDoc(accountsMpesaRef);

    if(!accountsCashSnapshot.exists() || !accountsMpesaSnapshot.exists()){
        throw new Error("Account documents do not exist in DB!");
    
    }

    const accountsCashBalance = accountsCashSnapshot.data().cashBalance;
    const accountsMpesaBalance = accountsMpesaSnapshot.data().mpesaBalance;

    const totalBalance = accountsCashBalance + accountsMpesaBalance;

    monthlyIncomeDisplay.textContent = `Ksh. ${totalBalance}`





}

loadBalance();




