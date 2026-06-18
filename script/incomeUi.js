const modalOverlay = document.getElementById('addIncomeModal');
const openModalBtn = document.getElementById('addIncomeModalBtn');
const closeModalBtn = document.getElementById('closeAddIncomeModalBtn');

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