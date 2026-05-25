// Search Page JavaScript

let allTrips = [];
let filteredTrips = [];

// Vehicle type mapping
const vehicleTypes = {
    bus: { name: 'Bus', icon: 'ti-bus' },
    minibus: { name: 'Mini-bus', icon: 'ti-car' },
    taxi: { name: 'Taxi', icon: 'ti-car-suv' },
    moto: { name: 'Moto', icon: 'ti-motorbike' }
};

// Load trips from URL parameters or fetch all
async function loadTrips() {
    const urlParams = new URLSearchParams(window.location.search);
    const departure = urlParams.get('departure');
    const arrival = urlParams.get('arrival');
    const date = urlParams.get('date');

    // Set filters from URL
    if (departure) document.getElementById('filter-departure').value = departure;
    if (arrival) document.getElementById('filter-arrival').value = arrival;
    if (date) document.getElementById('filter-date').value = date;

    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('trips-container').style.display = 'none';

    try {
        const params = new URLSearchParams();
        if (departure && departure !== 'all') params.append('departure', departure);
        if (arrival && arrival !== 'all') params.append('arrival', arrival);
        if (date) params.append('date', date);

        const response = await fetch(`/api/trips?${params.toString()}`);
        const trips = await response.json();

        allTrips = trips;
        filteredTrips = trips;
        displayTrips(trips);
    } catch (error) {
        console.error('Error loading trips:', error);
        showToast('Erreur lors du chargement des trajets', 'error');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
    }
}

// Display trips
function displayTrips(trips) {
    const container = document.getElementById('trips-container');
    const noResults = document.getElementById('no-results');
    const loading = document.getElementById('loading');
    const resultsCount = document.getElementById('results-count');

    loading.style.display = 'none';

    if (trips.length === 0) {
        container.style.display = 'none';
        noResults.style.display = 'block';
        resultsCount.textContent = 'Aucun trajet trouvé';
        return;
    }

    container.style.display = 'grid';
    noResults.style.display = 'none';
    resultsCount.textContent = `${trips.length} trajet${trips.length > 1 ? 's' : ''} disponible${trips.length > 1 ? 's' : ''}`;

    container.innerHTML = trips.map(trip => createTripCard(trip)).join('');
}

// Create trip card HTML
function createTripCard(trip) {
    const vehicle = vehicleTypes[trip.vehicle_type];
    const initials = trip.driver_name.split(' ').map(n => n[0]).join('');
    
    let seatsClass = 'available';
    let seatsText = `${trip.seats_available} places`;
    
    if (trip.seats_available === 0) {
        seatsClass = 'full';
        seatsText = 'Complet';
    } else if (trip.seats_available <= 5) {
        seatsClass = 'few';
        seatsText = `${trip.seats_available} places restantes`;
    }

    return `
        <div class="trip-card ${trip.featured ? 'featured' : ''}">
            ${trip.featured ? '<span class="trip-badge">⭐ Recommandé</span>' : ''}
            
            <div class="trip-header">
                <div class="driver-avatar">${initials}</div>
                <div class="trip-info">
                    <div class="driver-name">${trip.driver_name}</div>
                    <div class="vehicle-badge">
                        <i class="ti ${vehicle.icon}"></i>
                        ${vehicle.name}
                    </div>
                    <div class="trip-rating">
                        <i class="ti ti-star-filled"></i>
                        ${trip.rating.toFixed(1)}
                    </div>
                </div>
            </div>

            <div class="trip-route">
                <div class="route-point">
                    <div class="route-city">${trip.departure}</div>
                    <div class="route-time">${trip.departure_time}</div>
                </div>
                <i class="ti ti-arrow-right route-arrow"></i>
                <div class="route-point">
                    <div class="route-city">${trip.arrival}</div>
                    <div class="route-time">${trip.arrival_time || 'À confirmer'}</div>
                </div>
            </div>

            <div class="trip-details">
                <div class="detail-item">
                    <i class="ti ti-phone"></i>
                    ${trip.driver_phone}
                </div>
                <div class="detail-item">
                    <i class="ti ti-map-pin"></i>
                    ${trip.driver_address}
                </div>
                <div class="detail-item">
                    <i class="ti ti-calendar"></i>
                    ${formatDate(trip.date)}
                </div>
                <div class="detail-item">
                    <i class="ti ti-armchair"></i>
                    ${trip.seats_total} places total
                </div>
            </div>

            <div class="trip-footer">
                <div class="trip-price">
                    <span class="price-label">Prix par personne</span>
                    <span class="price-amount">${formatCurrency(trip.price)}</span>
                </div>
                <div>
                    <div class="seats-status ${seatsClass}">${seatsText}</div>
                    <button 
                        class="btn btn-primary" 
                        style="margin-top: 0.75rem; width: 100%;"
                        onclick="bookTrip(${trip.id})"
                        ${trip.seats_available === 0 ? 'disabled' : ''}
                    >
                        <i class="ti ti-ticket"></i> Réserver
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Book trip
function bookTrip(tripId) {
    const user = localStorage.getItem('aw_user');
    
    if (!user) {
        if (confirm('Vous devez être connecté pour réserver. Voulez-vous vous connecter ?')) {
            window.location.href = `login.html?redirect=booking&trip=${tripId}`;
        }
        return;
    }
    
    window.location.href = `booking.html?trip=${tripId}`;
}

// Search form handler
document.getElementById('search-filters-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const departure = document.getElementById('filter-departure').value;
    const arrival = document.getElementById('filter-arrival').value;
    const date = document.getElementById('filter-date').value;
    const type = document.getElementById('filter-type').value;
    
    // Update URL
    const params = new URLSearchParams();
    if (departure !== 'all') params.set('departure', departure);
    if (arrival !== 'all') params.set('arrival', arrival);
    if (date) params.set('date', date);
    if (type !== 'all') params.set('type', type);
    
    window.history.pushState({}, '', `search.html?${params.toString()}`);
    
    // Reload trips
    loadTrips();
});

// Sort handler
document.getElementById('sort-by').addEventListener('change', (e) => {
    const sortBy = e.target.value;
    let sorted = [...filteredTrips];
    
    switch (sortBy) {
        case 'price-low':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'time-early':
            sorted.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
            break;
        case 'time-late':
            sorted.sort((a, b) => b.departure_time.localeCompare(a.departure_time));
            break;
        case 'recommended':
        default:
            sorted.sort((a, b) => {
                if (a.featured !== b.featured) return b.featured - a.featured;
                return b.rating - a.rating;
            });
    }
    
    displayTrips(sorted);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTrips();
});
