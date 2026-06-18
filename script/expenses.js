import {db} from './firebase.js'
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
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
getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
// ********************************** expenses page script *****************************************************
const addExpenseBtn = document.getElementById('submitBtn');
addExpenseBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const description = document.querySelector('.description').value;
    const amount = document.querySelector('#expense-amount').value;
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('category').value;
    const account = document.getElementById('accountName').value;

    console.log({ description, amount, date, category , account});

    try {
        await runTransaction(db, async (transaction) => {

            if (account === "fuliza") {
                const accountRef = doc(db, "Loans", "Fuliza");
                // check balance
                const accountSnap = await transaction.get(accountRef);

                const data = accountSnap.data();
                const balance = data.limit;
                const debt = data.LoanAmount;
                console.log(debt);
       
                const newLimit = Number((data.limit - Number(amount)).toFixed(2));
                const newDebt = Number((debt + Number(amount)).toFixed(2)); 
                console.log(balance);
                if (balance < Number(amount)) {
                    throw new Error("Insufficient funds");
                }

                transaction.update(accountRef, {
                    limit: newLimit,
                    LoanAmount: newDebt
                });

                const expenseRef = doc(collection(db, "Expenses"));
                const transactionRef = doc(collection(db, "Transactions"));

                transaction.set(expenseRef, {
                description,
                amount: Number(amount),
                category,
                date
            });

            transaction.set(transactionRef, {
            transactionType: "expense",
            amount: Number(amount),
            account: "fuliza",
            category,
            date
         });
            console.log("Transaction recorded successfully");




            }else if(account === "mpesa") {
                const accountRef = doc(db, "Accounts", "mpesa");
                // check balance
                const accountSnap = await transaction.get(accountRef);

                const balance = accountSnap.data().mpesaBalance;
                console.log(balance);
                if (balance < Number(amount)) {
                    throw new Error("Insufficient funds");
                }

                transaction.update(accountRef, {
                    mpesaBalance: balance - Number(amount)
                });

                const expenseRef = doc(collection(db, "Expenses"));
                const transactionRef = doc(collection(db, "Transactions"));

                transaction.set(expenseRef, {
                description,
                amount: Number(amount),
                category,
                date
            });

            transaction.set(transactionRef, {
            transactionType: "expense",
            amount: Number(amount),
            account: "mpesa",
            category,
            date
         });
            console.log("Transaction recorded successfully");
            }else{
                const accountRef = doc(db, "Accounts", "cash");
                
                // check balance
                const accountSnap = await transaction.get(accountRef);

                const balance = accountSnap.data().cashBalance;
                console.log(balance);
                if (balance < Number(amount)) {
                    throw new Error("Insufficient funds");
                }

                transaction.update(accountRef, {
                    limit: balance - Number(amount)
                });

                const expenseRef = doc(collection(db, "Expenses"));
                const transactionRef = doc(collection(db, "Transactions"));

                transaction.set(expenseRef, {
                description,
                amount: Number(amount),
                category,
                date
            });

            transaction.set(transactionRef, {
            transactionType: "expense",
            amount: Number(amount),
            account: "cash",
            category,
            date
         });
            console.log("Transaction recorded successfully");
            }

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

}

loadTotalExpenses();