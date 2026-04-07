const pool = require('./db');


const appointmentTable = require('../model/appointment.model');
const roomTable = require('../model/room.model');
const doctorRoomTable = require('../model/doctorRoom.model');
const doctorAvailabilityTable = require('../model/doctorAvailability.model');
const doctorAvailableTable = require('../model/doctorAvailable.model');
const doctorCompanyTable = require('../model/doctorCompany.model');
const prescriptionTable = require('../model/prescription.model');


async function initDB() {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

       
        await conn.query(appointmentTable);
        await conn.query(roomTable);
        await conn.query(doctorRoomTable);
        await conn.query(doctorAvailabilityTable);
        await conn.query(doctorAvailableTable);
        await conn.query(doctorCompanyTable);
        await conn.query(prescriptionTable);
        await conn.commit();
        console.log("Database tables ready");
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = initDB;
