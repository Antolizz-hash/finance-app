import {db} from './firebase.js'
import { toTimestamp } from "./helper.js";
import {
collection,
getDocs,
doc,
addDoc,
setDoc,
runTransaction,
Timestamp,
getDoc,
onSnapshot,
persistentLocalCache,
persistentMultipleTabManager,
initializeFirestore,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const addIncomeBtn = document.getElementById('add-income-btn');

addIncomeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    // Getting elements from html
    const cashAmount = Number(document.getElementById('cash-amount').value) || 0;
    const mpesaAmount = Number(document.getElementById('mpesa-amount').value) || 0;
    const addedDate = document.getElementById('income-date').value;

    // geting document references
    const cashDocRef = doc(db, "Income", "cash");
    const mpesaDocRef = doc(db, "Income", "mpesa");
    const accountsCashRef = doc(db, "Accounts", "cash");
    const accountsMpesaRef = doc(db, "Accounts", "mpesa");
    const newTransactionRef = doc(collection(db, "Transactions"));
    

    const dateKey = addedDate || new Date().toISOString().split('T')[0];
    
    
    const todayCashDocRef = doc(db, "DailyIncome", `${dateKey}_cash`);
    const todayMpesaDocRef = doc(db, "DailyIncome", `${dateKey}_mpesa`);

    try {
        await runTransaction(db, async (transaction) => {
            
            const cashSnapshot = await transaction.get(cashDocRef);
            const mpesaSnapshot = await transaction.get(mpesaDocRef);
            const accountsCashSnapshot = await transaction.get(accountsCashRef);
            const accountsMpesaSnapshot = await transaction.get(accountsMpesaRef);
            const todayCashSnapshot = await transaction.get(todayCashDocRef);
            const todayMpesaSnapshot = await transaction.get(todayMpesaDocRef);

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
    
            const newCashBalance = currentCashBalance + cashAmount;
            const newMpesaBalance = currentMpesaBalance + mpesaAmount;
            const newAccountsCashBalance = currentAccountsCashBalance + cashAmount;
            const newAccountsMpesaBalance = currentAccountsMpesaBalance + mpesaAmount;

            const todayCashIncome = todayCashSnapshot.exists() ? Number(todayCashSnapshot.data().amount) || 0 : 0;
            const todayMpesaIncome = todayMpesaSnapshot.exists() ? Number(todayMpesaSnapshot.data().amount) || 0 : 0;
            
            const newTodayCashIncome = todayCashIncome + cashAmount;
            const newTodayMpesaIncome = todayMpesaIncome + mpesaAmount;

            const dateObject = addedDate ? new Date(addedDate) : new Date();
            const firestoreTimestamp = Timestamp.fromDate(dateObject);

            // updating income cash document
            transaction.update(cashDocRef, {
                cashBalance: newCashBalance,
                addedAt: firestoreTimestamp
            });

            // updating income mpesa document
            transaction.update(mpesaDocRef, {
                mpesaBalance: newMpesaBalance,
                addedAt: firestoreTimestamp
            });

            // updating Accounts cash document
            transaction.update(accountsCashRef, {
                cashBalance: newAccountsCashBalance,
                addedAt: firestoreTimestamp
            });
            
            // updating Accounts mpesa document
            transaction.update(accountsMpesaRef, {
                mpesaBalance: newAccountsMpesaBalance,
                addedAt: firestoreTimestamp
            });

            
            transaction.set(todayCashDocRef, {
                amount: newTodayCashIncome,
                addedAt: firestoreTimestamp,
                dateKey: dateKey,
                type: "cash"
            });

            transaction.set(todayMpesaDocRef, {
                amount: newTodayMpesaIncome,
                addedAt: firestoreTimestamp,
                dateKey: dateKey,
                type: "mpesa"
            });

            transaction.set(newTransactionRef, {
                cashAdded: cashAmount,
                mpesaAdded: mpesaAmount,
                addedAt: firestoreTimestamp,
                status: "completed"
            });
        });
        
        const messageDisplay = document.querySelector('.message-display');
        messageDisplay.style.color = "green";
        messageDisplay.textContent = "Balances successfully updated!";
        clearForm();
    } catch (error) {
        console.error("Transaction failed: ", error);
        const messageDisplay = document.querySelector('.message-display');
        messageDisplay.style.color = "red";
        messageDisplay.textContent = "Failed to update balances.";
        clearForm();
    }
});

function clearForm(){
    document.getElementById('cash-amount').value = '';
    document.getElementById('mpesa-amount').value = '';
    document.getElementById('income-date').value = '';
}

// Realtime listener for monthly income
const monthlyIncomeDisplay = document.querySelector('.monthly-income-amount');

onSnapshot(doc(db, "Accounts", "cash"), (snapshot) => {
    if (snapshot.exists()) {
        updateMonthlyIncome();
    }
});

onSnapshot(doc(db, "Accounts", "mpesa"), (snapshot) => {
    if (snapshot.exists()) {
        updateMonthlyIncome();
    }
});

function updateMonthlyIncome() {
    const accountsCashRef = doc(db, "Income", "cash");
    const accountsMpesaRef = doc(db, "Income", "mpesa");
    
    getDoc(accountsCashRef).then((cashSnapshot) => {
        getDoc(accountsMpesaRef).then((mpesaSnapshot) => {
            const finalCash = cashSnapshot.exists() ? cashSnapshot.data().cashBalance : 0;
            const finalMpesa = mpesaSnapshot.exists() ? mpesaSnapshot.data().mpesaBalance : 0;
            
            const totalBalance = finalCash + finalMpesa;
            monthlyIncomeDisplay.textContent = `Ksh. ${totalBalance}`;
        });
    });
}

// Realtime listener for today's income 
const todayIncomeDisplay = document.getElementById('today-income-amount');

const loadTodayIncomeListener = () => {
    const todayDateKey = new Date().toISOString().split('T')[0];
    
    // FIX: Use compound document ID
    const todayCashRef = doc(db, "DailyIncome", `${todayDateKey}_cash`);
    const todayMpesaRef = doc(db, "DailyIncome", `${todayDateKey}_mpesa`);
    
    onSnapshot(todayCashRef, (snapshot) => {
        updateTodayIncome();
    });

    onSnapshot(todayMpesaRef, (snapshot) => {
        updateTodayIncome();
    });
};

function updateTodayIncome() {
    const todayDateKey = new Date().toISOString().split('T')[0];
    
    const todayCashRef = doc(db, "DailyIncome", `${todayDateKey}_cash`);
    const todayMpesaRef = doc(db, "DailyIncome", `${todayDateKey}_mpesa`);
    
    getDoc(todayCashRef).then((cashSnapshot) => {
        getDoc(todayMpesaRef).then((mpesaSnapshot) => {
            const finalCash = cashSnapshot.exists() ? cashSnapshot.data().amount || 0 : 0;
            const finalMpesa = mpesaSnapshot.exists() ? mpesaSnapshot.data().amount || 0 : 0;
            
            const totalTodayIncome = finalCash + finalMpesa;
            todayIncomeDisplay.textContent = `Ksh. ${totalTodayIncome}`;
        });
    });
}

// Initialize listeners
loadTodayIncomeListener();
updateMonthlyIncome();
updateTodayIncome();