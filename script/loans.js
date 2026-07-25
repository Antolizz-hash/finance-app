import { toTimestamp } from "./helper.js";
import { db } from './firebase.js';
import {
    collection,
    getDocs,
    doc,
    addDoc,
    setDoc,
    runTransaction,
    getDoc,
    onSnapshot,
    updateDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// ===== FULIZA FEE STRUCTURE =====
const FULIZA_TIERS = [
    { max: 100, fee: 0, graceDays: 3 },
    { max: 500, fee: 3.00, graceDays: 0 },
    { max: 1000, fee: 6.00, graceDays: 0 },
    { max: 1500, fee: 21.60, graceDays: 0 },
    { max: 2500, fee: 24.00, graceDays: 0 },
    { max: 70000, fee: 30.00, graceDays: 0 },
];

function getFulizaDailyFee(balance) {
    if (balance <= 0) return 0;
    for (const tier of FULIZA_TIERS) {
        if (balance <= tier.max) return tier.fee;
    }
    return 30.00;
}

function getGraceDays(balance) {
    return balance <= 100 ? 3 : 0;
}

// ===== DOM ELEMENTS =====
const els = {
    openPayModal: document.getElementById("openPayModalBtn"),
    closePayModal: document.getElementById("closePayModalBtn"),
    payModal: document.getElementById("payLoanModal"),
    payForm: document.getElementById("pay-loan-form"),
    payBtn: document.getElementById("payLoanButton"),
    payLoanName: document.getElementById("loanName"),
    payAmount: document.getElementById("paymentAmount"),
    payAccount: document.getElementById("paymentAccount"),
    payDate: document.getElementById("paymentDate"),
    payInfo: document.getElementById("payment-info"),

    openAddModal: document.getElementById("openAddModalBtn"),
    closeAddModal: document.getElementById("closeAddModalBtn"),
    addModal: document.getElementById("addLoanModal"),
    addForm: document.getElementById("add-loan-form"),
    addBtn: document.getElementById("addLoanButton"),
    addLoanName: document.getElementById("addLoanName"),
    bridgeFields: document.getElementById("bridge-fields"),
    fulizaFields: document.getElementById("fuliza-fields"),

    loanNumber: document.getElementById("loan-number"),
    loanBalance: document.getElementById("loan-balance"),
    upcomingPayment: document.getElementById("upcoming-payment"),
    loanTableBody: document.getElementById("loan-table-body"),
};

// Set today's date as default
const todayStr = new Date().toISOString().split("T")[0];
if (els.payDate) els.payDate.value = todayStr;

// ===== MODAL HANDLERS =====
function openModal(modal) { modal.classList.add("active"); }
function closeModal(modal) { modal.classList.remove("active"); }

els.openPayModal?.addEventListener("click", () => openModal(els.payModal));
els.closePayModal?.addEventListener("click", () => closeModal(els.payModal));
els.openAddModal?.addEventListener("click", () => openModal(els.addModal));
els.closeAddModal?.addEventListener("click", () => closeModal(els.addModal));

// Close on backdrop click
[els.payModal, els.addModal].forEach(modal => {
    modal?.addEventListener("click", (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

// ===== ADD LOAN FORM - SHOW/HIDE FIELDS =====
els.addLoanName?.addEventListener("change", () => {
    const name = els.addLoanName.value;
    els.bridgeFields.style.display = name === "Bridge" ? "block" : "none";
    els.fulizaFields.style.display = name === "Fuliza" ? "block" : "none";

    // Set defaults
    if (name === "Fuliza") {
        document.getElementById("fulizaDateTaken").value = todayStr;
        document.getElementById("fulizaLastInterestDate").value = todayStr;
    } else if (name === "Bridge") {
        document.getElementById("bridgeDateTaken").value = todayStr;
        document.getElementById("bridgeLastInterestDate").value = todayStr;
        document.getElementById("bridgeDueDate").value = todayStr;
    }
});

// ===== PAY LOAN - SHOW INFO TEXT =====
els.payLoanName?.addEventListener("change", updatePayInfo);
els.payAmount?.addEventListener("input", updatePayInfo);
els.payAccount?.addEventListener("change", updatePayInfo);

function updatePayInfo() {
    const loan = els.payLoanName.value;
    const amount = Number(els.payAmount.value) || 0;
    const account = els.payAccount.value;

    if (!loan || !amount) {
        els.payInfo.textContent = "";
        return;
    }

    if (loan === "Bridge" && account === "fuliza") {
        const fee = (amount * 0.01).toFixed(2);
        els.payInfo.textContent = `Will draw Ksh ${amount} + Ksh ${fee} access fee from Fuliza`;
        els.payInfo.style.color = "#f59e0b";
    } else if (loan === "Fuliza") {
        els.payInfo.textContent = `Will reduce Fuliza debt by Ksh ${amount}`;
        els.payInfo.style.color = "#10b981";
    } else {
        els.payInfo.textContent = `Pay Ksh ${amount} from ${account}`;
        els.payInfo.style.color = "var(--text-light)";
    }
}

// ===== ADD LOAN =====
els.addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = els.addLoanName.value;
    if (!name) { alert("Please select a loan type."); return; }

    els.addBtn.disabled = true;
    els.addBtn.textContent = "Adding...";

    try {
        if (name === "Bridge") {
            const principal = Number(document.getElementById("bridgeLoanAmount").value) || 0;
            const balance = Number(document.getElementById("bridgeLoanBalance").value) || principal;
            const dueDate = document.getElementById("bridgeDueDate").value;
            const dateTaken = document.getElementById("bridgeDateTaken").value;
            const lastInterest = document.getElementById("bridgeLastInterestDate").value;
            const interestRate = Number(document.getElementById("bridgeInterestRate").value) || 0;

            await setDoc(doc(db, "Loans", "Bridge"), {
                loanName: "Bridge",
                loanAmount: principal,
                loanBalance: balance,
                interestRate: interestRate,
                dateTaken: toTimestamp(new Date(dateTaken)),
                dueDate: toTimestamp(new Date(dueDate)),
                lastInterestDate: toTimestamp(new Date(lastInterest)),
                totalInterestAccrued: 0,
            }, { merge: true });

            alert("Bridge loan added!");
        }
        else if (name === "Fuliza") {
            const limit = Number(document.getElementById("fulizaLoanLimit").value) || 0;
            const owed = Number(document.getElementById("fulizaLoanAmount").value) || 0;
            const dateTaken = document.getElementById("fulizaDateTaken").value;
            const lastCharge = document.getElementById("fulizaLastInterestDate").value;

            await setDoc(doc(db, "Loans", "Fuliza"), {
                loanName: "Fuliza",
                loanLimit: limit,
                availableLimit: parseFloat((limit - owed).toFixed(2)),
                loanAmount: owed,
                loanBalance: owed,
                interestRate: 0,
                dateTaken: owed > 0 ? toTimestamp(new Date(dateTaken)) : null,
                dueDate: owed > 0 ? toTimestamp(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null,
                lastInterestDate: toTimestamp(new Date(lastCharge)),
                totalFeesAccrued: 0,
                totalAccessFees: 0,
                totalDrawn: owed,
                totalRepaid: 0,
            }, { merge: true });

            alert("Fuliza overdraft added!");
        }

        closeModal(els.addModal);
        els.addForm.reset();
        els.bridgeFields.style.display = "none";
        els.fulizaFields.style.display = "none";

    } catch (error) {
        console.error("Add loan failed:", error);
        alert("Failed to add loan: " + error.message);
    } finally {
        els.addBtn.disabled = false;
        els.addBtn.textContent = "Add Loan";
    }
});

// ===== PAY LOAN =====
els.payForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const loanName = els.payLoanName.value;
    const amount = Number(els.payAmount.value) || 0;
    const fromAccount = els.payAccount.value;
    const paymentDate = els.payDate.value;

    if (!loanName || amount <= 0) {
        alert("Please select a loan and enter a valid amount.");
        return;
    }

    els.payBtn.disabled = true;
    els.payBtn.textContent = "Processing...";

    try {
        if (loanName === "Bridge") {
            await payBridge(amount, fromAccount, paymentDate);
        } else if (loanName === "Fuliza") {
            await payFuliza(amount, fromAccount, paymentDate);
        }

        closeModal(els.payModal);
        els.payForm.reset();
        els.payInfo.textContent = "";

    } catch (error) {
        console.error("Payment failed:", error);
        alert("Payment failed: " + error.message);
    } finally {
        els.payBtn.disabled = false;
        els.payBtn.textContent = "Pay Loan";
    }
});

// ===== PAY BRIDGE =====
async function payBridge(amount, fromAccount, paymentDate) {
    const bridgeRef = doc(db, "Loans", "Bridge");
    const fulizaRef = doc(db, "Loans", "Fuliza");

    await runTransaction(db, async (transaction) => {
        const bridgeSnap = await transaction.get(bridgeRef);
        if (!bridgeSnap.exists()) throw new Error("Bridge loan not found!");

        const bridgeData = bridgeSnap.data();
        const currentBalance = Number(bridgeData.loanBalance) || 0;

        if (amount > currentBalance) {
            throw new Error(`Payment exceeds balance. Owed: ${currentBalance.toFixed(2)}`);
        }

        const newBridgeBalance = parseFloat((currentBalance - amount).toFixed(2));

        // If paying from Fuliza, draw from Fuliza first
        if (fromAccount === "fuliza") {
            const fulizaSnap = await transaction.get(fulizaRef);
            if (!fulizaSnap.exists()) throw new Error("Fuliza not set up!");

            const fulizaData = fulizaSnap.data();
            const fulizaLimit = Number(fulizaData.loanLimit) || 0;
            const fulizaOwed = Number(fulizaData.loanAmount) || 0;
            const available = fulizaLimit - fulizaOwed;

            // Total needed: amount + 1% access fee
            const accessFee = parseFloat((amount * 0.01).toFixed(2));
            const totalDraw = amount + accessFee;

            if (totalDraw > available) {
                throw new Error(`Fuliza limit exceeded. Available: ${available.toFixed(2)}, Needed: ${totalDraw.toFixed(2)}`);
            }

            const newFulizaOwed = parseFloat((fulizaOwed + totalDraw).toFixed(2));
            const newFulizaAvailable = parseFloat((fulizaLimit - newFulizaOwed).toFixed(2));

            const now = new Date();
            const fulizaUpdates = {
                loanAmount: newFulizaOwed,
                availableLimit: newFulizaAvailable,
                loanBalance: newFulizaOwed,
                lastDrawDate: toTimestamp(now),
                totalAccessFees: (Number(fulizaData.totalAccessFees) || 0) + accessFee,
                totalDrawn: (Number(fulizaData.totalDrawn) || 0) + amount,
            };

            if (fulizaOwed === 0) {
                fulizaUpdates.dateTaken = toTimestamp(now);
                fulizaUpdates.dueDate = toTimestamp(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
                fulizaUpdates.lastInterestDate = toTimestamp(now);
            }

            transaction.update(fulizaRef, fulizaUpdates);

            // Log Fuliza draw
            const txRef = doc(collection(db, "Transactions"));
            transaction.set(txRef, {
                transactionType: "expense",
                category: "loan",
                subcategory: "fuliza_draw",
                amount: amount,
                accessFee: accessFee,
                account: "fuliza",
                description: `Fuliza draw to pay Bridge loan`,
                date: toTimestamp(now),
                status: "completed"
            });
        }
        // If paying from Mpesa/Savings, deduct from account
        else {
            const accountRef = doc(db, "Accounts", fromAccount);
            const accSnap = await transaction.get(accountRef);
            if (!accSnap.exists()) throw new Error(`${fromAccount} account not found!`);

            const accData = accSnap.data();
            const balanceField = fromAccount === "mpesa" ? "mpesaBalance" :
                                 fromAccount === "savings" ? "savingsBalance" : "cashBalance";
            const accBalance = Number(accData[balanceField]) || 0;

            if (amount > accBalance) {
                throw new Error(`Insufficient funds in ${fromAccount}. Balance: ${accBalance.toFixed(2)}`);
            }

            transaction.update(accountRef, { [balanceField]: parseFloat((accBalance - amount).toFixed(2)) });
        }

        // Update Bridge
        transaction.update(bridgeRef, {
            loanBalance: newBridgeBalance,
            lastRepaymentDate: toTimestamp(new Date(paymentDate)),
        });

        // Log Bridge payment
        const payTxRef = doc(collection(db, "Transactions"));
        transaction.set(payTxRef, {
            transactionType: "expense",
            category: "loan",
            subcategory: "bridge_repayment",
            amount: amount,
            account: fromAccount,
            description: `Bridge loan repayment`,
            date: toTimestamp(new Date(paymentDate)),
            status: "completed"
        });
    });

    alert("Bridge loan payment successful!");
}

// ===== PAY FULIZA =====
async function payFuliza(amount, fromAccount, paymentDate) {
    const fulizaRef = doc(db, "Loans", "Fuliza");

    await runTransaction(db, async (transaction) => {
        const fulizaSnap = await transaction.get(fulizaRef);
        if (!fulizaSnap.exists()) throw new Error("Fuliza not found!");

        const fulizaData = fulizaSnap.data();
        const currentOwed = Number(fulizaData.loanAmount) || 0;
        const limit = Number(fulizaData.loanLimit) || 0;

        if (amount > currentOwed) {
            throw new Error(`Payment exceeds debt. Owed: ${currentOwed.toFixed(2)}`);
        }

        // Deduct from account
        const accountRef = doc(db, "Accounts", fromAccount);
        const accSnap = await transaction.get(accountRef);
        if (!accSnap.exists()) throw new Error(`${fromAccount} account not found!`);

        const accData = accSnap.data();
        const balanceField = fromAccount === "mpesa" ? "mpesaBalance" :
                             fromAccount === "savings" ? "savingsBalance" : "cashBalance";
        const accBalance = Number(accData[balanceField]) || 0;

        if (amount > accBalance) {
            throw new Error(`Insufficient funds in ${fromAccount}. Balance: ${accBalance.toFixed(2)}`);
        }

        const newOwed = parseFloat((currentOwed - amount).toFixed(2));
        const newAvailable = parseFloat((limit - newOwed).toFixed(2));
        const newAccBalance = parseFloat((accBalance - amount).toFixed(2));

        const now = new Date();
        const updates = {
            loanAmount: newOwed,
            availableLimit: newAvailable,
            loanBalance: newOwed,
            totalRepaid: (Number(fulizaData.totalRepaid) || 0) + amount,
            lastRepaymentDate: toTimestamp(now),
        };

        // Reset if fully paid
        if (newOwed <= 0) {
            updates.dateTaken = null;
            updates.dueDate = null;
            updates.lastInterestDate = null;
        }

        transaction.update(fulizaRef, updates);
        transaction.update(accountRef, { [balanceField]: newAccBalance });

        // Log repayment
        const txRef = doc(collection(db, "Transactions"));
        transaction.set(txRef, {
            transactionType: "expense",
            category: "loan",
            subcategory: "fuliza_repayment",
            amount: amount,
            account: fromAccount,
            description: "Fuliza repayment",
            date: toTimestamp(new Date(paymentDate)),
            status: "completed"
        });
    });

    alert("Fuliza repayment successful!");
}

// ===== SAFER BRIDGE INTEREST CALCULATION =====
async function calculateBridgeInterest(bridgeData) {
    const principal = Number(bridgeData.loanAmount) || 0;
    const loanBalance = Number(bridgeData.loanBalance) || 0;
    const dailyInterest = Number(bridgeData.interestRate) || 0;

    if (loanBalance <= 0 || dailyInterest <= 0) {
        console.log("Bridge: No interest to calculate (balance or rate is 0)");
        return loanBalance;
    }

    const lastInterestDate = bridgeData.lastInterestDate;
    if (!lastInterestDate) {
        console.log("Bridge: No lastInterestDate set, skipping.");
        return loanBalance;
    }

    // Parse lastInterestDate safely
    let lastDate;
    if (lastInterestDate.toDate) {
        lastDate = lastInterestDate.toDate();
    } else if (lastInterestDate.seconds) {
        lastDate = new Date(lastInterestDate.seconds * 1000);
    } else {
        lastDate = new Date(lastInterestDate);
    }

    // CRITICAL: Work in UTC to avoid timezone shifts
    const lastYear = lastDate.getFullYear();
    const lastMonth = lastDate.getMonth();
    const lastDay = lastDate.getDate();

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();

    // Calculate days difference using UTC dates
    const lastUtc = Date.UTC(lastYear, lastMonth, lastDay);
    const todayUtc = Date.UTC(todayYear, todayMonth, todayDay);
    const daysPassed = Math.floor((todayUtc - lastUtc) / (1000 * 60 * 60 * 24));

    console.log(`Bridge Interest Check: last=${lastYear}-${lastMonth+1}-${lastDay}, today=${todayYear}-${todayMonth+1}-${todayDay}, daysPassed=${daysPassed}`);

    if (daysPassed <= 0) {
        console.log("Bridge: No days passed, skipping interest.");
        return loanBalance;
    }

    const interestCharged = parseFloat((daysPassed * dailyInterest).toFixed(2));
    const newBalance = parseFloat((loanBalance + interestCharged).toFixed(2));

    console.log(`Bridge: Charging ${daysPassed} days × ${dailyInterest} = ${interestCharged}. New balance: ${newBalance}`);

    const loanRef = doc(db, "Loans", "Bridge");
    try {
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(loanRef);
            if (!snap.exists()) throw new Error("Bridge loan not found!");

            const liveData = snap.data();
            const liveBalance = Number(liveData.loanBalance) || 0;

            // Safety: don't charge if balance already changed
            if (liveBalance !== loanBalance) {
                console.warn(`Bridge: Balance changed (${liveBalance} vs ${loanBalance}), skipping.`);
                return;
            }

            // Extra safety: check if lastInterestDate was already updated today
            const liveLast = liveData.lastInterestDate;
            let liveLastDate;
            if (liveLast?.toDate) {
                liveLastDate = liveLast.toDate();
            } else if (liveLast?.seconds) {
                liveLastDate = new Date(liveLast.seconds * 1000);
            } else if (liveLast) {
                liveLastDate = new Date(liveLast);
            }

            if (liveLastDate) {
                const liveYear = liveLastDate.getFullYear();
                const liveMonth = liveLastDate.getMonth();
                const liveDay = liveLastDate.getDate();
                const liveUtc = Date.UTC(liveYear, liveMonth, liveDay);
                const liveDaysPassed = Math.floor((todayUtc - liveUtc) / (1000 * 60 * 60 * 24));

                if (liveDaysPassed <= 0) {
                    console.log("Bridge: Already updated today in another process, skipping.");
                    return;
                }
            }

            transaction.update(loanRef, {
                loanBalance: newBalance,
                lastInterestDate: Timestamp.fromDate(new Date(todayYear, todayMonth, todayDay, 12, 0, 0)), // noon to avoid timezone edge cases
                totalInterestAccrued: (Number(bridgeData.totalInterestAccrued) || 0) + interestCharged
            });

            console.log("Bridge: Interest applied successfully.");
        });
    } catch (error) {
        console.error("Bridge interest update failed:", error);
    }

    return newBalance;
}

// ===== SAFER FULIZA DAILY FEE =====
async function chargeFulizaDailyFee(fulizaData) {
    const currentOwed = Number(fulizaData.loanAmount) || 0;
    const limit = Number(fulizaData.loanLimit) || 0;

    if (currentOwed <= 0 || limit <= 0) return currentOwed;

    // Parse lastInterestDate safely
    let lastCharge;
    const rawLast = fulizaData.lastInterestDate;
    if (rawLast?.toDate) {
        lastCharge = rawLast.toDate();
    } else if (rawLast?.seconds) {
        lastCharge = new Date(rawLast.seconds * 1000);
    } else if (rawLast) {
        lastCharge = new Date(rawLast);
    } else {
        return currentOwed;
    }

    const lastYear = lastCharge.getFullYear();
    const lastMonth = lastCharge.getMonth();
    const lastDay = lastCharge.getDate();
    const lastUtc = Date.UTC(lastYear, lastMonth, lastDay);

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    const todayUtc = Date.UTC(todayYear, todayMonth, todayDay);

    const daysPassed = Math.floor((todayUtc - lastUtc) / (1000 * 60 * 60 * 24));

    console.log(`Fuliza Fee Check: last=${lastYear}-${lastMonth+1}-${lastDay}, today=${todayYear}-${todayMonth+1}-${todayDay}, daysPassed=${daysPassed}`);

    if (daysPassed <= 0) {
        console.log("Fuliza: No days passed, skipping fee.");
        return currentOwed;
    }

    // Grace period
    let firstDraw = null;
    const rawFirst = fulizaData.dateTaken;
    if (rawFirst?.toDate) {
        firstDraw = rawFirst.toDate();
    } else if (rawFirst?.seconds) {
        firstDraw = new Date(rawFirst.seconds * 1000);
    } else if (rawFirst) {
        firstDraw = new Date(rawFirst);
    }

    const graceDays = getGraceDays(currentOwed);
    let chargeableDays = daysPassed;

    if (graceDays > 0 && firstDraw) {
        const firstYear = firstDraw.getFullYear();
        const firstMonth = firstDraw.getMonth();
        const firstDay = firstDraw.getDate();
        const firstUtc = Date.UTC(firstYear, firstMonth, firstDay);
        const daysSinceFirst = Math.floor((todayUtc - firstUtc) / (1000 * 60 * 60 * 24));
        const graceRemaining = Math.max(0, graceDays - daysSinceFirst);
        chargeableDays = Math.max(0, daysPassed - graceRemaining);
        console.log(`Fuliza: Grace remaining=${graceRemaining}, chargeableDays=${chargeableDays}`);
    }

    if (chargeableDays <= 0) {
        console.log("Fuliza: Still in grace period, no fee.");
        return currentOwed;
    }

    const dailyFee = getFulizaDailyFee(currentOwed);
    const totalFees = parseFloat((chargeableDays * dailyFee).toFixed(2));
    const newOwed = parseFloat((currentOwed + totalFees).toFixed(2));
    const newAvailable = parseFloat((limit - newOwed).toFixed(2));

    console.log(`Fuliza: ${chargeableDays} days × ${dailyFee} = ${totalFees}. New owed: ${newOwed}`);

    const loanRef = doc(db, "Loans", "Fuliza");
    try {
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(loanRef);
            if (!snap.exists()) return;

            const liveData = snap.data();
            const liveOwed = Number(liveData.loanAmount) || 0;

            if (liveOwed !== currentOwed) {
                console.warn(`Fuliza: Balance changed (${liveOwed} vs ${currentOwed}), skipping.`);
                return;
            }

            // Extra safety: check if already updated today
            const liveRaw = liveData.lastInterestDate;
            let liveLast;
            if (liveRaw?.toDate) {
                liveLast = liveRaw.toDate();
            } else if (liveRaw?.seconds) {
                liveLast = new Date(liveRaw.seconds * 1000);
            } else if (liveRaw) {
                liveLast = new Date(liveRaw);
            }

            if (liveLast) {
                const liveYear = liveLast.getFullYear();
                const liveMonth = liveLast.getMonth();
                const liveDay = liveLast.getDate();
                const liveUtc = Date.UTC(liveYear, liveMonth, liveDay);
                const liveDays = Math.floor((todayUtc - liveUtc) / (1000 * 60 * 60 * 24));
                if (liveDays <= 0) {
                    console.log("Fuliza: Already updated today, skipping.");
                    return;
                }
            }

            transaction.update(loanRef, {
                loanAmount: newOwed,
                availableLimit: newAvailable,
                loanBalance: newOwed,
                lastInterestDate: Timestamp.fromDate(new Date(todayYear, todayMonth, todayDay, 12, 0, 0)),
                totalFeesAccrued: (Number(fulizaData.totalFeesAccrued) || 0) + totalFees
            });

            console.log("Fuliza: Fee applied successfully.");
        });
    } catch (error) {
        console.error("Fuliza fee update failed:", error);
    }

    return newOwed;
}

// ===== FORMATTERS =====
function fmtMoney(num) {
    return "Ksh " + Number(num).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(ts) {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

// ===== REALTIME LISTENER =====
const loansRef = collection(db, "Loans");

onSnapshot(loansRef, (querySnapshot) => {
    console.log("Loans updated");

    let bridgeBalance = 0;
    let fulizaBalance = 0;
    let bridgeData = null;
    let fulizaData = null;
    let activeLoans = 0;

    const tableRows = [];

    querySnapshot.forEach((document) => {
        const data = document.data();
        const name = document.id;
        const owed = Number(data.loanAmount) || 0;

        if (owed > 0) activeLoans++;

        if (name === "Bridge") {
            bridgeData = data;
            bridgeBalance = owed;

            tableRows.push(`
                <tr>
                    <td><strong>Bridge Loan</strong></td>
                    <td>${fmtMoney(data.loanAmount || 0)}</td>
                    <td>${fmtMoney(data.loanBalance || 0)}</td>
                    <td>—</td>
                    <td>${fmtDate(data.dueDate)}</td>
                </tr>
            `);

            if (owed > 0) calculateBridgeInterest(data);
        }

        if (name === "Fuliza") {
            fulizaData = data;
            fulizaBalance = owed;

            // Fix stale availableLimit
            const limit = Number(data.loanLimit) || 0;
            const correctAvailable = parseFloat((limit - owed).toFixed(2));
            if (Math.abs((data.availableLimit || 0) - correctAvailable) > 0.01) {
                updateDoc(doc(db, "Loans", "Fuliza"), { availableLimit: correctAvailable });
            }

            tableRows.push(`
                <tr>
                    <td><strong>Fuliza Overdraft</strong></td>
                    <td>${fmtMoney(limit)}</td>
                    <td>${fmtMoney(owed)}</td>
                    <td>${fmtMoney(correctAvailable)}</td>
                    <td>${fmtDate(data.dueDate)}</td>
                </tr>
            `);

            if (owed > 0) chargeFulizaDailyFee(data);
        }
    });

    // Update summary cards
    els.loanNumber.textContent = activeLoans;
    els.loanBalance.textContent = fmtMoney(bridgeBalance + fulizaBalance);

    // Upcoming payment = whichever is due sooner
    const bridgeDue = bridgeData?.dueDate?.toDate ? bridgeData.dueDate.toDate() : null;
    const fulizaDue = fulizaData?.dueDate?.toDate ? fulizaData.dueDate.toDate() : null;

    if (bridgeDue && fulizaDue) {
        els.upcomingPayment.textContent = bridgeDue < fulizaDue
            ? fmtMoney(bridgeBalance) + " (Bridge)"
            : fmtMoney(fulizaBalance) + " (Fuliza)";
    } else if (bridgeDue) {
        els.upcomingPayment.textContent = fmtMoney(bridgeBalance) + " (Bridge)";
    } else if (fulizaDue) {
        els.upcomingPayment.textContent = fmtMoney(fulizaBalance) + " (Fuliza)";
    } else {
        els.upcomingPayment.textContent = "Ksh 0";
    }

    // Update table
    els.loanTableBody.innerHTML = tableRows.length > 0
        ? tableRows.join("")
        : `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:2rem">No active loans</td></tr>`;

}, (error) => {
    console.error("Loan listener failed:", error);
});

console.log("loans.js loaded");
