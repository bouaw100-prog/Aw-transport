// AW Transport - Enhanced Backend Server
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aw_transport_secret_key_2026';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new sqlite3.Database('./aw-transport.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'client',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Trips table
        db.run(`CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_name TEXT NOT NULL,
            driver_phone TEXT NOT NULL,
            driver_address TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            departure TEXT NOT NULL,
            arrival TEXT NOT NULL,
            departure_time TEXT NOT NULL,
            arrival_time TEXT,
            date DATE NOT NULL,
            price INTEGER NOT NULL,
            seats_total INTEGER NOT NULL,
            seats_available INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            featured BOOLEAN DEFAULT 0,
            rating REAL DEFAULT 5.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Bookings table
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            passengers_count INTEGER NOT NULL,
            total_amount INTEGER NOT NULL,
            payment_method TEXT NOT NULL,
            payment_status TEXT DEFAULT 'pending',
            booking_status TEXT DEFAULT 'confirmed',
            cancellation_reason TEXT,
            refund_status TEXT DEFAULT 'none',
            refund_amount INTEGER DEFAULT 0,
            booking_code TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trip_id) REFERENCES trips(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Cancellations table
        db.run(`CREATE TABLE IF NOT EXISTS cancellations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            reason TEXT,
            refund_requested BOOLEAN DEFAULT 1,
            refund_status TEXT DEFAULT 'pending',
            refund_amount INTEGER DEFAULT 0,
            admin_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME,
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        console.log('Database tables initialized');
        seedDatabase();
    });
}

// Seed initial data
function seedDatabase() {
    // Create admin user
    db.get("SELECT * FROM users WHERE phone = '+221 77 000 0000'", async (err, user) => {
        if (!user) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            db.run(
                `INSERT INTO users (name, phone, email, password, role) VALUES (?, ?, ?, ?, ?)`,
                ['Administrateur', '+221 77 000 0000', 'admin@awtransport.sn', hashedPassword, 'admin']
            );
            console.log('Admin user created: +221 77 000 0000 / admin123');
        }
    });

    // Seed trips
    db.get("SELECT COUNT(*) as count FROM trips", (err, row) => {
        if (row.count === 0) {
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            
            const sampleTrips = [
                ['Mamadou Diop', '+221 77 123 4567', 'Médina, Dakar', 'bus', 'Dakar', 'Saint-Louis', '08:00', '12:30', today, 3500, 45, 45, 1, 4.8],
                ['Fatou Sall', '+221 76 987 6543', 'Plateau, Dakar', 'minibus', 'Dakar', 'Thiès', '09:30', '11:00', today, 1500, 15, 15, 0, 4.6],
                ['Ibrahima Fall', '+221 70 456 7890', 'Parcelles Assainies', 'taxi', 'Thiès', 'Dakar', '14:00', '15:30', today, 2500, 4, 4, 0, 4.3],
                ['Aïssatou Ndiaye', '+221 78 234 5678', 'HLM, Dakar', 'moto', 'Dakar', 'Mbour', '10:00', '11:30', today, 1200, 1, 1, 0, 4.9],
                ['Moussa Gueye', '+221 77 345 6789', 'Grand Yoff', 'bus', 'Kaolack', 'Dakar', '07:00', '11:00', tomorrow, 3000, 50, 50, 0, 4.7],
                ['Khady Ba', '+221 76 567 8901', 'Ouakam, Dakar', 'minibus', 'Saint-Louis', 'Dakar', '11:00', '15:30', tomorrow, 3500, 18, 18, 0, 4.5],
                ['Ousmane Sy', '+221 70 678 9012', 'Almadies', 'taxi', 'Matam', 'Orossogui', '15:30', '17:00', tomorrow, 2000, 4, 4, 0, 4.4],
                ['Mariama Sarr', '+221 78 789 0123', 'Guédiawaye', 'moto', 'Orossogui', 'Matam', '12:00', '13:30', tomorrow, 1800, 1, 1, 0, 4.8]
            ];

            sampleTrips.forEach(trip => {
                db.run(`INSERT INTO trips (driver_name, driver_phone, driver_address, vehicle_type, departure, arrival, departure_time, arrival_time, date, price, seats_total, seats_available, featured, rating) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, trip);
            });

            console.log('Sample trips seeded');
        }
    });
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requis' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};

// Middleware to check admin role
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès administrateur requis' });
    }
    next();
};

// Generate booking code
function generateBookingCode() {
    return 'AW' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 5).toUpperCase();
}

// ===== AUTHENTICATION ROUTES =====

// Register
app.post('/api/auth/register', async (req, res) => {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !password) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
            `INSERT INTO users (name, phone, email, password, role) VALUES (?, ?, ?, ?, ?)`,
            [name, phone, email || null, hashedPassword, 'client'],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
                    }
                    return res.status(500).json({ error: 'Erreur lors de la création du compte' });
                }

                const userId = this.lastID;
                const token = jwt.sign({ id: userId, phone, role: 'client' }, JWT_SECRET, { expiresIn: '30d' });

                res.status(201).json({
                    user: { id: userId, name, phone, email, role: 'client' },
                    token
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    db.get('SELECT * FROM users WHERE phone = ?', [phone], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role
            },
            token
        });
    });
});

// ===== TRIPS ROUTES =====

// Get all trips
app.get('/api/trips', (req, res) => {
    const { departure, arrival, date, vehicle_type, min_seats } = req.query;

    let query = 'SELECT * FROM trips WHERE status = "active"';
    const params = [];

    if (departure && departure !== 'all') {
        query += ' AND departure = ?';
        params.push(departure);
    }

    if (arrival && arrival !== 'all') {
        query += ' AND arrival = ?';
        params.push(arrival);
    }

    if (date) {
        query += ' AND date = ?';
        params.push(date);
    }

    if (vehicle_type && vehicle_type !== 'all') {
        query += ' AND vehicle_type = ?';
        params.push(vehicle_type);
    }

    if (min_seats) {
        query += ' AND seats_available >= ?';
        params.push(parseInt(min_seats));
    }

    query += ' ORDER BY featured DESC, date ASC, departure_time ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get single trip
app.get('/api/trips/:id', (req, res) => {
    db.get('SELECT * FROM trips WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        res.json(row);
    });
});

// Add trip (admin only)
app.post('/api/trips', authenticateToken, isAdmin, (req, res) => {
    const {
        driver_name, driver_phone, driver_address, vehicle_type,
        departure, arrival, departure_time, arrival_time,
        date, price, seats
    } = req.body;

    db.run(
        `INSERT INTO trips (driver_name, driver_phone, driver_address, vehicle_type, departure, arrival, departure_time, arrival_time, date, price, seats_total, seats_available)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [driver_name, driver_phone, driver_address, vehicle_type, departure, arrival, departure_time, arrival_time, date, price, seats, seats],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, message: 'Trajet ajouté avec succès' });
        }
    );
});

// ===== BOOKINGS ROUTES =====

// Create booking
app.post('/api/bookings', authenticateToken, (req, res) => {
    const { trip_id, passengers_count, payment_method } = req.body;
    const user_id = req.user.id;

    // Get trip details
    db.get('SELECT * FROM trips WHERE id = ?', [trip_id], (err, trip) => {
        if (err || !trip) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }

        if (trip.seats_available < passengers_count) {
            return res.status(400).json({ error: 'Places insuffisantes' });
        }

        const total_amount = trip.price * passengers_count + Math.round(trip.price * passengers_count * 0.05);
        const booking_code = generateBookingCode();

        db.run(
            `INSERT INTO bookings (trip_id, user_id, passengers_count, total_amount, payment_method, booking_code)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [trip_id, user_id, passengers_count, total_amount, payment_method, booking_code],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Update seats
                db.run('UPDATE trips SET seats_available = seats_available - ? WHERE id = ?', [passengers_count, trip_id]);

                res.status(201).json({
                    id: this.lastID,
                    booking_code,
                    message: 'Réservation confirmée'
                });
            }
        );
    });
});

// Get user bookings
app.get('/api/bookings/my', authenticateToken, (req, res) => {
    const user_id = req.user.id;

    const query = `
        SELECT b.*, t.driver_name, t.departure, t.arrival, t.departure_time, t.date, t.vehicle_type
        FROM bookings b
        JOIN trips t ON b.trip_id = t.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `;

    db.all(query, [user_id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Cancel booking
app.post('/api/bookings/:id/cancel', authenticateToken, (req, res) => {
    const booking_id = req.params.id;
    const user_id = req.user.id;
    const { reason } = req.body;

    // Get booking
    db.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [booking_id, user_id], (err, booking) => {
        if (err || !booking) {
            return res.status(404).json({ error: 'Réservation non trouvée' });
        }

        if (booking.booking_status === 'cancelled') {
            return res.status(400).json({ error: 'Réservation déjà annulée' });
        }

        // Calculate refund (80% if cancelled more than 24h before departure)
        const refund_amount = Math.round(booking.total_amount * 0.8);

        // Update booking
        db.run(
            'UPDATE bookings SET booking_status = ?, cancellation_reason = ?, refund_status = ?, refund_amount = ? WHERE id = ?',
            ['cancelled', reason, 'pending', refund_amount, booking_id]
        );

        // Restore seats
        db.run('UPDATE trips SET seats_available = seats_available + ? WHERE id = ?', [booking.passengers_count, booking.trip_id]);

        // Create cancellation record
        db.run(
            'INSERT INTO cancellations (booking_id, user_id, reason, refund_amount) VALUES (?, ?, ?, ?)',
            [booking_id, user_id, reason, refund_amount]
        );

        res.json({ message: 'Réservation annulée', refund_amount });
    });
});

// Get all bookings (admin)
app.get('/api/admin/bookings', authenticateToken, isAdmin, (req, res) => {
    const query = `
        SELECT b.*, t.driver_name, t.departure, t.arrival, t.date, u.name as passenger_name, u.phone as passenger_phone
        FROM bookings b
        JOIN trips t ON b.trip_id = t.id
        JOIN users u ON b.user_id = u.id
        ORDER BY b.created_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get cancellations (admin)
app.get('/api/admin/cancellations', authenticateToken, isAdmin, (req, res) => {
    const query = `
        SELECT c.*, b.booking_code, u.name as user_name, u.phone as user_phone
        FROM cancellations c
        JOIN bookings b ON c.booking_id = b.id
        JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Process refund (admin)
app.post('/api/admin/cancellations/:id/process', authenticateToken, isAdmin, (req, res) => {
    const cancellation_id = req.params.id;
    const { refund_status, admin_notes } = req.body;

    db.run(
        'UPDATE cancellations SET refund_status = ?, admin_notes = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [refund_status, admin_notes, cancellation_id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Update booking refund status
            db.run(
                `UPDATE bookings SET refund_status = ? WHERE id = (SELECT booking_id FROM cancellations WHERE id = ?)`,
                [refund_status, cancellation_id]
            );

            res.json({ message: 'Remboursement traité' });
        }
    );
});

// Get stats
app.get('/api/stats', (req, res) => {
    db.all(`
        SELECT
            (SELECT COUNT(*) FROM trips WHERE status = 'active') as total_trips,
            (SELECT COUNT(*) FROM trips WHERE status = 'active' AND seats_available > 0) as available_trips,
            (SELECT COUNT(*) FROM bookings) as total_bookings,
            (SELECT SUM(total_amount) FROM bookings WHERE booking_status = 'confirmed') as total_revenue
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows[0]);
    });
});

// Serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`AW Transport server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('Database connection closed.');
        process.exit(0);
    });
});
