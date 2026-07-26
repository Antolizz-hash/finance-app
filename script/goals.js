import { db } from './firebase.js';
import { toTimestamp } from "./helper.js";
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    runTransaction,
    onSnapshot,
    getDoc,
    Timestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// ===== DOM Elements =====
const els = {
    activeGoals: document.getElementById('active-goals'),
    totalSaved: document.getElementById('total-saved'),
    completedGoals: document.getElementById('completed-goals'),
    goalsGrid: document.getElementById('goals-grid'),
    fab: document.getElementById('openAddGoalModal'),
    addGoalModal: document.getElementById('addGoalModal'),
    closeAddGoalModal: document.getElementById('closeAddGoalModal'),
    addGoalForm: document.getElementById('add-goal-form'),
    addGoalBtn: document.getElementById('addGoalBtn'),
    addFundsModal: document.getElementById('addFundsModal'),
    closeAddFundsModal: document.getElementById('closeAddFundsModal'),
    addFundsForm: document.getElementById('add-funds-form'),
    addFundsBtn: document.getElementById('addFundsBtn'),
    fundGoalName: document.getElementById('fund-goal-name'),
    fundGoalId: document.getElementById('fund-goal-id'),
};

// ===== Category Icons =====
const CATEGORY_ICONS = {
    emergency: '🚨',
    vacation: '✈️',
    gadget: '💻',
    education: '🎓',
    business: '💼',
    home: '🏠',
    other: '📦'
};

// ===== Formatters =====
function fmtMoney(num) {
    return 'Ksh. ' + Number(num).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(ts) {
    if (!ts) return 'No deadline';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(ts) {
    if (!ts) return null;
    const deadline = ts.toDate ? ts.toDate() : new Date(ts);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

// ===== Modal Handlers =====
function openModal(modal) { modal?.classList.add('active'); }
function closeModal(modal) { modal?.classList.remove('active'); }

els.fab?.addEventListener('click', () => openModal(els.addGoalModal));
els.closeAddGoalModal?.addEventListener('click', () => closeModal(els.addGoalModal));
els.closeAddFundsModal?.addEventListener('click', () => closeModal(els.addFundsModal));

[els.addGoalModal, els.addFundsModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
});

// ===== Add Goal =====
els.addGoalForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('goal-name').value.trim();
    const category = document.getElementById('goal-category').value;
    const target = Number(document.getElementById('goal-target').value) || 0;
    const deadline = document.getElementById('goal-deadline').value;
    const initial = Number(document.getElementById('goal-initial').value) || 0;

    if (!name || target <= 0) {
        alert('Please enter a goal name and target amount.');
        return;
    }

    els.addGoalBtn.disabled = true;
    els.addGoalBtn.textContent = 'Creating...';

    try {
        const goalData = {
            goalName: name,
            category: category,
            targetAmount: target,
            currentAmount: initial,
            deadline: deadline ? toTimestamp(new Date(deadline)) : null,
            createdAt: Timestamp.now(),
            completed: initial >= target
        };

        await addDoc(collection(db, 'Goals'), goalData);

        closeModal(els.addGoalModal);
        els.addGoalForm.reset();
    } catch (error) {
        console.error('Failed to create goal:', error);
        alert('Failed to create goal: ' + error.message);
    } finally {
        els.addGoalBtn.disabled = false;
        els.addGoalBtn.textContent = 'Create Goal';
    }
});

// ===== Add Funds to Goal =====
els.addFundsForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const goalId = els.fundGoalId.value;
    const amount = Number(document.getElementById('fund-amount').value) || 0;
    const source = document.getElementById('fund-source').value;

    if (!goalId || amount <= 0) {
        alert('Please enter a valid amount.');
        return;
    }

    els.addFundsBtn.disabled = true;
    els.addFundsBtn.textContent = 'Adding...';

    try {
        await runTransaction(db, async (transaction) => {
            const goalRef = doc(db, 'Goals', goalId);
            const accountRef = doc(db, 'Accounts', source);

            const goalSnap = await transaction.get(goalRef);
            const accountSnap = await transaction.get(accountRef);

            if (!goalSnap.exists()) throw new Error('Goal not found!');
            if (!accountSnap.exists()) throw new Error(`${source} account not found!`);

            const goalData = goalSnap.data();
            const accountData = accountSnap.data();

            const balanceField = source === 'mpesa' ? 'mpesaBalance' :
                                 source === 'savings' ? 'savingsBalance' : 'cashBalance';
            const accountBalance = Number(accountData[balanceField]) || 0;

            if (amount > accountBalance) {
                throw new Error(`Insufficient funds in ${source}. Balance: ${fmtMoney(accountBalance)}`);
            }

            const newGoalAmount = (Number(goalData.currentAmount) || 0) + amount;
            const newAccountBalance = parseFloat((accountBalance - amount).toFixed(2));
            const isCompleted = newGoalAmount >= (Number(goalData.targetAmount) || 0);

            transaction.update(goalRef, {
                currentAmount: newGoalAmount,
                completed: isCompleted,
                completedAt: isCompleted && !goalData.completed ? Timestamp.now() : goalData.completedAt || null
            });

            transaction.update(accountRef, { [balanceField]: newAccountBalance });

            const txRef = doc(collection(db, 'Transactions'));
            transaction.set(txRef, {
                transactionType: 'expense',
                category: 'goal',
                subcategory: 'goal_contribution',
                amount: amount,
                account: source,
                goalId: goalId,
                goalName: goalData.goalName,
                description: `Contribution to ${goalData.goalName}`,
                date: Timestamp.now(),
                status: 'completed'
            });
        });

        closeModal(els.addFundsModal);
        els.addFundsForm.reset();
    } catch (error) {
        console.error('Failed to add funds:', error);
        alert('Failed to add funds: ' + error.message);
    } finally {
        els.addFundsBtn.disabled = false;
        els.addFundsBtn.textContent = 'Add Funds';
    }
});

// ===== Delete Goal =====
async function deleteGoal(goalId) {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
        await deleteDoc(doc(db, 'Goals', goalId));
    } catch (error) {
        console.error('Failed to delete goal:', error);
        alert('Failed to delete goal.');
    }
}

// ===== Open Add Funds Modal =====
function openAddFunds(goalId, goalName) {
    console.log('Opening add funds for:', goalId, goalName);
    els.fundGoalId.value = goalId;
    els.fundGoalName.textContent = goalName || 'Goal';
    openModal(els.addFundsModal);
}

// ===== Render Goals =====
function renderGoals(goals) {
    console.log('Rendering goals:', goals.length);

    if (!goals || goals.length === 0) {
        els.goalsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <h3>No goals yet</h3>
                <p>Click the + button to create your first savings goal</p>
            </div>
        `;
        return;
    }

    els.goalsGrid.innerHTML = goals.map(g => {
        const target = Number(g.targetAmount) || 0;
        const current = Number(g.currentAmount) || 0;
        const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
        const isCompleted = g.completed || current >= target;
        const icon = CATEGORY_ICONS[g.category] || '📦';
        const daysLeft = daysUntil(g.deadline);

        let progressClass = '';
        if (pct < 25) progressClass = 'danger';
        else if (pct < 60) progressClass = 'warning';

        let deadlineText = 'No deadline';
        let deadlineClass = '';
        if (daysLeft !== null) {
            if (daysLeft < 0) {
                deadlineText = `Overdue by ${Math.abs(daysLeft)} days`;
                deadlineClass = 'urgent';
            } else if (daysLeft === 0) {
                deadlineText = 'Due today';
                deadlineClass = 'urgent';
            } else if (daysLeft === 1) {
                deadlineText = '1 day left';
                deadlineClass = 'urgent';
            } else {
                deadlineText = `${daysLeft} days left`;
            }
        }

        // Build the action section
        let actionHtml = '';
        if (!isCompleted) {
            actionHtml = `
                <div class="goal-actions">
                    <button class="btn-add-funds" data-goal-id="${g.id}" data-goal-name="${(g.goalName || '').replace(/"/g, '&quot;')}">
                        + Add Funds
                    </button>
                </div>
            `;
        } else {
            actionHtml = `<div class="goal-completed-msg">🎉 Goal Achieved!</div>`;
        }

        return `
            <div class="goal-card ${isCompleted ? 'completed' : ''}" data-goal-id="${g.id}">
                <div class="goal-header">
                    <div class="goal-icon">${icon}</div>
                    <button class="goal-menu" data-delete-id="${g.id}" title="Delete goal">🗑️</button>
                </div>
                <div>
                    <div class="goal-name">${g.goalName || 'Unnamed Goal'}</div>
                    <div class="goal-category">${g.category || 'other'}</div>
                </div>
                <div class="goal-amounts">
                    <span class="goal-saved">${fmtMoney(current)}</span>
                    <span class="goal-target">of ${fmtMoney(target)}</span>
                </div>
                <div class="goal-progress">
                    <div class="goal-progress-fill ${progressClass}" style="width: ${pct}%"></div>
                </div>
                <div class="goal-meta">
                    <span>${pct.toFixed(0)}% saved</span>
                    <span class="goal-deadline ${deadlineClass}">⏰ ${deadlineText}</span>
                </div>
                ${actionHtml}
            </div>
        `;
    }).join('');

    // Attach event listeners after rendering
    attachGoalCardListeners();
}

function attachGoalCardListeners() {
    // Add Funds buttons
    document.querySelectorAll('.btn-add-funds').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const goalId = e.target.dataset.goalId;
            const goalName = e.target.dataset.goalName;
            console.log('Add funds clicked:', goalId, goalName);
            openAddFunds(goalId, goalName);
        });
    });

    // Delete buttons
    document.querySelectorAll('.goal-menu').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const goalId = e.target.dataset.deleteId;
            console.log('Delete clicked:', goalId);
            deleteGoal(goalId);
        });
    });
}

// ===== Realtime Listener =====
const goalsQuery = query(collection(db, 'Goals'), orderBy('createdAt', 'desc'));

onSnapshot(goalsQuery, (snapshot) => {
    const goals = [];
    let totalSaved = 0;
    let activeCount = 0;
    let completedCount = 0;

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const current = Number(data.currentAmount) || 0;
        const isCompleted = data.completed || current >= (Number(data.targetAmount) || 0);

        goals.push({ id: docSnap.id, ...data });
        totalSaved += current;
        if (isCompleted) completedCount++;
        else activeCount++;
    });

    if (els.activeGoals) els.activeGoals.textContent = activeCount;
    if (els.totalSaved) els.totalSaved.textContent = fmtMoney(totalSaved);
    if (els.completedGoals) els.completedGoals.textContent = completedCount;

    renderGoals(goals);
}, (error) => {
    console.error('Goals listener failed:', error);
});

console.log('goals.js loaded');
