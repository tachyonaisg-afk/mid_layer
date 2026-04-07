const pool = require('../config/db');

// exports.empanelDoctor = async (req, res) => {

//     const conn = await pool.getConnection();

//     try {

//         const {
//             company,
//             doctor_id,
//             doctor_name,
//             created_by
//         } = req.body;

//         if (!company || !doctor_id || !doctor_name) {
//             return res.status(400).json({
//                 success:false,
//                 message:"company, doctor_id, doctor_name required"
//             });
//         }

//         const [existing] = await conn.query(
//             `SELECT id FROM DoctorCompanyEmpanel
//              WHERE doctor_id = ? AND company = ?`,
//             [doctor_id, company]
//         );

//         if(existing.length > 0){
//             return res.json({
//                 success:false,
//                 message:"Doctor already empanelled for this company"
//             });
//         }

//         await conn.beginTransaction();

//         const [result] = await conn.query(
//             `INSERT INTO DoctorCompanyEmpanel
//             (company, doctor_id, doctor_name, created_by)
//             VALUES (?,?,?,?)`,
//             [
//                 company,
//                 doctor_id,
//                 doctor_name,
//                 created_by
//             ]
//         );

//         await conn.commit();

//         res.json({
//             success:true,
//             message:"Doctor empanelled successfully",
//             data:{
//                 id: result.insertId,
//                 company,
//                 doctor_id,
//                 doctor_name,
//                 status: "ACTIVE",
//                 isEmpanel: true   // return boolean
//             }
//         });

//     } catch(err){

//         await conn.rollback();

//         res.status(500).json({
//             success:false,
//             message:"Database error",
//             error:err.message
//         });

//     } finally{
//         conn.release();
//     }

// };



// get all empanelled doctors of a specific company

exports.empanelDoctor = async (req, res) => {

    const conn = await pool.getConnection();

    try {

        const { 
            company, 
            doctor_id, 
            doctor_name, 
            consultation_fee,
            created_by 
        } = req.body;

        if (!company || !doctor_id || !doctor_name) {
            return res.status(400).json({
                success: false,
                message: "company, doctor_id, doctor_name required"
            });
        }

        const fee = consultation_fee || 0;

        const [existing] = await conn.query(
            `SELECT id, isEmpanel
             FROM DoctorCompanyEmpanel
             WHERE doctor_id = ? AND company = ?`,
            [doctor_id, company]
        );

        await conn.beginTransaction();

        // CASE 1 : Doctor exists
        if (existing.length > 0) {

            const record = existing[0];

            if (record.isEmpanel === 1) {

                await conn.rollback();

                return res.json({
                    success: false,
                    message: "Doctor already empanelled for this company"
                });
            }

            await conn.query(
                `UPDATE DoctorCompanyEmpanel
                 SET 
                    isEmpanel = 1,
                    status = 'ACTIVE',
                    consultation_fee = ?
                 WHERE id = ?`,
                [fee, record.id]
            );

            const [updated] = await conn.query(
                `SELECT 
                    id,
                    company,
                    doctor_id,
                    doctor_name,
                    consultation_fee,
                    status,
                    isEmpanel
                 FROM DoctorCompanyEmpanel
                 WHERE id = ?`,
                [record.id]
            );

            await conn.commit();

            const data = updated[0];
            data.isEmpanel = Boolean(data.isEmpanel);

            return res.json({
                success: true,
                message: "Doctor empanelled again successfully",
                data
            });

        }

        // CASE 2 : New empanelment
        const [result] = await conn.query(
            `INSERT INTO DoctorCompanyEmpanel
            (company, doctor_id, doctor_name, consultation_fee, created_by)
            VALUES (?,?,?,?,?)`,
            [
                company,
                doctor_id,
                doctor_name,
                fee,
                created_by
            ]
        );

        const [rows] = await conn.query(
            `SELECT 
                id,
                company,
                doctor_id,
                doctor_name,
                consultation_fee,
                status,
                isEmpanel
             FROM DoctorCompanyEmpanel
             WHERE id = ?`,
            [result.insertId]
        );

        await conn.commit();

        const data = rows[0];
        data.isEmpanel = Boolean(data.isEmpanel);

        res.json({
            success: true,
            message: "Doctor empanelled successfully",
            data
        });

    } catch (err) {

        await conn.rollback();

        res.status(500).json({
            success: false,
            message: "Database error",
            error: err.message
        });

    } finally {
        conn.release();
    }
};

exports.getDoctorsByCompany = async (req, res) => {

    const conn = await pool.getConnection();

    try {

        const { company } = req.params;

        if (!company) {
            return res.status(400).json({
                success: false,
                message: "Company name required"
            });
        }

        const [rows] = await conn.query(
            `SELECT 
                id,
                company,
                doctor_id,
                doctor_name,
                status,
                consultation_fee,
                isEmpanel,
                created_by,
                created_at
            FROM DoctorCompanyEmpanel
            WHERE company = ?
            AND status = 'ACTIVE'
            AND isEmpanel = 1
            ORDER BY created_at DESC`,
            [company]
        );

        // convert 1/0 → true/false
        const formattedRows = rows.map(row => ({
            ...row,
            isEmpanel: row.isEmpanel === 1
        }));

        res.json({
            success: true,
            total: formattedRows.length,
            data: formattedRows
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: "Database error",
            error: err.message
        });

    } finally {
        conn.release();
    }

};

// for removing empanelled doctors of a specific company
exports.removeEmpanelDoctor = async (req, res) => {

    const conn = await pool.getConnection();

    try {

        const { company, doctor_id } = req.body;

        if (!company || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: "Company and Doctor ID required"
            });
        }

        const [result] = await conn.query(
            `UPDATE DoctorCompanyEmpanel
             SET isEmpanel = 0
             WHERE company = ?
             AND doctor_id = ?
             AND isEmpanel = 1`,
            [company, doctor_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found or already removed"
            });
        }

        res.json({
            success: true,
            message: "Doctor removed from empanelment successfully"
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: "Database error",
            error: err.message
        });

    } finally {
        conn.release();
    }
};

// doctor empanelment details using company + doctor_id

exports.getDoctorByCompanyAndDoctorId = async (req, res) => {

    const conn = await pool.getConnection();

    try {

        const { company, doctor_id } = req.params;

        if (!company || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: "company and doctor_id required"
            });
        }

        const [rows] = await conn.query(
            `SELECT 
                id,
                company,
                doctor_id,
                doctor_name,
                consultation_fee,
                status,
                isEmpanel,
                created_by,
                created_at,
                updated_by,
                updated_at
            FROM DoctorCompanyEmpanel
            WHERE company = ?
            AND doctor_id = ?`,
            [company, doctor_id]
        );

        if (rows.length === 0) {
            return res.json({
                success: false,
                message: "Doctor not found for this company"
            });
        }

        const data = rows[0];

        // Convert 1/0 → true/false
        data.isEmpanel = Boolean(data.isEmpanel);

        res.json({
            success: true,
            data
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: "Database error",
            error: err.message
        });

    } finally {
        conn.release();
    }
};


// Update Empanel Doctor

exports.updateEmpanelDoctor = async (req, res) => {

    const conn = await pool.getConnection();

    try {

        const {
            company,
            doctor_id,
            doctor_name,
            consultation_fee,
            status,
            updated_by
        } = req.body;

        if (!company || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: "company and doctor_id required"
            });
        }

        // Get existing record
        const [existing] = await conn.query(
            `SELECT * FROM DoctorCompanyEmpanel
             WHERE company = ? AND doctor_id = ?
             LIMIT 1`,
            [company, doctor_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found for this company"
            });
        }

        const record = existing[0];

        // IMPORTANT BUSINESS RULE
        if (record.isEmpanel === 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot update. Doctor is not empanelled for this company"
            });
        }

        if (record.status !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                message: "Cannot update. Doctor is not ACTIVE"
            });
        }

        let updateFields = [];
        let values = [];

        // Only update if changed
        if (doctor_name && doctor_name !== record.doctor_name) {
            updateFields.push("doctor_name = ?");
            values.push(doctor_name);
        }

        if (
            consultation_fee !== undefined &&
            Number(consultation_fee) !== Number(record.consultation_fee)
        ) {
            updateFields.push("consultation_fee = ?");
            values.push(consultation_fee);
        }

        if (status && status !== record.status) {
            updateFields.push("status = ?");
            values.push(status);
        }

        if (updated_by) {
            updateFields.push("updated_by = ?");
            values.push(updated_by);
        }

        // Nothing changed
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No changes detected"
            });
        }

        values.push(company, doctor_id);

        await conn.query(
            `UPDATE DoctorCompanyEmpanel
             SET ${updateFields.join(", ")}
             WHERE company = ? AND doctor_id = ?`,
            values
        );

        // Fetch updated record
        const [updated] = await conn.query(
            `SELECT 
                id,
                company,
                doctor_id,
                doctor_name,
                consultation_fee,
                status,
                isEmpanel,
                updated_by,
                updated_at
             FROM DoctorCompanyEmpanel
             WHERE company = ? AND doctor_id = ?
             LIMIT 1`,
            [company, doctor_id]
        );

        const data = updated[0];
        data.isEmpanel = Boolean(data.isEmpanel);

        res.json({
            success: true,
            message: "Doctor empanel details updated successfully",
            data
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: "Database error",
            error: err.message
        });

    } finally {
        conn.release();
    }
};



// DELETE Empanel Doctor (Permanent Delete)
exports.deleteEmpanelDoctor = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { company, doctor_id } = req.body;

        if (!company || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: "company and doctor_id required"
            });
        }

        // Check if record exists
        const [existing] = await conn.query(
            `SELECT id FROM DoctorCompanyEmpanel
             WHERE company = ? AND doctor_id = ?`,
            [company, doctor_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found for this company"
            });
        }

        await conn.beginTransaction();

        // HARD DELETE
        await conn.query(
            `DELETE FROM DoctorCompanyEmpanel
             WHERE company = ? AND doctor_id = ?`,
            [company, doctor_id]
        );

        await conn.commit();

        res.json({
            success: true,
            message: "Doctor empanel record deleted permanently"
        });

    } catch (err) {
        await conn.rollback();
        res.status(500).json({
            success: false,
            message: "Database error",
            error: err.message
        });
    } finally {
        conn.release();
    }
};