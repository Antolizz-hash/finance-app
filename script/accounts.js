import { db } from './firebase.js';
import { toTimestamp } from "../helper.js";
import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    runTransaction,
    onSnapshot,
    getDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// ===== DOM Elements =====
const els = {
    accountsContainer: document.getElementById('accounts-container'),
    openAddAccountModal: document.getElementById('openAddAccountModalBtn'),
    closeAddAccountModal: document.getElementById('closeAddAccountModalBtn'),
    addAccountModal: document.getElementById('addAccountModal'),
    addAccountForm: document.getElementById('add-account-form'),
    addAccountBtn: document.getElementById('add-account-btn'),

    openAddFundsModal: document.getElementById('openPayModalBtn'),
    closeAddFundsModal: document.getElementById('closeAddFundsModalBtn'),
    addFundsModal: document.getElementById('addFundsModal'),
    addFundsForm: document.getElementById('add-funds-form'),
    depositBtn: document.getElementById('deposit-btn'),

    openTransferModal: document.getElementById('openTransferModalBtn'),
    closeTransferModal: document.getElementById('closeTransferModalBtn'),
    transferModal: document.getElementById('transferModal'),
    transferForm: document.getElementById('transfer-form'),
    transferBtn: document.getElementById('transfer-btn'),
    transferFrom: document.getElementById('transfer-from'),
    transferTo: document.getElementById('transfer-to'),
    transferAmount: document.getElementById('transfer-amount'),
    fromBalance: document.getElementById('from-balance'),
    toBalance: document.getElementById('to-balance'),
    transferInfo: document.getElementById('transfer-info'),
    successMessage: document.getElementById('display'),
};

// ===== Account Config =====
const ALL_ACCOUNTS = ['cash', 'mpesa', 'savings'];

const ACCOUNT_ICONS = {
    cash: '💵',
    mpesa: '📱',
    savings: '🏦'
};

const ACCOUNT_NAMES = {
    cash: 'Cash',
    mpesa: 'M-Pesa',
    savings: 'Savings'
};

const BALANCE_FIELDS = {
    cash: 'cashBalance',
    mpesa: 'mpesaBalance',
    savings: 'savingsBalance'
};

let currentBalances = {};

// ===== Formatters =====
function fmtMoney(num) {
    return 'Ksh ' + Number(num).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== Modal Handlers =====
function openModal(modal) { modal?.classList.add('active'); }
function closeModal(modal) { modal?.classList.remove('active'); }

els.openAddAccountModal?.addEventListener('click', () => openModal(els.addAccountModal));
els.closeAddAccountModal?.addEventListener('click', () => closeModal(els.addAccountModal));
els.openAddFundsModal?.addEventListener('click', () => openModal(els.addFundsModal));
els.closeAddFundsModal?.addEventListener('click', () => closeModal(els.addFundsModal));
els.openTransferModal?.addEventListener('click', () => {
    updateTransferBalances();
    openModal(els.transferModal);
});
els.closeTransferModal?.addEventListener('click', () => closeModal(els.transferModal));

[els.addAccountModal, els.addFundsModal, els.transferModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

// Set today's date as default
const todayStr = new Date().toISOString().split('T')[0];
const dateInputs = document.querySelectorAll('input[type="date"]');
dateInputs.forEach(input => {
    if (!input.value) input.value = todayStr;
});

// ===== Render Accounts - ALWAYS show all 3 =====
function renderAccounts(accountData) {
    els.accountsContainer.innerHTML = ALL_ACCOUNTS.map(type => {
        const name = ACCOUNT_NAMES[type];
        const icon = ACCOUNT_ICONS[type];
        const data = accountData[type] || {};
        const balance = data.exists ? (Number(data.balance) || 0) : 0;
        const isNew = !data.exists;

        return `
            <div class="account-card ${type} ${isNew ? 'account-new' : ''}">
                <div class="account-header">
                    <span class="account-icon">${icon}</span>
                    <h3>${name}</h3>
                </div>
                <p class="account-balance">${fmtMoney(balance)}</p>
                <p class="account-label">${isNew ? 'Tap "Add Account" to setup' : 'Available Balance'}</p>
            </div>
        `;
    }).join('');
}

// ===== Realtime Listener =====
const accountsRef = collection(db, 'Accounts');

onSnapshot(accountsRef, (snapshot) => {
    const accountData = {};
    currentBalances = {};

    ALL_ACCOUNTS.forEach(type => {
        accountData[type] = { exists: false, balance: 0 };
        currentBalances[type] = 0;
    });

    snapshot.forEach(docSnap => {
        const type = docSnap.id;
        if (!ALL_ACCOUNTS.includes(type)) return;

        const data = docSnap.data();
        const balanceField = BALANCE_FIELDS[type] || 'balance';
        const balance = Number(data[balanceField]) || 0;

        accountData[type] = { exists: true, balance, ...data };
        currentBalances[type] = balance;
    });

    renderAccounts(accountData);
}, (error) => {
    console.error('Accounts listener failed:', error);
});

// ===== ADD ACCOUNT =====
els.addAccountForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('account-type').value;
    const date = document.getElementById('accountDate').value;
    const balance = Number(document.getElementById('initial-balance').value) || 0;

    if (!type) {
        // alert('Please select an account type.');
        els.successMessage.style.color = 'red'
        els.successMessage.textContent = 'Please select an account type.';
        return;
    }

    els.addAccountBtn.disabled = true;
    els.addAccountBtn.textContent = 'Adding...';

    try {
        const balanceField = BALANCE_FIELDS[type];
        const accountRef = doc(db, 'Accounts', type);

        await setDoc(accountRef, {
            [balanceField]: balance,
            createdAt: toTimestamp(new Date(date)),
            updatedAt: Timestamp.now()
        }, { merge: true });

        // Also update Income tracking for cash/mpesa
        if (type === 'cash' || type === 'mpesa') {
            const incomeRef = doc(db, 'Income', type);
            const incomeSnap = await getDoc(incomeRef);
            if (!incomeSnap.exists()) {
                await setDoc(incomeRef, {
                    [`${type}Balance`]: balance,
                    addedAt: Timestamp.now()
                });
            }
        }

        closeModal(els.addAccountModal);
        els.addAccountForm.reset();
        document.getElementById('accountDate').value = todayStr;
        
        els.successMessage.textContent = `${ACCOUNT_NAMES[type]} account added!`;
        // alert(`${ACCOUNT_NAMES[type]} account added!`);
    } catch (error) {
        console.error('Add account failed:', error);
        els.successMessage.style.color = 'red'
        els.successMessage.textContent = 'Failed to add account: ' + error.message;
        // alert('Failed to add account: ' + error.message);
    } finally {
        els.addAccountBtn.disabled = false;
        els.addAccountBtn.textContent = 'Add Account';
    }
});

// ===== ADD FUNDS (FIXED: all reads before all writes) =====
els.addFundsForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const account = document.getElementById('add-funds-account-type').value;
    const amount = Number(document.getElementById('deposit-amount').value) || 0;
    const date = document.getElementById('depositDate').value;

    if (amount <= 0) {
        // alert('Please enter a valid amount.');
        els.successMessage.style.color = 'red';
        els.successMessage.textContent = 'Please enter a valid amount.';
        return;
    }

    els.depositBtn.disabled = true;
    els.depositBtn.textContent = 'Adding...';

    try {
        const accountRef = doc(db, 'Accounts', account);
        const balanceField = BALANCE_FIELDS[account];

        // For cash/mpesa, also need to read Income doc
        const needsIncomeUpdate = (account === 'cash' || account === 'mpesa');
        const incomeRef = needsIncomeUpdate ? doc(db, 'Income', account) : null;

        await runTransaction(db, async (transaction) => {
            // === ALL READS FIRST ===
            const snap = await transaction.get(accountRef);
            const currentBalance = snap.exists() ? (Number(snap.data()[balanceField]) || 0) : 0;
            const newBalance = parseFloat((currentBalance + amount).toFixed(2));

            let currentIncome = 0;
            if (needsIncomeUpdate && incomeRef) {
                const incomeSnap = await transaction.get(incomeRef);
                currentIncome = incomeSnap.exists() ? (Number(incomeSnap.data()[`${account}Balance`]) || 0) : 0;
            }

            // === ALL WRITES AFTER ===
            transaction.set(accountRef, {
                [balanceField]: newBalance,
                updatedAt: Timestamp.now()
            }, { merge: true });

            if (needsIncomeUpdate && incomeRef) {
                transaction.set(incomeRef, {
                    [`${account}Balance`]: parseFloat((currentIncome + amount).toFixed(2)),
                    addedAt: Timestamp.now()
                }, { merge: true });
            }

            // Log transaction
            const txRef = doc(collection(db, 'Transactions'));
            transaction.set(txRef, {
                transactionType: 'income',
                category: 'deposit',
                amount: amount,
                account: account,
                description: `Deposit to ${ACCOUNT_NAMES[account]}`,
                date: toTimestamp(new Date(date)),
                status: 'completed'
            });
        });

        closeModal(els.addFundsModal);
        els.addFundsForm.reset();
        document.getElementById('depositDate').value = todayStr;
        els.successMessage.textContent = `Ksh ${amount.toFixed(2)} added to ${ACCOUNT_NAMES[account]}!`;
        // alert(`Ksh ${amount.toFixed(2)} added to ${ACCOUNT_NAMES[account]}!`);
    } catch (error) {
        console.error('Add funds failed:', error);
        els.successMessage.style.color = 'red';
        els.successMessage.textContent = 'Failed to add funds: ' + error.message;
        // alert('Failed to add funds: ' + error.message);
    } finally {
        els.depositBtn.disabled = false;
        els.depositBtn.textContent = 'Add Funds';
    }
});

// ===== TRANSFER FUNDS (FIXED: all reads before all writes) =====

function updateTransferBalances() {
    const from = els.transferFrom.value;
    const to = els.transferTo.value;

    if (from && currentBalances[from] !== undefined) {
        els.fromBalance.textContent = `Balance: ${fmtMoney(currentBalances[from])}`;
    } else {
        els.fromBalance.textContent = 'Balance: Ksh 0.00';
    }

    if (to && currentBalances[to] !== undefined) {
        els.toBalance.textContent = `Balance: ${fmtMoney(currentBalances[to])}`;
    } else {
        els.toBalance.textContent = 'Balance: Ksh 0.00';
    }

    validateTransfer();
}

function validateTransfer() {
    const from = els.transferFrom.value;
    const to = els.transferTo.value;
    const amount = Number(els.transferAmount.value) || 0;

    if (from && to && from === to) {
        els.transferInfo.textContent = 'Cannot transfer to the same account';
        els.transferInfo.className = 'transfer-info error';
        els.transferBtn.disabled = true;
        return false;
    }

    if (from && amount > 0) {
        const available = currentBalances[from] || 0;
        if (amount > available) {
            els.transferInfo.textContent = `Insufficient funds. Available: ${fmtMoney(available)}`;
            els.transferInfo.className = 'transfer-info error';
            els.transferBtn.disabled = true;
            return false;
        }
    }

    if (from && to && amount > 0) {
        els.transferInfo.textContent = `Transfer ${fmtMoney(amount)} from ${ACCOUNT_NAMES[from]} to ${ACCOUNT_NAMES[to]}`;
        els.transferInfo.className = 'transfer-info';
        els.transferBtn.disabled = false;
        return true;
    }

    els.transferInfo.textContent = '';
    els.transferBtn.disabled = true;
    return false;
}

els.transferFrom?.addEventListener('change', updateTransferBalances);
els.transferTo?.addEventListener('change', updateTransferBalances);
els.transferAmount?.addEventListener('input', validateTransfer);

els.transferForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const from = els.transferFrom.value;
    const to = els.transferTo.value;
    const amount = Number(els.transferAmount.value) || 0;
    const date = document.getElementById('transfer-date').value;

    if (!from || !to) {
        els.successMessage.style.color = 'red';
        els.successMessage.textContent = 'Please select both From and To accounts.';
        // alert('Please select both From and To accounts.');
        return;
    }

    if (from === to) {

        // alert('Cannot transfer to the same account.');
        els.successMessage.style.color = 'red';
        els.successMessage.textContent = 'Cannot transfer to the same account.';
        return;
    }

    if (amount <= 0) {
        els.successMessage.style.color = 'red';
        els.successMessage.textContent = 'Please enter a valid amount.'
        // alert('Please enter a valid amount.');
        return;
    }

    const fromBalance = currentBalances[from] || 0;
    if (amount > fromBalance) {
        els.successMessage.style.color = 'red';
        els.successMessage.textContent = `Insufficient funds in ${ACCOUNT_NAMES[from]}. Balance: ${fmtMoney(fromBalance)}`;
        // alert(`Insufficient funds in ${ACCOUNT_NAMES[from]}. Balance: ${fmtMoney(fromBalance)}`);
        return;
    }

    els.transferBtn.disabled = true;
    els.transferBtn.textContent = 'Transferring...';

    try {
        const fromRef = doc(db, 'Accounts', from);
        const toRef = doc(db, 'Accounts', to);
        const fromField = BALANCE_FIELDS[from];
        const toField = BALANCE_FIELDS[to];

        // Determine if we need income updates
        const updateFromIncome = (from === 'cash' || from === 'mpesa');
        const updateToIncome = (to === 'cash' || to === 'mpesa');
        const incomeFromRef = updateFromIncome ? doc(db, 'Income', from) : null;
        const incomeToRef = updateToIncome ? doc(db, 'Income', to) : null;

        await runTransaction(db, async (transaction) => {
            // === ALL READS FIRST ===
            const fromSnap = await transaction.get(fromRef);
            const toSnap = await transaction.get(toRef);

            const fromCurrent = fromSnap.exists() ? (Number(fromSnap.data()[fromField]) || 0) : 0;
            const toCurrent = toSnap.exists() ? (Number(toSnap.data()[toField]) || 0) : 0;

            let incomeFromCurrent = 0;
            let incomeToCurrent = 0;

            if (updateFromIncome && incomeFromRef) {
                const incomeFromSnap = await transaction.get(incomeFromRef);
                incomeFromCurrent = incomeFromSnap.exists() ? (Number(incomeFromSnap.data()[`${from}Balance`]) || 0) : 0;
            }

            if (updateToIncome && incomeToRef) {
                const incomeToSnap = await transaction.get(incomeToRef);
                incomeToCurrent = incomeToSnap.exists() ? (Number(incomeToSnap.data()[`${to}Balance`]) || 0) : 0;
            }

            // === ALL WRITES AFTER ===
            const newFromBalance = parseFloat((fromCurrent - amount).toFixed(2));
            const newToBalance = parseFloat((toCurrent + amount).toFixed(2));

            transaction.set(fromRef, {
                [fromField]: newFromBalance,
                updatedAt: Timestamp.now()
            }, { merge: true });

            transaction.set(toRef, {
                [toField]: newToBalance,
                updatedAt: Timestamp.now()
            }, { merge: true });

            if (updateFromIncome && incomeFromRef) {
                transaction.set(incomeFromRef, {
                    [`${from}Balance`]: parseFloat((incomeFromCurrent - amount).toFixed(2))
                }, { merge: true });
            }

            if (updateToIncome && incomeToRef) {
                transaction.set(incomeToRef, {
                    [`${to}Balance`]: parseFloat((incomeToCurrent + amount).toFixed(2))
                }, { merge: true });
            }

            // Log outgoing transaction
            const outTxRef = doc(collection(db, 'Transactions'));
            transaction.set(outTxRef, {
                transactionType: 'expense',
                category: 'transfer',
                subcategory: 'transfer_out',
                amount: amount,
                account: from,
                toAccount: to,
                description: `Transfer to ${ACCOUNT_NAMES[to]}`,
                date: toTimestamp(new Date(date)),
                status: 'completed'
            });

            // Log incoming transaction
            const inTxRef = doc(collection(db, 'Transactions'));
            transaction.set(inTxRef, {
                transactionType: 'income',
                category: 'transfer',
                subcategory: 'transfer_in',
                amount: amount,
                account: to,
                fromAccount: from,
                description: `Transfer from ${ACCOUNT_NAMES[from]}`,
                date: toTimestamp(new Date(date)),
                status: 'completed'
            });
        });

        closeModal(els.transferModal);
        els.transferForm.reset();
        document.getElementById('transfer-date').value = todayStr;
        els.transferInfo.textContent = '';
        els.successMessage.textContent = `Successfully transferred ${fmtMoney(amount)} from ${ACCOUNT_NAMES[from]} to ${ACCOUNT_NAMES[to]}!`
        // alert(`Successfully transferred ${fmtMoney(amount)} from ${ACCOUNT_NAMES[from]} to ${ACCOUNT_NAMES[to]}!`);
    } catch (error) {
        console.error('Transfer failed:', error);
        els.successMessage.style.color = 'red';
        els.successMessage.textContent = 'Transfer failed: ' + error.message
        // alert('Transfer failed: ' + error.message);
    } finally {
        els.transferBtn.disabled = false;
        els.transferBtn.textContent = 'Transfer';
    }
});

console.log('accounts.js loaded');
