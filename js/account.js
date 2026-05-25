// Account Page JavaScript

let allBookings = [];
let currentCancelBooking = null;

// Check authentication
function requireAuth() {
    const user = localStorage.getItem('aw_user');
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(user);
}

// Load user profile
function loadProfile() {
    const user = requireAuth();
    if (!user) return;

    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-phone').textContent = user.phone;
    document.getElementById('profile-avatar').textContent = user.name.split(' ').map(n => n[0]).join('');

    // Fill edit form
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-phone').value = user.phone;
    document.getElementById('edit-email').value = user.email || '';
}

// Load bookings
async function loadBookings() {
    const token = localStorage.getItem('aw_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('/api/bookings/my', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load bookings');
        }

        const bookings = await response.json();
        allBookings = bookings;

        displayBookings(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        document.querySelector('#bookings-list .loading-state').style.display = 'none';
        document.getElementById('no-bookings').style.display = 'block';
    }
}

// Display bookings
function displayBookings(bookings, filter = 'all') {
    const container = document.getElementById('bookings-list');
    const noBookings = document.getElementById('no-bookings');

    // Filter bookings
    let filtered = bookings;
    if (filter !== 'all') {
        filtered = bookings.filter(b => b.booking_status === filter);
    }

    container.querySelector('.loading-state')?.remove();

    if (filtered.length === 0) {
        container.innerHTML = '';
        noBookings.style.display = 'block';
        return;
    }

    noBookings.style.display = 'none';
    container.innerHTML = filtered.map(booking => createBookingCard(booking)).join('');
}

// Create booking card
function createBookingCard(booking) {
    const vehicleTypes = {
        bus: 'Bus',
        minibus: 'Mini-bus',
        taxi: 'Taxi',
        moto: 'Moto'
    };

    const statusClass = booking.booking_status === 'confirmed' ? 'confirmed' : 'cancelled';
    const statusText = booking.booking_status === 'confirmed' ? 'Confirmé' : 'Annulé';
    const canCancel = booking.booking_status === 'confirmed';

    return `
        <div class="booking-card">
            <div class="booking-header">
                <div>
                    <div style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: 0.25rem;">Code de réservation</div>
                    <div class="booking-code">${booking.booking_code}</div>
                </div>
                <div class="booking-status ${statusClass}">
                    <i class="ti ti-${statusClass === 'confirmed' ? 'check' : 'x'}"></i>
                    ${statusText}
                </div>
            </div>

            <div class="booking-route">
                <div class="route-city-large">${booking.departure}</div>
                <i class="ti ti-arrow-right route-arrow-large"></i>
                <div class="route-city-large">${booking.arrival}</div>
            </div>

            <div class="booking-details">
                <div class="booking-detail">
                    <i class="ti ti-user"></i>
                    ${booking.driver_name}
                </div>
                <div class="booking-detail">
                    <i class="ti ti-car"></i>
                    ${vehicleTypes[booking.vehicle_type]}
                </div>
                <div class="booking-detail">
                    <i class="ti ti-calendar"></i>
                    ${formatDate(booking.date)}
                </div>
                <div class="booking-detail">
                    <i class="ti ti-clock"></i>
                    ${booking.departure_time}
                </div>
                <div class="booking-detail">
                    <i class="ti ti-users"></i>
                    ${booking.passengers_count} passager${booking.passengers_count > 1 ? 's' : ''}
                </div>
                <div class="booking-detail">
                    <i class="ti ti-credit-card"></i>
                    ${getPaymentMethodName(booking.payment_method)}
                </div>
            </div>

            <div class="booking-footer">
                <div>
                    <div style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: 0.25rem;">Montant total</div>
                    <div class="booking-amount">${formatCurrency(booking.total_amount)}</div>
                    ${booking.refund_status === 'pending' ? 
                        '<div style="font-size: 0.875rem; color: var(--warning); margin-top: 0.25rem;">Remboursement en cours</div>' : 
                        booking.refund_status === 'approved' ? 
                        '<div style="font-size: 0.875rem; color: var(--success); margin-top: 0.25rem;">Remboursé: ' + formatCurrency(booking.refund_amount) + '</div>' : 
                        ''
                    }
                </div>
                <div class="booking-actions">
                    ${canCancel ? `
                        <button class="btn btn-outline" onclick="openCancelModal(${booking.id}, ${booking.total_amount})">
                            <i class="ti ti-x"></i> Annuler
                        </button>
                    ` : ''}
                    <button class="btn btn-primary">
                        <i class="ti ti-download"></i> Télécharger
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Get payment method name
function getPaymentMethodName(method) {
    const methods = {
        orange: 'Orange Money',
        wave: 'Wave',
        cash: 'Espèces'
    };
    return methods[method] || method;
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    });
});

// Booking filters
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const status = btn.dataset.status;

        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        displayBookings(allBookings, status);
    });
});

// Open cancel modal
function openCancelModal(bookingId, totalAmount) {
    currentCancelBooking = bookingId;
    
    const serviceFee = Math.round(totalAmount * 0.05);
    const refundAmount = Math.round(totalAmount * 0.8);

    document.getElementById('refund-total').textContent = formatCurrency(totalAmount);
    document.getElementById('refund-fees').textContent = formatCurrency(serviceFee);
    document.getElementById('refund-amount').textContent = formatCurrency(refundAmount);

    document.getElementById('cancel-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close cancel modal
function closeCancelModal() {
    document.getElementById('cancel-modal').classList.remove('show');
    document.body.style.overflow = '';
    currentCancelBooking = null;
    document.getElementById('cancel-reason').value = '';
}

// Cancel booking form
document.getElementById('cancel-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const reason = document.getElementById('cancel-reason').value;
    const token = localStorage.getItem('aw_token');

    if (!reason.trim()) {
        showToast('Veuillez indiquer une raison', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="ti ti-loader"></i> Annulation...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`/api/bookings/${currentCancelBooking}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Réservation annulée avec succès', 'success');
            closeCancelModal();
            loadBookings(); // Reload bookings
        } else {
            showToast(data.error || 'Erreur lors de l\'annulation', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showToast('Erreur de connexion', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Profile form
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;

    showToast('Profil mis à jour avec succès', 'success');

    // Update local storage
    const user = JSON.parse(localStorage.getItem('aw_user'));
    user.name = name;
    user.email = email;
    localStorage.setItem('aw_user', JSON.stringify(user));

    loadProfile();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('aw_user');
        localStorage.removeItem('aw_token');
        window.location.href = 'index.html';
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadBookings();
});
