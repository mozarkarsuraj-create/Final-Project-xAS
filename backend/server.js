const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const jwt = require('jsonwebtoken');
const { readDB, writeDB } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'nagpur_services_super_secret_key';
const JWT_EXPIRES_IN = '24h';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// --- MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// --- AUTHENTICATION ---
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, location } = req.body;
    const db = readDB();

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ message: "User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now(),
        name, 
        email, 
        password: hashedPassword, 
        role: role || 'user',
        location: location || 'Nagpur Central',
        isAvailable: role === 'helper' ? true : undefined,
        profile_pic_sim: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`
    };

    db.users.push(newUser);
    writeDB(db);
    res.status(201).json({ message: "Registered successfully!", userId: newUser.id });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role, location: user.location }, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ 
        message: "Login successful!", 
        token, 
        user: { id: user.id, name: user.name, role: user.role, location: user.location, profile_pic_sim: user.profile_pic_sim } 
    });
});

// --- SERVICES & DISCOVERY ---
app.get('/api/services', (req, res) => {
    res.json(readDB().services);
});

app.get('/api/helpers/nearby', verifyToken, (req, res) => {
    const { serviceId } = req.query;
    const db = readDB();
    
    const availableHelpers = db.users.filter(u => u.role === 'helper' && u.isAvailable);
    
    const helpersWithDistance = availableHelpers.map(h => ({
        ...h,
        distance_km: (Math.random() * (12.0 - 0.5) + 0.5).toFixed(1),
        estimated_arrival_mins: Math.floor(Math.random() * 40) + 5
    })).sort((a, b) => a.distance_km - b.distance_km);

    res.json(helpersWithDistance.map(({password, ...safeHelper}) => safeHelper));
});

// --- BOOKINGS / JOBS ---
app.post('/api/bookings', verifyToken, (req, res) => {
    if (req.user.role !== 'user') return res.status(403).json({ message: "Only customers can request services." });
    
    const { serviceId, serviceName, date, helperId, exactLocation, paymentMethod } = req.body;
    const db = readDB();
    const helper = db.users.find(u => u.id === helperId);

    const newBooking = {
        id: Date.now(),
        customerId: req.user.id,
        customerName: req.user.name,
        customerLocation: req.user.location,
        exactLocation: exactLocation || '',       
        paymentMethod: paymentMethod || 'COD',    
        serviceId, 
        serviceName, 
        date,
        status: 'requested',
        helperId: helper ? helper.id : null,
        helperName: helper ? helper.name : 'Searching nearby helpers...',
        price_sim: db.services.find(s => s.id === serviceId)?.price || 500
    };

    db.bookings.push(newBooking);
    writeDB(db);
    res.status(201).json({ message: "Service requested successfully!", booking: newBooking });
});

app.get('/api/bookings', verifyToken, (req, res) => {
    const db = readDB();
    if (req.user.role === 'admin') return res.json(db.bookings);
    if (req.user.role === 'helper') return res.json(db.bookings.filter(b => b.helperId === req.user.id || b.status === 'requested'));
    res.json(db.bookings.filter(b => b.customerId === req.user.id));
});

app.put('/api/bookings/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 
    const db = readDB();
    const booking = db.bookings.find(b => b.id == id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (req.user.role === 'helper') {
        booking.status = status;
        if (status === 'accepted') {
            booking.helperId = req.user.id;
            booking.helperName = req.user.name;
        }
        writeDB(db);
        return res.json({ message: `Job marked as ${status}`, booking });
    }
    
    res.status(403).json({ message: "Unauthorized action." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Nagpur Services API running on http://localhost:${PORT}`);
});