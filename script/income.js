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
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const addIncomeBtn = document.getElementById('add-income-btn');

addIncomeBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const cashAmount = Number(document.getElementById('cash-amount').value) || 0;
    const mpesaAmount = Number(document.getElementById('mpesa-amount').value) || 0;
    const addedDate = document.getElementById('income-date').value;

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

            const dateObject = addedDate ? new Date(addedDate) : new Date();
            const firestoreTimestamp = Timestamp.fromDate(dateObject);

            // ===== Income/cash =====
            if (!cashSnapshot.exists()) {
                transaction.set(cashDocRef, {
                    cashBalance: cashAmount,
                    addedAt: firestoreTimestamp
                });
            } else {
                const currentCashBalance = Number(cashSnapshot.data().cashBalance) || 0;
                transaction.update(cashDocRef, {
                    cashBalance: currentCashBalance + cashAmount,
                    addedAt: firestoreTimestamp
                });
            }

            // ===== Income/mpesa =====
            if (!mpesaSnapshot.exists()) {
                transaction.set(mpesaDocRef, {
                    mpesaBalance: mpesaAmount,
                    addedAt: firestoreTimestamp
                });
            } else {
                const currentMpesaBalance = Number(mpesaSnapshot.data().mpesaBalance) || 0;
                transaction.update(mpesaDocRef, {
                    mpesaBalance: currentMpesaBalance + mpesaAmount,
                    addedAt: firestoreTimestamp
                });
            }

            // ===== Accounts/cash =====
            if (!accountsCashSnapshot.exists()) {
                transaction.set(accountsCashRef, {
                    cashBalance: cashAmount,
                    addedAt: firestoreTimestamp
                });
            } else {
                const currentAccountsCashBalance = Number(accountsCashSnapshot.data().cashBalance) || 0;
                transaction.update(accountsCashRef, {
                    cashBalance: currentAccountsCashBalance + cashAmount,
                    addedAt: firestoreTimestamp
                });
            }

            // ===== Accounts/mpesa =====
            if (!accountsMpesaSnapshot.exists()) {
                transaction.set(accountsMpesaRef, {
                    mpesaBalance: mpesaAmount,
                    addedAt: firestoreTimestamp
                });
            } else {
                const currentAccountsMpesaBalance = Number(accountsMpesaSnapshot.data().mpesaBalance) || 0;
                transaction.update(accountsMpesaRef, {
                    mpesaBalance: currentAccountsMpesaBalance + mpesaAmount,
                    addedAt: firestoreTimestamp
                });
            }

            // ===== DailyIncome/cash =====
            if (!todayCashSnapshot.exists()) {
                transaction.set(todayCashDocRef, {
                    amount: cashAmount,
                    addedAt: firestoreTimestamp,
                    dateKey: dateKey,
                    type: "cash"
                });
            } else {
                const todayCashIncome = Number(todayCashSnapshot.data().amount) || 0;
                transaction.update(todayCashDocRef, {
                    amount: todayCashIncome + cashAmount,
                    addedAt: firestoreTimestamp
                });
            }

            // ===== DailyIncome/mpesa =====
            if (!todayMpesaSnapshot.exists()) {
                transaction.set(todayMpesaDocRef, {
                    amount: mpesaAmount,
                    addedAt: firestoreTimestamp,
                    dateKey: dateKey,
                    type: "mpesa"
                });
            } else {
                const todayMpesaIncome = Number(todayMpesaSnapshot.data().amount) || 0;
                transaction.update(todayMpesaDocRef, {
                    amount: todayMpesaIncome + mpesaAmount,
                    addedAt: firestoreTimestamp
                });
            }

            // ===== Transaction log =====
            transaction.set(newTransactionRef, {
                cashAdded: cashAmount,
                mpesaAdded: mpesaAmount,
                addedAt: firestoreTimestamp,
                status: "completed"
            });
        });

        showMessage("Balances successfully updated!", "green");
        clearForm();
    } catch (error) {
        console.error("Transaction failed: ", error);
        showMessage("Failed to update balances: " + error.message, "red");
        clearForm();
    }
});

function showMessage(text, color) {
    const messageDisplay = document.querySelector('.message-display');
    if (messageDisplay) {
        messageDisplay.style.color = color;
        messageDisplay.textContent = text;
    }
}

function clearForm() {
    document.getElementById('cash-amount').value = '';
    document.getElementById('mpesa-amount').value = '';
    document.getElementById('income-date').value = '';
}

// ===== Realtime listener for monthly income =====
const monthlyIncomeDisplay = document.querySelector('.monthly-income-amount');

function updateMonthlyIncome() {
    const incomeCashRef = doc(db, "Income", "cash");
    const incomeMpesaRef = doc(db, "Income", "mpesa");

    getDoc(incomeCashRef).then((cashSnapshot) => {
        getDoc(incomeMpesaRef).then((mpesaSnapshot) => {
            const finalCash = cashSnapshot.exists() ? (cashSnapshot.data().cashBalance || 0) : 0;
            const finalMpesa = mpesaSnapshot.exists() ? (mpesaSnapshot.data().mpesaBalance || 0) : 0;
            const totalBalance = finalCash + finalMpesa;
            if (monthlyIncomeDisplay) {
                monthlyIncomeDisplay.textContent = `Ksh. ${totalBalance}`;
            }
        });
    });
}

onSnapshot(doc(db, "Accounts", "cash"), (snapshot) => {
    if (snapshot.exists()) updateMonthlyIncome();
});

onSnapshot(doc(db, "Accounts", "mpesa"), (snapshot) => {
    if (snapshot.exists()) updateMonthlyIncome();
});

// ===== Realtime listener for today's income =====
const todayIncomeDisplay = document.getElementById('today-income-amount');

function updateTodayIncome() {
    const todayDateKey = new Date().toISOString().split('T')[0];
    const todayCashRef = doc(db, "DailyIncome", `${todayDateKey}_cash`);
    const todayMpesaRef = doc(db, "DailyIncome", `${todayDateKey}_mpesa`);

    getDoc(todayCashRef).then((cashSnapshot) => {
        getDoc(todayMpesaRef).then((mpesaSnapshot) => {
            const finalCash = cashSnapshot.exists() ? (cashSnapshot.data().amount || 0) : 0;
            const finalMpesa = mpesaSnapshot.exists() ? (mpesaSnapshot.data().amount || 0) : 0;
            const totalTodayIncome = finalCash + finalMpesa;
            if (todayIncomeDisplay) {
                todayIncomeDisplay.textContent = `Ksh. ${totalTodayIncome}`;
            }
        });
    });
}

const loadTodayIncomeListener = () => {
    const todayDateKey = new Date().toISOString().split('T')[0];
    const todayCashRef = doc(db, "DailyIncome", `${todayDateKey}_cash`);
    const todayMpesaRef = doc(db, "DailyIncome", `${todayDateKey}_mpesa`);

    onSnapshot(todayCashRef, (snapshot) => {
        updateTodayIncome();
    });

    onSnapshot(todayMpesaRef, (snapshot) => {
        updateTodayIncome();
    });
};

// Initialize
loadTodayIncomeListener();
updateMonthlyIncome();
updateTodayIncome();
