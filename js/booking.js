// Booking Page JavaScript

let currentTrip = null;
let currentUser = null;

// Check authentication
function requireAuth() {
    const user = localStorage.getItem('aw_user');
    if (!user) {
        window.location.href = 'login.html?redirect=booking';
        return null;
    }
    return JSON.parse(user);
}

// Load trip details
async function loadTripDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('trip');
    
    if (!tripId) {
        alert('Aucun trajet sélectionné');
        window.location.href = 'search.html';
        return;
    }
    
    try {
        const response = await fetch(`/api/trips/${tripId}`);
        const trip = await response.json();
        
        if (!response.ok || !trip) {
            throw new Error('Trajet non trouvé');
        }
        
        currentTrip = trip;
        displayTripSummary(trip);
        updatePricing();
    } catch (error) {
        console.error('Error loading trip:', error);
        alert('Erreur lors du chargement du trajet');
        window.location.href = 'search.html';
    }
}

// Display trip summary
function displayTripSummary(trip) {
    const vehicleTypes = {
        bus: { name: 'Bus', icon: 'ti-bus' },
        minibus: { name: 'Mini-bus', icon: 'ti-car' },
        taxi: { name: 'Taxi', icon: 'ti-car-suv' },
        moto: { name: 'Moto', icon: 'ti-motorbike' }
    };
    
    const vehicle = vehicleTypes[trip.vehicle_type];
    
    const container = document.getElementById('trip-summary');
    container.innerHTML = `
        <div class="trip-route" style="margin-bottom: 1.5rem;">
            <div class="route-city-large" style="font-size: 1.5rem; font-weight: 600; color: var(--brand-navy);">${trip.departure}</div>
            <i class="ti ti-arrow-right" style="font-size: 2rem; color: var(--brand-gold); margin: 0 1rem;"></i>
            <div class="route-city-large" style="font-size: 1.5rem; font-weight: 600; color: var(--brand-navy);">${trip.arrival}</div>
        </div>
        
        <div style="display: grid; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="ti ti-user" style="color: var(--brand-gold);"></i>
                <span><strong>Chauffeur:</strong> ${trip.driver_name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="ti ti-phone" style="color: var(--brand-gold);"></i>
                <span><strong>Téléphone:</strong> ${trip.driver_phone}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="ti ${vehicle.icon}" style="color: var(--brand-gold);"></i>
                <span><strong>Véhicule:</strong> ${vehicle.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="ti ti-calendar" style="color: var(--brand-gold);"></i>
                <span><strong>Date:</strong> ${formatDate(trip.date)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="ti ti-clock" style="color: var(--brand-gold);"></i>
                <span><strong>Départ:</strong> ${trip.departure_time}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="ti ti-armchair" style="color: var(--brand-gold);"></i>
                <span><strong>Places disponibles:</strong> ${trip.seats_available}/${trip.seats_total}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="ti ti-cash" style="color: var(--brand-gold);"></i>
                <span><strong>Prix:</strong> ${formatCurrency(trip.price)}/personne</span>
            </div>
        </div>
    `;
    
    // Set price in form
    document.getElementById('price-per-person').textContent = formatCurrency(trip.price);
}

// Update pricing
function updatePricing() {
    const passengersCount = parseInt(document.getElementById('passengers-count').value) || 0;
    
    if (!currentTrip || passengersCount === 0) {
        document.getElementById('total-passengers').textContent = '0';
        document.getElementById('subtotal').textContent = '0 FCFA';
        document.getElementById('service-fee').textContent = '0 FCFA';
        document.getElementById('total-amount').textContent = '0 FCFA';
        return;
    }
    
    const pricePerPerson = currentTrip.price;
    const subtotal = pricePerPerson * passengersCount;
    const serviceFee = Math.round(subtotal * 0.05);
    const total = subtotal + serviceFee;
    
    document.getElementById('total-passengers').textContent = passengersCount;
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('service-fee').textContent = formatCurrency(serviceFee);
    document.getElementById('total-amount').textContent = formatCurrency(total);
}

// Passengers count change
document.getElementById('passengers-count').addEventListener('change', updatePricing);

// Booking form submit
document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('aw_token');
    if (!token) {
        window.location.href = 'login.html?redirect=booking';
        return;
    }
    
    const passengersCount = parseInt(document.getElementById('passengers-count').value);
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    
    if (!currentTrip) {
        alert('Erreur: Trajet non trouvé');
        return;
    }
    
    if (passengersCount > currentTrip.seats_available) {
        alert(`Seulement ${currentTrip.seats_available} places disponibles`);
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="ti ti-loader"></i> Réservation en cours...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                trip_id: currentTrip.id,
                passengers_count: passengersCount,
                payment_method: paymentMethod
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success modal
            document.getElementById('booking-code-display').textContent = data.booking_code;
            document.getElementById('success-modal').classList.add('show');
            document.body.style.overflow = 'hidden';
        } else {
            alert(data.error || 'Erreur lors de la réservation');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur de connexion');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            localStorage.removeItem('aw_user');
            localStorage.removeItem('aw_token');
            window.location.href = 'index.html';
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    currentUser = requireAuth();
    if (currentUser) {
        loadTripDetails();
    }
});
