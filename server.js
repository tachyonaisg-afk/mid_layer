
const express = require('express');
const cors = require('cors'); // <-- Added CORS import
const http = require('http');   // ✅ NEW
const { Server } = require('socket.io'); // ✅ NEW
const initDB = require('./config/init');

const app = express();

const server = http.createServer(app); // ✅ IMPORTANT
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000','https://stgf.automedai.in'],
    credentials: true
  }
});

// make io globally available
app.set("io", io);


// --- CORS CONFIGURATION ---
// Must be placed BEFORE any of your app.use routes
const corsOptions = {
  origin: ['http://localhost:3000','https://stgf.automedai.in'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};


app.use(cors(corsOptions));
// --------------------------

app.use('/payments/webhook', express.raw({ type: '*/*' }));

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
app.use('/payments', require('./routes/payment.routes'));


// Socket connection
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

(async () => {
    await initDB();
    server.listen(3008, () =>
        console.log('Server running at http://localhost:3008')
    );
})();
