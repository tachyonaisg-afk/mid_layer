const pool = require('./db');


const appointmentTable = require('../model/appointment.model');

async function initDB() {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

       
        await conn.query(appointmentTable);

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
