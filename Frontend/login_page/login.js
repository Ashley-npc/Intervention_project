const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const message = document.getElementById('message');
const togglePasswordButton = document.getElementById('togglePassword');

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

togglePasswordButton.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePasswordButton.textContent = isPassword ? 'Cacher' : 'Afficher';
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage('Veuillez remplir tous les champs.', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showMessage('Veuillez saisir une adresse email valide.', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage('Le mot de passe doit contenir au moins 6 caractères.', 'error');
    return;
  }

  showMessage('Connexion réussie ! Redirection en cours...', 'success');

  setTimeout(() => {
    alert('Bienvenue ! Vous êtes connecté.');
  }, 800);
});
