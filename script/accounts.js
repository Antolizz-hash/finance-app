import {db} from './firebase.js'
import { toTimestamp } from "./helper.js";
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
// ******************************** accounts script ************************************

// ******************************* Start of retrieving data from  the db *************************************

const cashElement = document.getElementById('cash-balance');
const mpesaElement = document.getElementById('mpesa-balance');
const savingsElement = document.getElementById('savings-balance');

console.log("Script loaded");

// Listen for Cash balance changes
onSnapshot(doc(db, "Accounts", "cash"), (cashSnap) => {

    if (!cashSnap.exists()) return;

    cashElement.textContent =
        `Ksh ${Number(cashSnap.data().cashBalance).toFixed(2)}`;

});

// Listen for Mpesa balance changes
onSnapshot(doc(db, "Accounts", "mpesa"), (mpesaSnap) => {

    if (!mpesaSnap.exists()) return;

    mpesaElement.textContent =
        `Ksh ${Number(mpesaSnap.data().mpesaBalance).toFixed(2)}`;

});

// Listen for Savings balance changes
onSnapshot(doc(db, "Accounts", "savings"), (savingsSnap) => {

    if (!savingsSnap.exists()) return;

    savingsElement.textContent =
        `Ksh ${Number(savingsSnap.data().savingsBalance).toFixed(2)}`;

});

// ****************************** End of retrieving data from database **********************************************

// ******************************* Start of Adding Account to database **********************************************

const addButton = document.getElementById('add-account-btn');

addButton.addEventListener('click', async (e)=>{
    e.preventDefault();
    const accountType = document.getElementById('account-type').value
    const initialBalance = document.getElementById('initial-balance').value
    const createdDate = document.getElementById('accountDate').value

    if(accountType === "cash") {

    // define the collection
    const myCollection = collection(db, "Accounts");
    // define document data
    const myData = {
        accountType: accountType,
        cashBalance: initialBalance,
        createdAt: toTimestamp(createdDate)
    
    }
    // add to db
    try {
        const docRef = doc(myCollection, "cash");
        await setDoc(docRef, myData);
        
        alert("Account added successfully");

        const accountType = document.getElementById('account-type').value = ''
        const initialBalance = document.getElementById('initial-balance').value = ''
        const createdDate = document.getElementById('accountDate').value = ''
    } catch (e) {
        console.error("Error adding document: ", e);
    }
    }
    else if(accountType === "mpesa") {
        // define the collection
    const myCollection = collection(db, "Accounts");
    // define document data
    const myData = {
        accountType: accountType,
        mpesaBalance: initialBalance,
        createdAt: createdDate
    
    }
    // add to db
    try {
        const docRef = doc(myCollection, "mpesa");
        await setDoc(docRef, myData);
        
        alert("Account added successfuly");
        const accountType = document.getElementById('account-type').value = ''
        const initialBalance = document.getElementById('initial-balance').value = ''
        const createdDate = document.getElementById('accountDate').value = ''

    } catch (e) {
        console.error("Error adding document: ", e);
    }
    }
    else if(accountType === "savings") {
        // define the collection
    const myCollection = collection(db, "Accounts");
    // define document data
    const myData = {
        accountType: accountType,
        savingsBalance: initialBalance,
        createdAt: toTimestamp(createdDate)
    
    }
    
    try {
        const docRef = doc(myCollection, "savings");
        await setDoc(docRef, myData);
    
        alert("Account added successfully");

        const accountType = document.getElementById('account-type').value = ''
        const initialBalance = document.getElementById('initial-balance').value = ''
        const createdDate = document.getElementById('accountDate').value = ''
    } catch (e) {
        console.error("Error adding document: ", e);
    }
    }
   
})

// **************************************** End of adding accounts to database ******************************************

// **************************************** Start of depositing funds to accounts ***************************************

const depositButton = document.getElementById('deposit-btn');

depositButton.addEventListener('click', async (e) =>{
    e.preventDefault();

    const deposit = getDepositValues();


    
    await runTransaction(db, async (transaction) =>{
        if(deposit.Account === "cash") {
            try {
                // get account reference
            const cashRef = doc(db, "Accounts", "cash");
            const cashSnap = await transaction.get(cashRef);

            // cgeck if account exists
            if(!cashSnap.exists()){
                throw new Error('Cash account does not exist');
            }
            
            // store data in a variable
            const cashData = cashSnap.data();

            // read and store balance in cash account
            const balance = cashData.cashBalance || 0;

            console.log(balance);
            console.log(typeof balance);

            let newBalance = (
                parseFloat(balance) + parseFloat(deposit.depositAmount)
                ).toFixed(2);
            // update balance in db
            transaction.update(cashRef,{
                cashBalance:newBalance
            })

            // const depositRef = doc(collection(db, "Accounts"));
            const transactionRef = doc(collection(db, "Transactions"));

            // transaction.set(accountRef, {
            //     description: "Deposit",
            //     amount: parseFloat(deposit.depositAmount),
            //     date: deposit.depositDate
            // });
            transaction.set(transactionRef, {
                transactionType: "deposit",
                amount: parseFloat(deposit.depositAmount),
                account: "cash",
                date: toTimestamp(deposit.date)
            }); 
            alert("Transaction recorded successfully");
            console.log("Transaction recorded successfully");
            clearDepositValues();
                
            } catch (error) {
                console.log('deposit failed: '+error);
                clearDepositValues(); 
            }
            
            
        }
        else if (deposit.Account === "mpesa") {

    try {

        // References
        const mpesaRef = doc(db, "Accounts", "mpesa");
        const fulizaRef = doc(db, "Loans", "Fuliza");

        // Read documents
        const mpesaSnap = await transaction.get(mpesaRef);
        const fulizaSnap = await transaction.get(fulizaRef);

        if (!mpesaSnap.exists()) {
            throw new Error("Mpesa account does not exist");
        }

        if (!fulizaSnap.exists()) {
            throw new Error("Fuliza loan does not exist");
        }

        // Current values
        const mpesaBalance = Number(mpesaSnap.data().mpesaBalance) || 0;
        const loanBalance = Number(fulizaSnap.data().loanBalance) || 0;
        const loanLimit = Number(fulizaSnap.data().loanLimit) || 0;

        const depositAmount = Number(deposit.depositAmount);

        if (depositAmount <= 0) {
            throw new Error("Invalid deposit amount");
        }

        let newMpesaBalance;
        let newLoanBalance;
        let amountPaid;

        // There is Fuliza debt
        if (loanBalance > 0) {

            amountPaid = Math.min(depositAmount, loanBalance);

            newLoanBalance = Number((loanBalance - amountPaid).toFixed(2));

            // Only money left after clearing the debt remains in Mpesa
            newMpesaBalance = Number(
                (mpesaBalance + depositAmount - amountPaid).toFixed(2)
            );

        } else {

            amountPaid = 0;
            newLoanBalance = 0;

            newMpesaBalance = Number(
                (mpesaBalance + depositAmount).toFixed(2)
            );

        }

        // Optional: update available limit
        const newAvailableLimit = Number(
            (loanLimit - newLoanBalance).toFixed(2)
        );

        // Update Mpesa
        transaction.update(mpesaRef, {
            mpesaBalance: newMpesaBalance
        });

        // Update Fuliza
        transaction.update(fulizaRef, {
            loanBalance: newLoanBalance,
            availableLimit: newAvailableLimit
        });

        // Deposit transaction
        const depositRef = doc(collection(db, "Transactions"));

        transaction.set(depositRef, {
            transactionType: "deposit",
            account: "mpesa",
            amount: depositAmount,
            date: deposit.depositDate
        });

        // Loan repayment transaction
        if (amountPaid > 0) {

            const repaymentRef = doc(collection(db, "Transactions"));

            transaction.set(repaymentRef, {
                transactionType: "loan repayment",
                loan: "Fuliza",
                account: "mpesa",
                amount: amountPaid,
                date: toTimestamp(deposit.depositDate)
            });

        }

        alert("Transaction recorded successfully");
        console.log("Deposit:", depositAmount);
        console.log("Paid Fuliza:", amountPaid);
        console.log("Remaining Loan:", newLoanBalance);
        console.log("Mpesa Balance:", newMpesaBalance);

        clearDepositValues();

    } catch (error) {

        console.error(error);
        alert(error.message);

    }

}

        else if(deposit.Account === "savings") {

            try {
                const savingsRef = doc(db, "Accounts", "savings");
            
        
                const savingSnap = await transaction.get(savingsRef);
                if(!savingSnap.exists()){
                    throw new Error('Savings account does not exist');
                }
                
                const savingsData = savingSnap.data();
                const balance = savingsData.savingsBalance;

                const newBalance = parseFloat((balance + parseFloat(deposit.depositAmount)).toFixed(2));

                transaction.update(savingsRef,{
                    savingsBalance:newBalance
                })

                // const depositRef = doc(collection(db, "Accounts"));
                const transactionRef = doc(collection(db, "Transactions"));

                // transaction.set(depositRef, {
                //     description: "Deposit",
                //     amount: parseFloat(deposit.depositAmount),
                //     date: depositDate
                // });
                transaction.set(transactionRef, {
                    transactionType: "deposit",
                    amount: parseFloat(deposit.depositAmount),
                    account: "savings",
                    date: toTimestamp(deposit.depositDate)
                }); 
                alert("Transaction recorded successfully");
                console.log("Transaction recorded successfully");
                clearDepositValues();
            } catch (error) {
                console.log('deposit failed: '+error);
                clearDepositValues();
            }
    
    
        }

    });
                  
});

function getDepositValues(){
    return{
        Account : document.getElementById('add-funds-account-type').value,
        depositAmount : document.getElementById('deposit-amount').value,
        depositDate : document.getElementById('depositDate').value
    }
}

function clearDepositValues(){
    const Account = document.getElementById('add-funds-account-type').value = ''
    const depositAmount = document.getElementById('deposit-amount').value = ''
    const depositDate = document.getElementById('depositDate').value = ''
}
