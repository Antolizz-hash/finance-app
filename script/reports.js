import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    doc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// ===== DOM Elements =====
const els = {
    periodSelect: document.getElementById("report-period"),
    customFrom: document.getElementById("custom-range"),
    customTo: document.getElementById("custom-range-to"),
    fromDate: document.getElementById("report-from"),
    toDate: document.getElementById("report-to"),
    generateBtn: document.getElementById("generate-report"),
    incomeDisplay: document.getElementById("report-income"),
    expensesDisplay: document.getElementById("report-expenses"),
    savingsDisplay: document.getElementById("report-savings"),
    rateDisplay: document.getElementById("report-rate"),
    categoryChart: document.getElementById("category-chart"),
    categoryLegend: document.getElementById("category-legend"),
    trendChart: document.getElementById("trend-chart"),
    topCategories: document.getElementById("top-categories"),
    accountSummary: document.getElementById("account-summary"),
    insightText: document.getElementById("insight-text"),
    exportPdf: document.getElementById("export-pdf"),
    exportCsv: document.getElementById("export-csv"),
    printReport: document.getElementById("print-report"),
};

// ===== State =====
let currentReportData = null;

// ===== Date Helpers =====
function getDateRange(days) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
}

function toFirestore(date) {
    return Timestamp.fromDate(date);
}

function fmtDate(date) {
    return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(num) {
    return "Ksh. " + Number(num).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateKey(date) {
    return date.toISOString().split("T")[0];
}

function monthLabel(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-KE", { month: "short" });
}

// ===== Show/Hide Custom Range =====
els.periodSelect.addEventListener("change", () => {
    const isCustom = els.periodSelect.value === "custom";
    els.customFrom.classList.toggle("visible", isCustom);
    els.customTo.classList.toggle("visible", isCustom);
});

// ===== Fetch Expenses from Transactions =====
async function fetchExpenses(start, end) {
    const q = query(
        collection(db, "Transactions"),
        where("transactionType", "==", "expense"),
        where("date", ">=", toFirestore(start)),
        where("date", "<=", toFirestore(end)),
        orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    const txs = [];
    snap.forEach(doc => txs.push({ id: doc.id, ...doc.data() }));
    return txs;
}

// ===== Fetch Income from DailyIncome collection =====
async function fetchIncome(start, end) {
    // DailyIncome docs are named like "2026-07-25_cash" and "2026-07-25_mpesa"
    const incomeTxs = [];
    const startKey = dateKey(start);
    const endKey = dateKey(end);

    // We need to fetch all DailyIncome docs and filter client-side
    // because Firestore doesn't support range queries on document IDs easily
    const snap = await getDocs(collection(db, "DailyIncome"));

    snap.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.dateKey) return;

        // Check if dateKey is within range
        if (data.dateKey >= startKey && data.dateKey <= endKey) {
            incomeTxs.push({
                id: docSnap.id,
                ...data,
                amount: Number(data.amount) || 0,
                account: data.type || "unknown",
                date: data.addedAt,
                transactionType: "income"
            });
        }
    });

    return incomeTxs;
}

// ===== Fetch Income Transactions (from Transactions collection) =====
async function fetchIncomeTransactions(start, end) {
    // Income entries in Transactions have cashAdded/mpesaAdded instead of transactionType
    const q = query(
        collection(db, "Transactions"),
        where("addedAt", ">=", toFirestore(start)),
        where("addedAt", "<=", toFirestore(end)),
        orderBy("addedAt", "desc")
    );
    const snap = await getDocs(q);
    const incomeTxs = [];

    snap.forEach(docSnap => {
        const data = docSnap.data();
        // Only include docs that have cashAdded or mpesaAdded (income records)
        if (data.cashAdded !== undefined || data.mpesaAdded !== undefined) {
            const cash = Number(data.cashAdded) || 0;
            const mpesa = Number(data.mpesaAdded) || 0;
            incomeTxs.push({
                id: docSnap.id,
                ...data,
                amount: cash + mpesa,
                cashAdded: cash,
                mpesaAdded: mpesa,
                date: data.addedAt,
                transactionType: "income",
                account: cash > 0 && mpesa > 0 ? "mixed" : cash > 0 ? "cash" : "mpesa"
            });
        }
    });

    return incomeTxs;
}

// ===== Fetch Account Balances =====
async function fetchAccountBalances() {
    const accounts = {};
    const accountIds = ["cash", "mpesa", "savings"];

    for (const id of accountIds) {
        const snap = await getDoc(doc(db, "Accounts", id));
        if (snap.exists()) {
            const data = snap.data();
            accounts[id] = {
                balance: Number(data.cashBalance || data.mpesaBalance || data.savingsBalance || data.balance || 0),
                name: id.charAt(0).toUpperCase() + id.slice(1)
            };
        }
    }
    return accounts;
}

// ===== Build Report =====
async function buildReport() {
    const period = els.periodSelect.value;
    let start, end;

    if (period === "custom") {
        if (!els.fromDate.value || !els.toDate.value) {
            alert("Please select both From and To dates.");
            return;
        }
        start = new Date(els.fromDate.value);
        start.setHours(0, 0, 0, 0);
        end = new Date(els.toDate.value);
        end.setHours(23, 59, 59, 999);
        if (start > end) {
            alert("Start date cannot be after end date.");
            return;
        }
    } else {
        ({ start, end } = getDateRange(Number(period)));
    }

    els.generateBtn.disabled = true;
    els.generateBtn.textContent = "Generating...";

    try {
        // Fetch all data in parallel
        const [expenses, incomeFromDaily, incomeFromTxs, accountBalances] = await Promise.all([
            fetchExpenses(start, end),
            fetchIncome(start, end),
            fetchIncomeTransactions(start, end),
            fetchAccountBalances()
        ]);

        // Use DailyIncome as primary income source, fallback to Transactions
        const incomes = incomeFromDaily.length > 0 ? incomeFromDaily : incomeFromTxs;

        currentReportData = { expenses, incomes, start, end, accountBalances };

        const totalIncome = incomes.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const totalExpense = expenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const netSavings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;

        // Render Summary Cards
        els.incomeDisplay.textContent = fmtMoney(totalIncome);
        els.expensesDisplay.textContent = fmtMoney(totalExpense);
        els.savingsDisplay.textContent = fmtMoney(netSavings);
        els.savingsDisplay.style.color = netSavings >= 0 ? "var(--success)" : "var(--danger)";
        els.rateDisplay.textContent = savingsRate.toFixed(1) + "%";
        els.rateDisplay.style.color = savingsRate >= 20 ? "var(--success)" : savingsRate >= 0 ? "var(--warning)" : "var(--danger)";

        // Category Breakdown (from expenses)
        const catMap = {};
        expenses.forEach(t => {
            const cat = (t.category || "Other").toLowerCase();
            catMap[cat] = (catMap[cat] || 0) + (Number(t.amount) || 0);
        });

        const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const totalCatSpend = catEntries.reduce((s, [, v]) => s + v, 0);

        renderDonut(catEntries, totalCatSpend);
        renderCategoryLegend(catEntries, totalCatSpend);
        renderTopCategories(catEntries, totalCatSpend);

        // Monthly Trend (combine income + expenses by month)
        const monthly = {};
        expenses.forEach(t => {
            let mk;
            if (t.date && typeof t.date.toDate === "function") {
                mk = t.date.toDate().toLocaleDateString("en-KE", { month: "short" });
            } else {
                mk = new Date().toLocaleDateString("en-KE", { month: "short" });
            }
            if (!monthly[mk]) monthly[mk] = { income: 0, expense: 0 };
            monthly[mk].expense += Number(t.amount) || 0;
        });

        incomes.forEach(t => {
            let mk;
            if (t.date && typeof t.date.toDate === "function") {
                mk = t.date.toDate().toLocaleDateString("en-KE", { month: "short" });
            } else if (t.dateKey) {
                mk = monthLabel(t.dateKey);
            } else {
                mk = new Date().toLocaleDateString("en-KE", { month: "short" });
            }
            if (!monthly[mk]) monthly[mk] = { income: 0, expense: 0 };
            monthly[mk].income += Number(t.amount) || 0;
        });

        renderTrendChart(monthly);

        // Account Activity (from current balances + transaction flows)
        renderAccountSummary(accountBalances, expenses, incomes);

        // Insight
        renderInsight(catEntries, totalExpense, netSavings, savingsRate);

    } catch (err) {
        console.error("Report generation failed:", err);
        alert("Failed to generate report. Check console for details.");
    } finally {
        els.generateBtn.disabled = false;
        els.generateBtn.textContent = "Generate Report";
    }
}

// ===== Render Donut Chart (CSS conic-gradient) =====
const CAT_COLORS = {
    food: "#f97316",
    family: "#eab308",
    gas: "#ec4899",
    loan: "#ef4444",
    data: "#a855f7",
    kinyozi: "#22c55e",
    gotv: "#06b6d4",
    wifi: "#3b82f6",
    betting: "#f43f5e",
    other: "#94a3b8",
};

function getCatColor(cat) {
    return CAT_COLORS[cat] || CAT_COLORS.other;
}

function renderDonut(entries, total) {
    if (total === 0) {
        els.categoryChart.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:3rem 0">No expense data</p>`;
        return;
    }

    let currentDeg = 0;
    const segments = [];

    entries.forEach(([cat, amount]) => {
        const pct = amount / total;
        const deg = pct * 360;
        const color = getCatColor(cat);
        segments.push(`${color} ${currentDeg}deg ${currentDeg + deg}deg`);
        currentDeg += deg;
    });

    els.categoryChart.innerHTML = `
        <div class="chart-mock">
            <div class="donut-ring" style="background: conic-gradient(${segments.join(", ")});">
                <div class="donut-hole">
                    <span class="donut-total">${fmtMoney(total)}</span>
                    <span class="donut-label">Total Spent</span>
                </div>
            </div>
        </div>
    `;
}

function renderCategoryLegend(entries, total) {
    if (total === 0) {
        els.categoryLegend.innerHTML = "";
        return;
    }
    els.categoryLegend.innerHTML = entries.map(([cat, amount]) => {
        const pct = ((amount / total) * 100).toFixed(0);
        const color = getCatColor(cat);
        return `
            <div class="legend-item">
                <span class="legend-dot" style="background:${color}"></span>
                <span class="legend-name">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <span class="legend-value">${pct}%</span>
            </div>
        `;
    }).join("");
}

function renderTopCategories(entries, total) {
    const icons = {
        food: "🍽️", family: "👨‍👩‍👧", gas: "⛽", loan: "💸", data: "📱",
        kinyozi: "✂️", gotv: "📺", wifi: "📡", betting: "🎲", other: "📦"
    };

    if (total === 0) {
        els.topCategories.innerHTML = `<p style="color:var(--text-light);text-align:center;padding:1rem">No spending data</p>`;
        return;
    }

    els.topCategories.innerHTML = entries.slice(0, 5).map(([cat, amount]) => {
        const pct = ((amount / total) * 100).toFixed(0);
        const color = getCatColor(cat);
        return `
            <div class="category-row">
                <div class="category-info">
                    <span class="category-icon">${icons[cat] || "📦"}</span>
                    <div>
                        <p class="category-name">${cat.charAt(0).toUpperCase() + cat.slice(1)}</p>
                        <div class="progress-track">
                            <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
                        </div>
                    </div>
                </div>
                <span class="category-total">${fmtMoney(amount)}</span>
            </div>
        `;
    }).join("");
}

function renderTrendChart(monthly) {
    const months = Object.keys(monthly);
    if (months.length === 0) {
        els.trendChart.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:3rem 0">No trend data</p>`;
        return;
    }

    const maxVal = Math.max(...months.map(m => Math.max(monthly[m].income, monthly[m].expense)), 1);

    const barsHtml = months.map(m => {
        const incH = ((monthly[m].income / maxVal) * 100).toFixed(0);
        const expH = ((monthly[m].expense / maxVal) * 100).toFixed(0);
        return `
            <div class="bar-group">
                <div class="bar income-bar" style="height:${incH}%"></div>
                <div class="bar expense-bar" style="height:${expH}%"></div>
                <span class="bar-label">${m}</span>
            </div>
        `;
    }).join("");

    els.trendChart.innerHTML = `
        <div class="chart-mock bars">${barsHtml}</div>
        <div class="chart-legend-inline">
            <span><span class="legend-dot" style="background:var(--success)"></span> Income</span>
            <span><span class="legend-dot" style="background:var(--danger)"></span> Expenses</span>
        </div>
    `;
}

function renderAccountSummary(balances, expenses, incomes) {
    const accountIcons = {
        cash: "💵", mpesa: "📱", savings: "🏦", unknown: "🏷️"
    };

    // Calculate inflows/outflows from transactions
    const flows = {};
    expenses.forEach(t => {
        const acc = (t.account || "unknown").toLowerCase();
        if (!flows[acc]) flows[acc] = { in: 0, out: 0 };
        flows[acc].out += Number(t.amount) || 0;
    });

    incomes.forEach(t => {
        const acc = (t.account || "unknown").toLowerCase();
        if (!flows[acc]) flows[acc] = { in: 0, out: 0 };
        flows[acc].in += Number(t.amount) || 0;
    });

    // Merge with current balances
    const allAccounts = new Set([...Object.keys(balances), ...Object.keys(flows)]);

    if (allAccounts.size === 0) {
        els.accountSummary.innerHTML = `<p style="color:var(--text-light);text-align:center;padding:1rem">No account activity</p>`;
        return;
    }

    els.accountSummary.innerHTML = Array.from(allAccounts).map(acc => {
        const key = acc.toLowerCase();
        const balance = balances[key]?.balance || 0;
        const flow = flows[key] || { in: 0, out: 0 };
        const name = balances[key]?.name || acc.charAt(0).toUpperCase() + acc.slice(1);

        return `
            <div class="account-row">
                <div class="account-info">
                    <span class="account-icon">${accountIcons[key] || "🏷️"}</span>
                    <div>
                        <span class="account-name">${name}</span>
                        <span class="account-balance" style="display:block;font-size:0.8rem;color:var(--text-light)">Balance: ${fmtMoney(balance)}</span>
                    </div>
                </div>
                <div class="account-flows">
                    <span class="flow-in">+${fmtMoney(flow.in)}</span>
                    <span class="flow-out">-${fmtMoney(flow.out)}</span>
                </div>
            </div>
        `;
    }).join("");
}

function renderInsight(catEntries, totalExpense, netSavings, savingsRate) {
    let msg = "";
    if (catEntries.length > 0) {
        const top = catEntries[0];
        const topPct = ((top[1] / totalExpense) * 100).toFixed(0);
        msg = `Your highest spending category is <strong>${top[0].charAt(0).toUpperCase() + top[0].slice(1)}</strong> at ${topPct}% of total expenses.`;
    } else {
        msg = "No expense data for this period.";
    }

    if (netSavings < 0) {
        msg += ` You spent <strong>${fmtMoney(Math.abs(netSavings))}</strong> more than you earned. Consider reviewing your budget.`;
    } else if (savingsRate >= 30) {
        msg += ` Great job! You're saving <strong>${savingsRate.toFixed(0)}%</strong> of your income.`;
    } else if (savingsRate >= 10) {
        msg += ` You're saving <strong>${savingsRate.toFixed(0)}%</strong> of your income. Try to push toward 20%.`;
    } else {
        msg += ` Your savings rate is <strong>${savingsRate.toFixed(0)}%</strong>. Aim for at least 20%.`;
    }

    els.insightText.innerHTML = msg;
}

// ===== Export Functions =====
function exportToCSV() {
    if (!currentReportData) {
        alert("Generate a report first.");
        return;
    }

    const rows = [["Date", "Type", "Category/Account", "Amount", "Details"]];

    currentReportData.expenses.forEach(t => {
        let d = "N/A";
        if (t.date) {
            d = typeof t.date.toDate === "function" ? fmtDate(t.date.toDate()) : fmtDate(new Date(t.date));
        }
        rows.push([d, "Expense", t.category || "N/A", Number(t.amount || 0).toFixed(2), t.description || ""]);
    });

    currentReportData.incomes.forEach(t => {
        let d = "N/A";
        if (t.dateKey) d = t.dateKey;
        else if (t.date) d = typeof t.date.toDate === "function" ? fmtDate(t.date.toDate()) : fmtDate(new Date(t.date));
        rows.push([d, "Income", t.account || "N/A", Number(t.amount || 0).toFixed(2), ""]);
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${dateKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportToPDF() {
    window.print();
}

function printReport() {
    window.print();
}

// ===== Event Listeners =====
els.generateBtn.addEventListener("click", buildReport);
els.exportCsv.addEventListener("click", exportToCSV);
els.exportPdf.addEventListener("click", exportToPDF);
els.printReport.addEventListener("click", printReport);

// Auto-generate on page load (last 30 days)
document.addEventListener("DOMContentLoaded", () => {
    buildReport();
});
