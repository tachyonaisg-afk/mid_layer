

const express = require('express');
const cors = require('cors'); // <-- Added CORS import
const initDB = require('./config/init');

const app = express();

// --- CORS CONFIGURATION ---
// Must be placed BEFORE any of your app.use routes
const corsOptions = {
  origin: ['https://cms.automedai.in', 'http://localhost:3000', 'https://stg1.automedai.in', 'https://stgf.automedai.in'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
// --------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require("./services/cron.service");

app.use('/appointments', require('./routes/appointment.routes'));
app.use('/rooms', require('./routes/room.routes'));
app.use('/doctor_room', require('./routes/doctorRoom.routes'));
app.use('/doctor_availability', require('./routes/doctorAvailability.routes'));
app.use('/doctor_available', require('./routes/doctorAvailable.routes'));
app.use('/doctor_company', require('./routes/doctorCompany.routes'));
app.use('/', require('./routes/prescription.routes'));
app.use('/location', require('./routes/location.routes'));

(async () => {
    await initDB();
    app.listen(3008, () =>
        console.log('Server running at http://localhost:3008')
    );
})();
