// Add Account modal controls
const addAccountModal = document.getElementById('addAccountModal');
const openAddAccountModalBtn = document.getElementById('openAddAccountModalBtn');
const closeAddAccountModalBtn = document.getElementById('closeAddAccountModalBtn');

openAddAccountModalBtn?.addEventListener('click', () => {
  addAccountModal.style.display = 'flex';
});

closeAddAccountModalBtn?.addEventListener('click', () => {
  addAccountModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === addAccountModal) {
    addAccountModal.style.display = 'none';
  }
});

// Add Funds modal controls
const addFundsModal = document.getElementById('addFundsModal');
const addFundsBtn = document.getElementById('openPayModalBtn');
const closeAddFundsModalBtn = document.getElementById('closeAddFundsModalBtn');

addFundsBtn?.addEventListener('click', () => {
  addFundsModal.style.display = 'flex';
});

closeAddFundsModalBtn?.addEventListener('click', () => {
  addFundsModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === addFundsModal) {
    addFundsModal.style.display = 'none';
  }
});
