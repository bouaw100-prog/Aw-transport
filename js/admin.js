// Admin Dashboard JavaScript

let currentEditTripId = null;

// Check admin authentication
function requireAdminAuth() {
    const user = localStorage.getItem('aw_user');
    const token = localStorage.getItem('aw_token');
    
    if (!user || !token) {
        window.location.href = 'login.html?redirect=admin';
        return null;
    }
    
    const userData = JSON.parse(user);
    if (userData.role !== 'admin') {
        alert('Accès refusé. Vous devez être administrateur.');
        window.location.href = 'index.html';
        return null;
    }
    
    return { user: userData, token };
}

// Load admin profile
function loadAdminProfile() {
    const auth = requireAdminAuth();
    if (!auth) return;
    
    document.getElementById('admin-name').textContent = auth.user.name;
}

// Sidebar navigation
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        
        // Update active link
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Show section
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${section}-section`).classList.add('active');
        
        // Load section data
        loadSectionData(section);
    });
});

// Load section data
function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboardStats();
            loadRecentActivity();
            break;
        case 'trips':
            loadAllTrips();
            break;
        case 'bookings':
            loadAllBookings();
            break;
        case 'refunds':
            loadAllRefunds();
            break;
        case 'clients':
            loadAllClients();
            break;
    }
}

// Load dashboard stats
async function loadDashboardStats() {
    const auth = requireAdminAuth();
    if (!auth) return;
    
    try {
        const response = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        
        if (!response.ok) {
            // Fallback to basic stats
            const statsResponse = await fetch('/api/stats');
            const stats = await statsResponse.json();
            
            document.getElementById('total-bookings').textContent = stats.total_bookings || 0;
            document.getElementById('total-revenue').textContent = formatCurrency(stats.total_revenue || 0);
            document.getElementById('total-trips').textContent = stats.available_trips || 0;
            return;
        }
        
        const stats = await response.json();
        
        document.getElementById('total-bookings').textContent = stats.total_bookings || 0;
        document.getElementById('total-revenue').textContent = formatCurrency(stats.total_revenue || 0);
        document.getElementById('total-clients').textContent = stats.total_clients || 0;
        document.getElementById('total-trips').textContent = stats.total_trips || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    const container = document.getElementById('recent-activity');
    const auth = requireAdminAuth();
    if (!auth) return;
    
    try {
        const response = await fetch('/api/admin/bookings?limit=5', {
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load activity');
        
        const bookings = await response.json();
        
        if (bookings.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Aucune activité récente</p>';
            return;
        }
        
        container.innerHTML = bookings.map(booking => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="ti ti-ticket"></i>
                </div>
                <div class="activity-content">
                    <h4>Nouvelle réservation - ${booking.booking_code}</h4>
                    <p>${booking.passenger_name} a réservé ${booking.passengers_count} place(s) pour ${booking.departure} → ${booking.arrival}</p>
                    <span class="activity-time">${formatDate(booking.created_at)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading activity:', error);
        container.innerHTML = '<p style="text-align: center; color: var(--danger);">Erreur de chargement</p>';
    }
}

// Load all trips
async function loadAllTrips() {
    const container = document.getElementById('trips-list');
    const auth = requireAdminAuth();
    if (!auth) return;
    
    try {
        const response = await fetch('/api/trips');
        const trips = await response.json();
        
        if (trips.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Aucun trajet. Cliquez sur "Ajouter un trajet" pour commencer.</p>';
            return;
        }
        
        container.innerHTML = trips.map(trip => createTripCard(trip)).join('');
    } catch (error) {
        console.error('Error loading trips:', error);
        container.innerHTML = '<p style="text-align: center; color: var(--danger);">Erreur de chargement</p>';
    }
}

// Create trip card
function createTripCard(trip) {
    const vehicleTypes = {
        bus: { name: 'Bus', icon: 'ti-bus' },
        minibus: { name: 'Mini-bus', icon: 'ti-car' },
        taxi: { name: 'Taxi', icon: 'ti-car-suv' },
        moto: { name: 'Moto', icon: 'ti-motorbike' }
    };
    
    const vehicle = vehicleTypes[trip.vehicle_type];
    
    return `
        <div class="trip-card">
            <div class="trip-header">
                <div>
                    <div class="trip-route-display">
                        <span>${trip.departure}</span>
                        <i class="ti ti-arrow-right" style="color: var(--brand-gold);"></i>
                        <span>${trip.arrival}</span>
                    </div>
                </div>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editTrip(${trip.id})" title="Modifier">
                        <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteTrip(${trip.id})" title="Supprimer">
                        <i class="ti ti-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="trip-details-grid">
                <div class="trip-detail">
                    <i class="ti ti-user"></i>
                    ${trip.driver_name}
                </div>
                <div class="trip-detail">
                    <i class="ti ti-phone"></i>
                    ${trip.driver_phone}
                </div>
                <div class="trip-detail">
                    <i class="ti ${vehicle.icon}"></i>
                    ${vehicle.name}
                </div>
                <div class="trip-detail">
                    <i class="ti ti-calendar"></i>
                    ${formatDate(trip.date)}
                </div>
                <div class="trip-detail">
                    <i class="ti ti-clock"></i>
                    ${trip.departure_time}
                </div>
                <div class="trip-detail">
                    <i class="ti ti-cash"></i>
                    ${formatCurrency(trip.price)}
                </div>
                <div class="trip-detail">
                    <i class="ti ti-armchair"></i>
                    ${trip.seats_available}/${trip.seats_total} places
                </div>
                <div class="trip-detail">
                    <i class="ti ti-map-pin"></i>
                    ${trip.driver_address}
                </div>
            </div>
        </div>
    `;
}

// Load all bookings
async function loadAllBookings() {
    const tbody = document.getElementById('bookings-tbody');
    const auth = requireAdminAuth();
    if (!auth) return;
    
    try {
        const response = await fetch('/api/admin/bookings', {
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load bookings');
        
        const bookings = await response.json();
        
        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--gray-500);">Aucune réservation</td></tr>';
            return;
        }
        
        tbody.innerHTML = bookings.map(booking => `
            <tr>
                <td><strong>${booking.booking_code}</strong></td>
                <td>
                    <div>${booking.passenger_name}</div>
                    <small style="color: var(--gray-500);">${booking.passenger_phone}</small>
                </td>
                <td>${booking.departure} → ${booking.arrival}</td>
                <td>${formatDate(booking.date)}</td>
                <td>${booking.passengers_count}</td>
                <td><strong>${formatCurrency(booking.total_amount)}</strong></td>
                <td>
                    <span class="badge ${booking.booking_status === 'confirmed' ? 'success' : 'danger'}">
                        ${booking.booking_status === 'confirmed' ? 'Confirmé' : 'Annulé'}
                    </span>
                </td>
                <td>
                    <button class="btn-icon edit" onclick="viewBookingDetails(${booking.id})" title="Détails">
                        <i class="ti ti-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading bookings:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--danger);">Erreur de chargement</td></tr>';
    }
}

// Load all refunds
async function loadAllRefunds() {
    const tbody = document.getElementById('refunds-tbody');
    const auth = requireAdminAuth();
    if (!auth) return;
    
    try {
        const response = await fetch('/api/admin/cancellations', {
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load refunds');
        
        const refunds = await response.json();
        
        if (refunds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--gray-500);">Aucune demande de remboursement</td></tr>';
            return;
        }
        
        tbody.innerHTML = refunds.map(refund => `
            <tr>
                <td><strong>${refund.booking_code}</strong></td>
                <td>
                    <div>${refund.user_name}</div>
                    <small style="color: var(--gray-500);">${refund.user_phone}</small>
                </td>
                <td>${refund.reason || 'Non spécifiée'}</td>
                <td><strong>${formatCurrency(refund.refund_amount)}</strong></td>
                <td>${formatDate(refund.created_at)}</td>
                <td>
                    <span class="badge ${
                        refund.refund_status === 'pending' ? 'pending' : 
                        refund.refund_status === 'approved' ? 'success' : 'danger'
                    }">
                        ${
                            refund.refund_status === 'pending' ? 'En attente' :
                            refund.refund_status === 'approved' ? 'Approuvé' : 'Refusé'
                        }
                    </span>
                </td>
                <td>
                    ${refund.refund_status === 'pending' ? `
                        <div class="action-btns">
                            <button class="btn-icon approve" onclick="processRefund(${refund.id}, 'approved')" title="Approuver">
                                <i class="ti ti-check"></i>
                            </button>
                            <button class="btn-icon reject" onclick="processRefund(${refund.id}, 'rejected')" title="Refuser">
                                <i class="ti ti-x"></i>
                            </button>
                        </div>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading refunds:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Erreur de chargement</td></tr>';
    }
}

// Load all clients
async function loadAllClients() {
    const tbody = document.getElementById('clients-tbody');
    const auth = requireAdminAuth();
    if (!auth) return;
    
    // For now, show message that this feature needs backend endpoint
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray-500);">Fonctionnalité en cours de développement</td></tr>';
}

// Open trip modal
document.getElementById('add-trip-btn').addEventListener('click', () => {
    currentEditTripId = null;
    document.getElementById('trip-modal-title').textContent = 'Ajouter un trajet';
    document.getElementById('trip-form').reset();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trip-date').setAttribute('min', today);
    
    document.getElementById('trip-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
});

// Close trip modal
function closeTripModal() {
    document.getElementById('trip-modal').classList.remove('show');
    document.body.style.overflow = '';
    currentEditTripId = null;
}

// Trip form submit
document.getElementById('trip-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const auth = requireAdminAuth();
    if (!auth) return;
    
    const formData = {
        driver_name: document.getElementById('driver-name').value,
        driver_phone: document.getElementById('driver-phone').value,
        driver_address: document.getElementById('driver-address').value,
        vehicle_type: document.getElementById('vehicle-type').value,
        departure: document.getElementById('departure').value,
        arrival: document.getElementById('arrival').value,
        date: document.getElementById('trip-date').value,
        departure_time: document.getElementById('departure-time').value,
        arrival_time: document.getElementById('arrival-time').value || null,
        price: parseInt(document.getElementById('price').value),
        seats: parseInt(document.getElementById('seats').value)
    };
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="ti ti-loader"></i> Enregistrement...';
    submitBtn.disabled = true;
    
    try {
        const url = currentEditTripId ? `/api/trips/${currentEditTripId}` : '/api/trips';
        const method = currentEditTripId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(currentEditTripId ? 'Trajet modifié avec succès' : 'Trajet ajouté avec succès', 'success');
            closeTripModal();
            loadAllTrips();
        } else {
            showToast(data.error || 'Erreur lors de l\'enregistrement', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showToast('Erreur de connexion', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Edit trip
async function editTrip(tripId) {
    try {
        const response = await fetch(`/api/trips/${tripId}`);
        const trip = await response.json();
        
        currentEditTripId = tripId;
        document.getElementById('trip-modal-title').textContent = 'Modifier le trajet';
        
        document.getElementById('driver-name').value = trip.driver_name;
        document.getElementById('driver-phone').value = trip.driver_phone;
        document.getElementById('driver-address').value = trip.driver_address;
        document.getElementById('vehicle-type').value = trip.vehicle_type;
        document.getElementById('departure').value = trip.departure;
        document.getElementById('arrival').value = trip.arrival;
        document.getElementById('trip-date').value = trip.date;
        document.getElementById('departure-time').value = trip.departure_time;
        document.getElementById('arrival-time').value = trip.arrival_time || '';
        document.getElementById('price').value = trip.price;
        document.getElementById('seats').value = trip.seats_total;
        
        document.getElementById('trip-modal').classList.add('show');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        showToast('Erreur lors du chargement du trajet', 'error');
    }
}

// Delete trip
async function deleteTrip(tripId) {
    if (!confirm('Voulez-vous vraiment supprimer ce trajet ?')) return;
    
    const auth = requireAdminAuth();
    if (!auth) return;
    
    try {
        const response = await fetch(`/api/trips/${tripId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        
        if (response.ok) {
            showToast('Trajet supprimé avec succès', 'success');
            loadAllTrips();
        } else {
            showToast('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        showToast('Erreur de connexion', 'error');
    }
}

// Process refund
async function processRefund(refundId, status) {
    const auth = requireAdminAuth();
    if (!auth) return;
    
    const confirmMsg = status === 'approved' ? 
        'Approuver ce remboursement ?' : 
        'Refuser ce remboursement ?';
    
    if (!confirm(confirmMsg)) return;
    
    try {
        const response = await fetch(`/api/admin/cancellations/${refundId}/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`
            },
            body: JSON.stringify({ 
                refund_status: status,
                admin_notes: status === 'approved' ? 'Approuvé par admin' : 'Refusé par admin'
            })
        });
        
        if (response.ok) {
            showToast(
                status === 'approved' ? 'Remboursement approuvé' : 'Remboursement refusé',
                'success'
            );
            loadAllRefunds();
        } else {
            showToast('Erreur lors du traitement', 'error');
        }
    } catch (error) {
        showToast('Erreur de connexion', 'error');
    }
}

// View booking details
function viewBookingDetails(bookingId) {
    showToast('Fonctionnalité en cours de développement', 'info');
}

// Logout
document.getElementById('admin-logout').addEventListener('click', () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('aw_user');
        localStorage.removeItem('aw_token');
        window.location.href = 'index.html';
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAdminProfile();
    loadDashboardStats();
    loadRecentActivity();
});
