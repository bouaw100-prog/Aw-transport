// AW Transport - Main JavaScript

// Counter Animation for Stats
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;
    
    const updateCounter = () => {
        current += increment;
        if (current < target) {
            element.textContent = Math.floor(current).toLocaleString();
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target.toLocaleString();
        }
    };
    
    updateCounter();
}

// Intersection Observer for Stats
const observeStats = () => {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => observer.observe(stat));
};

// Quick Search Form
const quickSearchForm = document.getElementById('quick-search-form');
if (quickSearchForm) {
    quickSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const departure = document.getElementById('quick-departure').value;
        const arrival = document.getElementById('quick-arrival').value;
        const date = document.getElementById('quick-date').value;
        
        if (!departure || !arrival || !date) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        // Redirect to search page with parameters
        window.location.href = `search.html?departure=${departure}&arrival=${arrival}&date=${date}`;
    });
}

// Set minimum date to today
const dateInputs = document.querySelectorAll('input[type="date"]');
const today = new Date().toISOString().split('T')[0];
dateInputs.forEach(input => {
    input.setAttribute('min', today);
    if (!input.value) {
        input.value = today;
    }
});

// Mobile Navigation Toggle
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.querySelector('.nav-menu');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Check Authentication Status
function checkAuth() {
    const user = localStorage.getItem('aw_user');
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    
    if (user && navLogin && navRegister) {
        const userData = JSON.parse(user);
        navLogin.textContent = userData.name;
        navLogin.href = 'account.html';
        navRegister.textContent = 'Déconnexion';
        navRegister.href = '#';
        navRegister.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Logout Function
function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('aw_user');
        localStorage.removeItem('aw_token');
        window.location.href = 'index.html';
    }
}

// Show Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="ti ti-${type === 'success' ? 'check' : 'alert-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

// Format Date
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    observeStats();
});

// Add CSS for Toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 10000;
        max-width: 400px;
    }
    
    .toast.show {
        transform: translateX(0);
    }
    
    .toast-success {
        border-left: 4px solid var(--success);
    }
    
    .toast-success i {
        color: var(--success);
        font-size: 1.5rem;
    }
    
    .toast-error {
        border-left: 4px solid var(--danger);
    }
    
    .toast-error i {
        color: var(--danger);
        font-size: 1.5rem;
    }
    
    .toast span {
        color: var(--gray-900);
        font-weight: 500;
    }
    
    @media (max-width: 480px) {
        .toast {
            bottom: 1rem;
            right: 1rem;
            left: 1rem;
            max-width: none;
        }
    }
`;
document.head.appendChild(toastStyles);
