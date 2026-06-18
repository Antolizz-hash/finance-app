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
// ******************************** accounts script ************************************

// ******************************* Start of retrieving data from  the db *************************************

const cashElement = document.getElementById('cash-balance')
const mpesaElement = document.getElementById('mpesa-balance')
const savingsElement = document.getElementById('savings-balance')

console.log("Script loaded");
async function loadAccounts() {
    const mpesaSnap = await getDoc(doc(db, "Accounts", "mpesa"));
    const cashSnap = await getDoc(doc(db, "Accounts", "cash"));
    const savingsSnap = await getDoc(doc(db, "Accounts", "savings"));
    if (cashSnap.exists()) {
        cashElement.textContent = `Ksh ${cashSnap.data().cashBalance}`;
    }
    if(mpesaSnap.exists()) {
        mpesaElement.textContent = `Ksh ${mpesaSnap.data().mpesaBalance}`;
    }
    if(savingsSnap.exists()) {
            savingsElement.textContent = `Ksh ${savingsSnap.data().savingsBalance}`;
        }

    console.log(cashSnap.data().cashBalance);
    
} 

loadAccounts();

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
        createdAt: createdDate
    
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
        createdAt: createdDate
    
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

    const Account = document.getElementById('add-funds-account-type').value
    const depositAmount = document.getElementById('deposit-amount').value
    const depositDate = document.getElementById('depositDate').value

    try{
        await runTransaction(db, async (transaction) =>{
            if(Account === "cash") {
                const accountRef = doc(db, "Accounts", "cash");
                const accountSnap = await transaction.get(accountRef);
                
                const data = accountSnap.data();
                const balance = data.cashBalance;
                console.log(balance);
                console.log(typeof balance);

                const newBalance = (
                    balance + Number(depositAmount)
                    ).toFixed(2);

                transaction.update(accountRef,{
                    cashBalance:newBalance
                })

                // const depositRef = doc(collection(db, "Accounts"));
                const transactionRef = doc(collection(db, "Transactions"));

                transaction.set(accountRef, {
                    description: "Deposit",
                    amount: Number(depositAmount),
                    date: depositDate
                });
                transaction.set(transactionRef, {
                    transactionType: "deposit",
                    amount: Number(depositAmount),
                    account: "cash",
                    date: depositDate
                }); 
                console.log("Transaction recorded successfully");
            }
            else if(Account === "mpesa") {
                const accountRef = doc(db, "Accounts", "mpesa");
                
                const accountSnap = await transaction.get(accountRef);
                
                const data = accountSnap.data();
                const balance = data.mpesaBalance;

                const newBalance = Number((balance + Number(depositAmount)).toFixed(2));

                transaction.update(accountRef,{
                    mpesaBalance:newBalance
                })

                const depositRef = doc(collection(db, "Accounts"));
                const transactionRef = doc(collection(db, "Transactions"));

                transaction.set(depositRef, {
                    description: "Deposit",
                    amount: Number(depositAmount),
                    date: depositDate
                });
                transaction.set(transactionRef, {
                    transactionType: "deposit",
                    amount: Number(depositAmount),
                    account: "mpesa",
                    date: depositDate
                }); 
                console.log("Transaction recorded successfully");
            }

            else if(Account === "savings") {
                const accountRef = doc(db, "Accounts", "savings");
                
            
                const accountSnap = await transaction.get(accountRef);
                
                const data = accountSnap.data();
                const balance = data.savingsBalance;

                const newBalance = Number((balance + Number(depositAmount)).toFixed(2));

                transaction.update(accountRef,{
                    savingsBalance:newBalance
                })

                const depositRef = doc(collection(db, "Accounts"));
                const transactionRef = doc(collection(db, "Transactions"));

                transaction.set(depositRef, {
                    description: "Deposit",
                    amount: Number(depositAmount),
                    date: depositDate
                });
                transaction.set(transactionRef, {
                    transactionType: "deposit",
                    amount: Number(depositAmount),
                    account: "savings",
                    date: depositDate
                }); 
                console.log("Transaction recorded successfully");
            }

    


        });


    }catch(error){
        console.log('deposit failed: '+error);
    
    }
    
})

