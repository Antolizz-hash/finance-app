
const modalOverlay = document.getElementById('payLoanModal');
const openModalBtn = document.getElementById('openPayModalBtn');
const closeModalBtn = document.getElementById('closePayModalBtn');

// Open pop-up wrapper
openModalBtn.addEventListener('click', () => {
  modalOverlay.style.display = 'flex';
});

// Close pop-up wrapper using 'X'
closeModalBtn.addEventListener('click', () => {
  modalOverlay.style.display = 'none';
});

// Close pop-up window if clicking anywhere outside the form box boundary
window.addEventListener('click', (event) => {
  if (event.target === modalOverlay) {
    modalOverlay.style.display = 'none';
  }
});

// Target elements for the Add Loan modal
const addLoanModal = document.getElementById('addLoanModal');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeAddModalBtn = document.getElementById('closeAddModalBtn');

// Open the Add Loan pop-up
openAddModalBtn.addEventListener('click', () => {
  addLoanModal.style.display = 'flex';
});

// Close the Add Loan pop-up using 'X'
closeAddModalBtn.addEventListener('click', () => {
  addLoanModal.style.display = 'none';
});

// Close the Add Loan pop-up if clicking outside the white box boundary
window.addEventListener('click', (event) => {
  if (event.target === addLoanModal) {
    addLoanModal.style.display = 'none';
  }
});