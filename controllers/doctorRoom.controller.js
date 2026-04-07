// Assign Room to Doctor

const pool = require('../config/db');


// Get Room by Doctor & Date

// exports.assignRoom = async (req, res) => {

//     const assignments = Array.isArray(req.body) ? req.body : [req.body];

//     if (assignments.length === 0) {
//         return res.status(400).json({
//             success:false,
//             message:"No assignment data provided"
//         });
//     }

//     const conn = await pool.getConnection();

//     try {
//         await conn.beginTransaction();

//         for (const item of assignments) {

//             let {
//                 doctor_id,
//                 doctor_name,
//                 room_id,
//                 schedule_date,
//                 from_time,
//                 to_time,
//                 company,
//                 user_id
//             } = item;

//             // REQUIRED FIELD VALIDATION
//             if (!doctor_id || !doctor_name || !room_id || !schedule_date || !company || !user_id) {
//                 throw new Error("doctor_id, doctor_name, room_id, schedule_date, company, user_id required");
//             }

//             // DATE VALIDATION (NO PAST DATE)
//             const today = new Date();
//             today.setHours(0,0,0,0);

//             const selectedDate = new Date(schedule_date);

//             if (selectedDate < today) {
//                 throw new Error(`Cannot assign doctor on past date ${schedule_date}`);
//             }



    
//             // NORMALIZE TIME (FULL DAY IF NOT PROVIDED)
//             const startTime = from_time || "00:00:00";
//             const endTime   = to_time   || "23:59:59";


            
// //  BLOCK PAST TIME IF TODAY

// const now = new Date();

// if (selectedDate.toDateString() === now.toDateString()) {

//     const [h, m, s] = startTime.split(':');
//     const slotTime = new Date(selectedDate);
//     slotTime.setHours(h, m, s || 0);

//     if (slotTime <= now) {
//         throw new Error(`Cannot assign slot in past time (${startTime})`);
//     }
// }
//             // TIME VALIDATION
//             if (startTime >= endTime) {
//                 throw new Error(`Start time must be earlier than end time for doctor ${doctor_name}`);
//             }

//             // STEP 1 — Check doctor unavailable
//             const [unavailable] = await conn.query(
//                 `SELECT id FROM DoctorAvailability
//                  WHERE doctor_id = ?
//                  AND unavailable_date = ?
//                  AND company = ?
//                  AND (
//                     (start_time <= ? AND end_time > ?) OR
//                     (start_time < ? AND end_time >= ?) OR
//                     (start_time >= ? AND end_time <= ?)
//                  )`,
//                 [
//                     doctor_id,
//                     schedule_date,
//                     company,
//                     startTime, startTime,
//                     endTime, endTime,
//                     startTime, endTime
//                 ]
//             );

//             if (unavailable.length > 0) {
//                 throw new Error(`Doctor ${doctor_name} unavailable at this time`);
//             }

//             // STEP 2 — GLOBAL CONFLICT CHECK (ANY COMPANY)
//             const [globalConflict] = await conn.query(
//                 `SELECT id FROM DoctorRoomMap
//                  WHERE doctor_id = ?
//                  AND schedule_date = ?
//                  AND (
//                     (from_time <= ? AND to_time > ?) OR
//                     (from_time < ? AND to_time >= ?) OR
//                     (from_time >= ? AND to_time <= ?)
//                  )`,
//                 [
//                     doctor_id,
//                     schedule_date,
//                     startTime, startTime,
//                     endTime, endTime,
//                     startTime, endTime
//                 ]
//             );

//             if (globalConflict.length > 0) {
//                 throw new Error(`Doctor ${doctor_name} already assigned somewhere on this date/time`);
//             }

//             // STEP 3 — Check room exists & active
//             const [rooms] = await conn.query(
//                 `SELECT status FROM Rooms WHERE id=? AND company=?`,
//                 [room_id, company]
//             );

//             if (rooms.length === 0) {
//                 throw new Error(`Room ${room_id} not found in company ${company}`);
//             }

//             if (rooms[0].status === 'inactive') {
//                 throw new Error(`Room ${room_id} is inactive`);
//             }

//             // STEP 4 — INSERT
//             await conn.query(
//                 `INSERT INTO DoctorRoomMap
//                  (doctor_id, doctor_name, company, room_id, schedule_date, from_time, to_time, created_by)
//                  VALUES (?,?,?,?,?,?,?,?)`,
//                 [
//                     doctor_id,
//                     doctor_name,
//                     company,
//                     room_id,
//                     schedule_date,
//                     startTime,
//                     endTime,
//                     user_id
//                 ]
//             );
//         }

//         await conn.commit();

//         res.json({
//             success:true,
//             message:"Doctor room assignments completed successfully"
//         });

//     } catch (err) {

//         await conn.rollback();

//         console.error("ASSIGN ERROR:", err);

//         res.status(400).json({
//             success:false,
//             message:err.message
//         });

//     } finally {
//         conn.release();
//     }
// };


// book appointment

// exports.bookAppointment = async (req, res) => {

//     const conn = await pool.getConnection();

//     try {

//         const {
//             doctor_id,
//             company,
//             appointment_date,
//             patient_name
//         } = req.body;

//         if (!doctor_id || !company || !appointment_date || !patient_name) {
//             return res.status(400).json({
//                 success:false,
//                 message:"doctor_id, company, appointment_date, patient_name required"
//             });
//         }

//         // STEP 1: Check doctor schedule
//         const [schedule] = await conn.query(
//             `SELECT id, max_patients 
//              FROM DoctorRoomMap
//              WHERE doctor_id = ?
//              AND company = ?
//              AND schedule_date = ?`,
//             [doctor_id, company, appointment_date]
//         );

//         if (schedule.length === 0) {
//             return res.status(400).json({
//                 success:false,
//                 message:"Doctor not scheduled for this date"
//             });
//         }

//         const maxPatients = schedule[0].max_patients;

//         // STEP 2: Count booked patients
//         const [countResult] = await conn.query(
//             `SELECT COUNT(*) as total
//              FROM Appointments
//              WHERE doctor_id = ?
//              AND company = ?
//              AND appointment_date = ?`,
//             [doctor_id, company, appointment_date]
//         );

//         const bookedPatients = countResult[0].total;

//         // STEP 3: Check max limit
//         if (maxPatients !== null && bookedPatients >= maxPatients) {

//             return res.status(400).json({
//                 success:false,
//                 message:`Maximum patient limit reached (${maxPatients})`
//             });

//         }

//         // STEP 4: Insert appointment
//         await conn.query(
//             `INSERT INTO Appointments
//             (doctor_id, company, appointment_date, patient_name)
//             VALUES (?,?,?,?)`,
//             [
//                 doctor_id,
//                 company,
//                 appointment_date,
//                 patient_name
//             ]
//         );

//         res.json({
//             success:true,
//             message:"Appointment booked successfully",
//             currentPatients: bookedPatients + 1,
//             maxPatients: maxPatients
//         });

//     } catch (err) {

//         console.error("BOOK ERROR:", err);

//         res.status(500).json({
//             success:false,
//             message:err.message
//         });

//     } finally {

//         conn.release();

//     }
// };

exports.assignRoom = async (req, res) => {

    const assignments = Array.isArray(req.body) ? req.body : [req.body];

    if (assignments.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No assignment data provided"
        });
    }

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

        for (const item of assignments) {

            let {
                doctor_id,
                doctor_name,
                room_id,
                schedule_date,
                from_time,
                to_time,
                max_patients,
                company,
                user_id
            } = item;


            // REQUIRED FIELD VALIDATION
            if (!doctor_id || !doctor_name || !room_id || !schedule_date || !company || !user_id) {
                throw new Error("doctor_id, doctor_name, room_id, schedule_date, company, user_id required");
            }


            // DATE VALIDATION (NO PAST DATE)
            const today = new Date();
            today.setHours(0,0,0,0);

            const selectedDate = new Date(schedule_date);

            if (selectedDate < today) {
                throw new Error(`Cannot assign doctor on past date ${schedule_date}`);
            }


            // NORMALIZE TIME (FULL DAY IF NOT PROVIDED)
            const startTime = from_time || "00:00:00";
            const endTime   = to_time   || "23:59:59";


            // BLOCK PAST TIME IF TODAY
            const now = new Date();

            if (selectedDate.toDateString() === now.toDateString()) {

                const [h, m, s] = startTime.split(':');

                const slotTime = new Date(selectedDate);
                slotTime.setHours(h, m, s || 0);

                if (slotTime <= now) {
                    throw new Error(`Cannot assign slot in past time (${startTime})`);
                }
            }


            // TIME VALIDATION
            if (startTime >= endTime) {
                throw new Error(`Start time must be earlier than end time for doctor ${doctor_name}`);
            }


            // MAX PATIENTS VALIDATION (OPTIONAL)
            if (max_patients !== undefined && max_patients !== null) {

                const patients = Number(max_patients);

                if (!Number.isInteger(patients) || patients <= 0) {
                    throw new Error("max_patients must be a positive number");
                }

                max_patients = patients;
            } else {
                max_patients = null;
            }


            // STEP 1 — Check doctor unavailable
            const [unavailable] = await conn.query(
                `SELECT id FROM DoctorAvailability
                 WHERE doctor_id = ?
                 AND unavailable_date = ?
                 AND company = ?
                 AND (
                    (start_time <= ? AND end_time > ?) OR
                    (start_time < ? AND end_time >= ?) OR
                    (start_time >= ? AND end_time <= ?)
                 )`,
                [
                    doctor_id,
                    schedule_date,
                    company,
                    startTime, startTime,
                    endTime, endTime,
                    startTime, endTime
                ]
            );

            if (unavailable.length > 0) {
                throw new Error(`Doctor ${doctor_name} unavailable at this time`);
            }


            // STEP 2 — GLOBAL CONFLICT CHECK (ANY COMPANY)
            const [globalConflict] = await conn.query(
                `SELECT id FROM DoctorRoomMap
                 WHERE doctor_id = ?
                 AND schedule_date = ?
                 AND (
                    (from_time <= ? AND to_time > ?) OR
                    (from_time < ? AND to_time >= ?) OR
                    (from_time >= ? AND to_time <= ?)
                 )`,
                [
                    doctor_id,
                    schedule_date,
                    startTime, startTime,
                    endTime, endTime,
                    startTime, endTime
                ]
            );

            if (globalConflict.length > 0) {
                throw new Error(`Doctor ${doctor_name} already assigned somewhere on this date/time`);
            }


            // STEP 3 — Check room exists & active
            const [rooms] = await conn.query(
                `SELECT status FROM Rooms WHERE id=? AND company=?`,
                [room_id, company]
            );

            if (rooms.length === 0) {
                throw new Error(`Room ${room_id} not found in company ${company}`);
            }

            if (rooms[0].status === 'inactive') {
                throw new Error(`Room ${room_id} is inactive`);
            }


            // STEP 4 — INSERT
            await conn.query(
                `INSERT INTO DoctorRoomMap
                 (doctor_id, doctor_name, company, room_id, schedule_date, from_time, to_time, max_patients, created_by)
                 VALUES (?,?,?,?,?,?,?,?,?)`,
                [
                    doctor_id,
                    doctor_name,
                    company,
                    room_id,
                    schedule_date,
                    startTime,
                    endTime,
                    max_patients,
                    user_id
                ]
            );

        }

        await conn.commit();

        res.json({
            success: true,
            message: "Doctor room assignments completed successfully"
        });

    } catch (err) {

        await conn.rollback();

        console.error("ASSIGN ERROR:", err);

        res.status(400).json({
            success: false,
            message: err.message
        });

    } finally {

        conn.release();

    }

};


exports.getDoctorRoom = async (req, res) => {
    const { doctor_id, schedule_date, company } = req.query;

    if (!doctor_id || !schedule_date || !company) {
        return res.status(400).json({
            success: false,
            message: "doctor_id, schedule_date and company are required"
        });
    }

    try {
        const [rows] = await pool.query(`
            SELECT 
                d.*, 
                r.room_name
            FROM DoctorRoomMap d
            JOIN Rooms r 
                ON r.id = d.room_id 
                AND r.company = d.company
            WHERE d.doctor_id = ?
            AND d.schedule_date = ?
            AND d.company = ?
        `, [doctor_id, schedule_date, company]);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("GET DOCTOR ROOM ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// GET ALL ASSIGNMENTS
exports.getAssignments = async (req, res) => {
    const { company } = req.query;

    if (!company) {
        return res.status(400).json({
            success: false,
            message: "company is required"
        });
    }

    try {
        const [rows] = await pool.query(`
            SELECT 
                d.*, 
                r.room_name 
            FROM DoctorRoomMap d
            JOIN Rooms r 
                ON r.id = d.room_id 
                AND r.company = d.company
            WHERE d.company = ?
            ORDER BY d.schedule_date DESC
        `, [company]);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



// UPDATE ASSIGNMENT

// exports.updateAssignment = async (req, res) => {
//     const { id } = req.params;
//     const { doctor_id, doctor_name, room_id, schedule_date, from_time, to_time, company, user_id } = req.body;

//     if (!doctor_id || !doctor_name || !room_id || !schedule_date || !company || !user_id) {
//         return res.status(400).json({
//             success: false,
//             message: "doctor_id, doctor_name, room_id, schedule_date, company, user_id required"
//         });
//     }

//     const conn = await pool.getConnection();

//     try {
//         await conn.beginTransaction();

//         // 1. Initialize Dates and Times
//         const now = new Date();
//         const scheduleDateObj = new Date(schedule_date);
//         const startTime = from_time || "00:00:00";
//         const endTime = to_time || "23:59:59";

//         // Helper to convert HH:MM:SS to minutes
//         const toMinutes = (timeStr) => {
//             const [h, m] = timeStr.split(":").map(Number);
//             return h * 60 + m;
//         };

//         // 2. Date/Time Validations
//         const today = new Date(now);
//         today.setHours(0, 0, 0, 0);
//         if (scheduleDateObj < today) throw new Error("Cannot update assignment for past date");

//         if (toMinutes(startTime) >= toMinutes(endTime)) {
//             throw new Error("Start time must be less than end time");
//         }

//         // 3. Block Past Slots if for today
//         if (scheduleDateObj.toDateString() === now.toDateString()) {
//             const currentMinutes = now.getHours() * 60 + now.getMinutes();
//             if (toMinutes(startTime) <= currentMinutes) {
//                 throw new Error("Cannot assign/update slot in past time");
//             }
//         }

//         // 4. Validate Assignment/Room
//         const [existing] = await conn.query(`SELECT id FROM DoctorRoomMap WHERE id=? AND company=?`, [id, company]);
//         if (existing.length === 0) throw new Error("Assignment not found for this company");

//         const [rooms] = await conn.query(`SELECT status FROM Rooms WHERE id=? AND company=?`, [room_id, company]);
//         if (rooms.length === 0 || rooms[0].status === 'inactive') throw new Error("Room not found or is inactive");

//         // 5. Conflict Checks (Using standard overlap logic: startA < endB AND endA > startB)
//         const conflictQuery = `
//             SELECT id FROM DoctorRoomMap 
//             WHERE doctor_id = ? AND schedule_date = ? AND id != ?
//             AND from_time < ? AND to_time > ?`;
        
//         const [globalConflict] = await conn.query(conflictQuery, [doctor_id, schedule_date, id, endTime, startTime]);
//         if (globalConflict.length > 0) throw new Error(`Doctor ${doctor_name} already assigned on this date/time`);

//         const [unavailable] = await conn.query(`
//             SELECT id FROM DoctorAvailability 
//             WHERE doctor_id = ? AND company = ? AND unavailable_date = ?
//             AND start_time < ? AND end_time > ?`, 
//             [doctor_id, company, schedule_date, endTime, startTime]);
        
//         if (unavailable.length > 0) throw new Error(`Doctor ${doctor_name} unavailable at this time`);

//         // 6. Final Update
//         await conn.query(`
//             UPDATE DoctorRoomMap 
//             SET doctor_id=?, doctor_name=?, company=?, room_id=?, schedule_date=?, 
//                 from_time=?, to_time=?, updated_by=?, updated_at=NOW() 
//             WHERE id=? AND company=?`,
//             [doctor_id, doctor_name, company, room_id, schedule_date, startTime, endTime, user_id, id, company]
//         );

//         await conn.commit();
//         res.json({ success: true, message: "Assignment updated successfully" });

//     } catch (err) {
//         await conn.rollback();
//         console.error("UPDATE ERROR:", err);
//         res.status(400).json({ success: false, message: err.message });
//     } finally {
//         conn.release();
//     }
// };

exports.updateAssignment = async (req, res) => {
    const { id } = req.params;

    const { doctor_id, doctor_name, room_id, schedule_date, from_time, to_time, max_patients, company, user_id } = req.body;

    if (!doctor_id || !doctor_name || !room_id || !schedule_date || !company || !user_id) {
        return res.status(400).json({
            success: false,
            message: "doctor_id, doctor_name, room_id, schedule_date, company, user_id required"
        });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Initialize Dates and Times
        const now = new Date();
        const scheduleDateObj = new Date(schedule_date);
        const startTime = from_time || "00:00:00";
        const endTime = to_time || "23:59:59";

        // Helper to convert HH:MM:SS to minutes
        const toMinutes = (timeStr) => {
            const [h, m] = timeStr.split(":").map(Number);
            return h * 60 + m;
        };

        // 2. Date/Time Validations
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        if (scheduleDateObj < today) throw new Error("Cannot update assignment for past date");

        if (toMinutes(startTime) >= toMinutes(endTime)) {
            throw new Error("Start time must be less than end time");
        }

        // 3. Block Past Slots if for today
        if (scheduleDateObj.toDateString() === now.toDateString()) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            if (toMinutes(startTime) <= currentMinutes) {
                throw new Error("Cannot assign/update slot in past time");
            }
        }

        // 4. Validate Assignment/Room
        const [existing] = await conn.query(
            `SELECT id FROM DoctorRoomMap WHERE id=? AND company=?`,
            [id, company]
        );

        if (existing.length === 0) throw new Error("Assignment not found for this company");

        const [rooms] = await conn.query(
            `SELECT status FROM Rooms WHERE id=? AND company=?`,
            [room_id, company]
        );

        if (rooms.length === 0 || rooms[0].status === 'inactive') {
            throw new Error("Room not found or is inactive");
        }

        // 5. Conflict Checks
        const conflictQuery = `
            SELECT id FROM DoctorRoomMap 
            WHERE doctor_id = ? 
            AND schedule_date = ? 
            AND id != ?
            AND from_time < ? 
            AND to_time > ?`;

        const [globalConflict] = await conn.query(
            conflictQuery,
            [doctor_id, schedule_date, id, endTime, startTime]
        );

        if (globalConflict.length > 0) {
            throw new Error(`Doctor ${doctor_name} already assigned on this date/time`);
        }

        const [unavailable] = await conn.query(
            `SELECT id FROM DoctorAvailability 
             WHERE doctor_id = ? 
             AND company = ? 
             AND unavailable_date = ?
             AND start_time < ? 
             AND end_time > ?`,
            [doctor_id, company, schedule_date, endTime, startTime]
        );

        if (unavailable.length > 0) {
            throw new Error(`Doctor ${doctor_name} unavailable at this time`);
        }

        // MAX PATIENT VALIDATION (OPTIONAL)
        let maxPatientsValue = null;

        if (max_patients !== undefined && max_patients !== null) {

            const patients = Number(max_patients);

            if (!Number.isInteger(patients) || patients <= 0) {
                throw new Error("max_patients must be a positive integer");
            }

            maxPatientsValue = patients;
        }

        // 6. Final Update
        await conn.query(`
            UPDATE DoctorRoomMap 
            SET doctor_id=?, 
                doctor_name=?, 
                company=?, 
                room_id=?, 
                schedule_date=?, 
                from_time=?, 
                to_time=?, 
                max_patients=?, 
                updated_by=?, 
                updated_at=NOW() 
            WHERE id=? 
            AND company=?`,
            [
                doctor_id,
                doctor_name,
                company,
                room_id,
                schedule_date,
                startTime,
                endTime,
                maxPatientsValue,
                user_id,
                id,
                company
            ]
        );

        await conn.commit();

        res.json({
            success: true,
            message: "Assignment updated successfully"
        });

    } catch (err) {

        await conn.rollback();

        console.error("UPDATE ERROR:", err);

        res.status(400).json({
            success: false,
            message: err.message
        });

    } finally {

        conn.release();

    }
};


// DELETE ASSIGNMENT
exports.deleteAssignment = async (req, res) => {

    const { id } = req.params;
    const { company } = req.body; // or req.query

    if (!company) {
        return res.status(400).json({
            success: false,
            message: "company is required"
        });
    }

    try {

        // Step 1 — fetch record before delete
        const [rows] = await pool.query(
            `SELECT * FROM DoctorRoomMap WHERE id=? AND company=?`,
            [id, company]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found for this company"
            });
        }

        const deletedData = rows[0];

        // Step 2 — delete
        await pool.query(
            `DELETE FROM DoctorRoomMap WHERE id=? AND company=?`,
            [id, company]
        );

        // Step 3 — return deleted record also
        res.json({
            success: true,
            message: "Assignment deleted successfully",
            deleted: deletedData
        });

    } catch (error) {

        console.error("DELETE ASSIGNMENT ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// comapney name and date then fetch to asign doctor
exports.getAssignmentsByCompanyDate = async (req, res) => {

    const { company, schedule_date } = req.query;

    if (!company || !schedule_date) {
        return res.status(400).json({
            success: false,
            message: "company and schedule_date are required"
        });
    }

    try {

        const [rows] = await pool.query(`
            SELECT 
                d.id,
                d.doctor_id,
                d.doctor_name,
                d.company,
                d.room_id,
                r.room_name,
                d.schedule_date,
                d.from_time,
                d.to_time,
                d.max_patients,
                d.created_at,
                d.updated_at
            FROM DoctorRoomMap d
            JOIN Rooms r 
                ON r.id = d.room_id 
                AND r.company = d.company
            WHERE d.company = ?
            AND d.schedule_date = ?
            ORDER BY d.from_time ASC
        `, [company, schedule_date]);

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });

    } catch (error) {

        console.error("FETCH ASSIGNMENTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// Get Assigned Doctors by Company + Date + Slot

exports.getAssignmentsBySlot = async (req, res) => {

    const { company, schedule_date, from_time, to_time } = req.query;

    if (!company || !schedule_date || !from_time || !to_time) {
        return res.status(400).json({
            success: false,
            message: "company, schedule_date, from_time and to_time are required"
        });
    }

    if (from_time >= to_time) {
        return res.status(400).json({
            success: false,
            message: "Invalid time slot"
        });
    }

    try {

        const [rows] = await pool.query(`
            SELECT 
                d.id,
                d.doctor_id,
                d.doctor_name,
                d.company,
                d.room_id,
                r.room_name,
                d.schedule_date,
                d.from_time,
                d.to_time,
                d.max_patients,
                d.created_at,
                d.updated_at
            FROM DoctorRoomMap d
            JOIN Rooms r 
                ON r.id = d.room_id
                AND r.company = d.company
            WHERE d.company = ?
            AND d.schedule_date = ?
            AND (
                (d.from_time <= ? AND d.to_time > ?)
                OR
                (d.from_time < ? AND d.to_time >= ?)
                OR
                (d.from_time >= ? AND d.to_time <= ?)
            )
            ORDER BY d.from_time ASC
        `, [
            company,
            schedule_date,
            from_time, from_time,
            to_time, to_time,
            from_time, to_time
        ]);

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });

    } catch (error) {

        console.error("FETCH SLOT ASSIGNMENTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// getAssignmentsByDoctor


exports.getAssignmentsByDoctorAndCompany = async (req, res) => {

    const { doctor_id, company, schedule_date } = req.query;

    if (!doctor_id || !company) {
        return res.status(400).json({
            success: false,
            message: "doctor_id and company are required"
        });
    }

    try {

        let query = `
            SELECT 
                d.id,
                d.doctor_id,
                d.doctor_name,
                d.company,
                d.room_id,
                r.room_name,
                d.schedule_date,
                d.from_time,
                d.to_time,
                d.max_patients,
                d.created_by,
                d.updated_by,
                d.created_at,
                d.updated_at
            FROM DoctorRoomMap d
            INNER JOIN Rooms r 
                ON d.room_id = r.id 
                AND d.company = r.company
            WHERE d.doctor_id = ? 
            AND d.company = ?
        `;

        const params = [doctor_id, company];

        if (schedule_date) {
            query += ` AND d.schedule_date = ?`;
            params.push(schedule_date);
        }

        query += ` ORDER BY d.schedule_date ASC, d.from_time ASC`;

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });

    } catch (error) {

        console.error("FETCH ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};