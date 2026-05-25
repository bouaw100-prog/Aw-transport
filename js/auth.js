// Authentication JavaScript

// Toggle Password Visibility
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        const input = button.previousElementSibling;
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('ti-eye');
            icon.classList.add('ti-eye-off');
        } else {
            input.type = 'password';
            icon.classList.remove('ti-eye-off');
            icon.classList.add('ti-eye');
        }
    });
});

// Password Strength Checker
const passwordInput = document.getElementById('password');
const passwordStrength = document.getElementById('password-strength');

if (passwordInput && passwordStrength) {
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        let strength = 0;
        
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;
        
        passwordStrength.className = 'password-strength';
        
        if (strength <= 2) {
            passwordStrength.classList.add('weak');
        } else if (strength <= 4) {
            passwordStrength.classList.add('medium');
        } else {
            passwordStrength.classList.add('strong');
        }
    });
}

// Format Phone Number
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (!value.startsWith('221')) {
        value = '221' + value;
    }
    
    value = value.substring(0, 11);
    
    let formatted = '+221';
    if (value.length > 3) {
        formatted += ' ' + value.substring(3, 5);
    }
    if (value.length > 5) {
        formatted += ' ' + value.substring(5, 8);
    }
    if (value.length > 8) {
        formatted += ' ' + value.substring(8, 11);
    }
    
    input.value = formatted;
}

// Auto-format phone inputs
document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', () => formatPhoneNumber(input));
    input.addEventListener('blur', () => formatPhoneNumber(input));
});

// Login Form
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Validate
        if (!phone || !password) {
            showToast('Veuillez remplir tous les champs', 'error');
            return;
        }
        
        // Show loading
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="ti ti-loader"></i> Connexion...';
        submitBtn.disabled = true;
        
        try {
            // Call API
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Save user data
                localStorage.setItem('aw_user', JSON.stringify(data.user));
                localStorage.setItem('aw_token', data.token);
                
                if (remember) {
                    localStorage.setItem('aw_remember', 'true');
                }
                
                showToast('Connexion réussie !', 'success');
                
                // Redirect
                setTimeout(() => {
                    window.location.href = 'account.html';
                }, 1000);
            } else {
                showToast(data.error || 'Identifiants incorrects', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            showToast('Erreur de connexion. Veuillez réessayer.', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Register Form
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const terms = document.getElementById('terms').checked;
        
        // Validate
        if (!name || !phone || !password || !confirmPassword) {
            showToast('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showToast('Les mots de passe ne correspondent pas', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Le mot de passe doit contenir au moins 6 caractères', 'error');
            return;
        }
        
        if (!terms) {
            showToast('Veuillez accepter les conditions générales', 'error');
            return;
        }
        
        // Show loading
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="ti ti-loader"></i> Création du compte...';
        submitBtn.disabled = true;
        
        try {
            // Call API
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, phone, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Save user data
                localStorage.setItem('aw_user', JSON.stringify(data.user));
                localStorage.setItem('aw_token', data.token);
                
                showToast('Compte créé avec succès !', 'success');
                
                // Redirect
                setTimeout(() => {
                    window.location.href = 'account.html';
                }, 1000);
            } else {
                showToast(data.error || 'Erreur lors de la création du compte', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            showToast('Erreur de connexion. Veuillez réessayer.', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Add loader animation CSS
const loaderStyles = document.createElement('style');
loaderStyles.textContent = `
    .ti-loader {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(loaderStyles);
