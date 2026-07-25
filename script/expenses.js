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
    const startDate = document.getElementById("from-date").value;
    const endDate = document.getElementById("to-date").value;

    // Validate inputs
    if (!startDate || !endDate) {
        alert("Please select both dates.");
        return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Check if start is after end
    if (start > end) {
        alert("Start date cannot be after end date.");
        return;
    }

    // Show loading state
    displayDiv.innerHTML = `
        <h2>Your Transactions</h2>
        <p class="loading-text">Loading expenses...</p>
    `;
    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";

    try {
        const expensesQuery = query(
            collection(db, "Transactions"),
            where("transactionType", "==", "expense"),
            where("date", ">=", Timestamp.fromDate(start)),
            where("date", "<=", Timestamp.fromDate(end)),
            orderBy("date", "desc")
        );

        const snapshot = await getDocs(expensesQuery);

        // Clear and prepare container
        let html = `<h2>Your Transactions</h2>`;

        if (snapshot.empty) {
            html += `<p class="no-results">No expenses found for the selected dates.</p>`;
            displayDiv.innerHTML = html;
            return;
        }

        let totalAmount = 0;
        const transactions = [];

        snapshot.forEach((doc) => {
            const expense = doc.data();
            const amount = Number(expense.amount) || 0;
            totalAmount += amount;

            // Handle date - supports both Firestore Timestamp and string
            let dateStr = "N/A";
            if (expense.date) {
                if (typeof expense.date.toDate === "function") {
                    dateStr = expense.date.toDate().toLocaleDateString("en-KE");
                } else if (expense.date instanceof Date) {
                    dateStr = expense.date.toLocaleDateString("en-KE");
                } else {
                    dateStr = new Date(expense.date).toLocaleDateString("en-KE");
                }
            }

            transactions.push(`
                <div class="transaction-card">
                    <div class="transaction-header">
                        <span class="transaction-category">${expense.category || "Uncategorized"}</span>
                        <span class="transaction-amount">Ksh ${amount.toFixed(2)}</span>
                    </div>
                    ${expense.description ? `<p class="transaction-desc">${expense.description}</p>` : ""}
                    <div class="transaction-footer">
                        <span class="transaction-account">${expense.account || "N/A"}</span>
                        <span class="transaction-date">${dateStr}</span>
                    </div>
                </div>
            `);
        });

        // Add summary header
        html += `
            <div class="transaction-summary">
                <span>${snapshot.size} transaction${snapshot.size !== 1 ? "s" : ""}</span>
                <span>Total: <strong>Ksh ${totalAmount.toFixed(2)}</strong></span>
            </div>
        `;

        html += transactions.join("");
        displayDiv.innerHTML = html;

    } catch (error) {
        console.error("Search failed:", error);
        displayDiv.innerHTML = `
            <h2>Your Transactions</h2>
            <p class="error-text">Failed to retrieve expenses. Please try again.</p>
        `;
        
        // Common Firestore index error
        if (error.message && error.message.includes("index")) {
            alert("This query requires a Firestore index. Check the browser console for the index creation link.");
        }
    } finally {
        // Reset button state
        searchBtn.disabled = false;
        searchBtn.textContent = "Search";
    }
});