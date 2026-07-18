import {db} from './firebase.js'
import { toTimestamp } from "./helper.js";
import {
collection,
getDocs,
doc,
addDoc,
setDoc,
query,
where,
orderBy,
Timestamp,
runTransaction,
persistentLocalCache,
persistentMultipleTabManager,
initializeFirestore,
getDoc,
onSnapshot
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
// ********************************** expenses page script *****************************************************
const addExpenseBtn = document.getElementById('submitBtn');
addExpenseBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const description = document.querySelector('.description').value;
    const amount = document.querySelector('#expense-amount').value;
    const addedDate = document.getElementById('expense-date').value;
    const category = document.getElementById('category').value;
    const account = document.getElementById('accountName').value;
    let date = toTimestamp(addedDate)

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
                    cashBalance: balance - Number(amount)
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
const totalExpenses = document.getElementById("total-expenses");

onSnapshot(collection(db, "Expenses"), (querySnapshot) => {

    let total = 0;

    querySnapshot.forEach((doc) => {

        const data = doc.data();

        total += Number(data.amount) || 0;

    });

    totalExpenses.textContent = `Ksh ${total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

    totalExpenses.style.fontSize = "24px";
    totalExpenses.style.color = "blue";
    totalExpenses.style.fontWeight = "bold";
    totalExpenses.style.padding = "10px";

});

// Filtering expenses
const searchBtn = document.getElementById("search-expense");

searchBtn.addEventListener("click", async () => {

    const displayDiv = document.getElementById("result-div");

    // Get the selected dates
    const startDate = document.getElementById("from-date").value;
    const endDate = document.getElementById("to-date").value;

    // Validate input
    if (!startDate || !endDate) {
        alert("Please select both dates.");
        return;
    }

    // Beginning of the start date
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // End of the end date
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    try {

        const expensesQuery = query(
            collection(db, "Transactions"),
            where("transactionType", "==", "expense"),
            where("date", ">=", Timestamp.fromDate(start)),
            where("date", "<=", Timestamp.fromDate(end)),
            orderBy("date", "desc")
        );

        const snapshot = await getDocs(expensesQuery);

        // Clear previous results
        displayDiv.innerHTML = "<h2>Your Transactions</h2>";

        if (snapshot.empty) {
            displayDiv.innerHTML += "<p>No expenses found for the selected dates.</p>";
            return;
        }

        snapshot.forEach((doc) => {

            const expense = doc.data();

            displayDiv.innerHTML += `
                <div class="transaction">
                    <h3>${expense.category}</h3>
                    <p><strong>Amount:</strong> Ksh ${Number(expense.amount).toFixed(2)}</p>
                    <p><strong>Account:</strong> ${expense.account}</p>
                    <p><strong>Date:</strong> ${expense.date.toDate().toLocaleDateString("en-KE")}</p>
                    <hr>
                </div>
            `;

        });

    } catch (error) {
        console.error("Search failed:", error);
        alert("Failed to retrieve expenses.");
    }

});