const pool = require('../config/db');


// Create Room
exports.createRoom = async (req, res) => {
    const { room_name, created_by, company } = req.body;

    if (!room_name || !created_by) {
        return res.status(400).json({
            success: false,
            message: "room_name and created_by are required"
        });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO Rooms (room_name, created_by, company, status) 
             VALUES (?, ?, ?, 'active')`,
            [room_name, created_by, company]
        );

        res.json({
            success: true,
            message: "Room created",
            data: {
                room_id: result.insertId,
                room_name,
                created_by,
                company,
                status: "active"   // ✅ added here
            }
        });

    } catch (err) {
        console.error("ROOM CREATE ERROR:", err);  

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Room already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: err.message   
        });
    }
};



// Get Rooms
exports.getRooms = async (req,res)=>{
    const { company } = req.query;

    if(!company){
        return res.status(400).json({
            success:false,
            message:"company is required"
        });
    }

    const [rows] = await pool.query(
        `SELECT * FROM Rooms WHERE company=?`,
        [company]
    );

    res.json({success:true,data:rows});
};


//  UPDATE ROOM
exports.updateRoom = async (req, res) => {
    const { id } = req.params;
    const { room_name, company, user_id } = req.body;

    if (!room_name || !user_id || !company) {
        return res.status(400).json({
            success: false,
            message: "room_name, company and user_id are required"
        });
    }

    try {

        // STEP 1 — verify room belongs to this company
        const [existing] = await pool.query(
            `SELECT id FROM Rooms WHERE id=? AND company=?`,
            [id, company]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success:false,
                message:"Room not found for this company"
            });
        }

        // STEP 2 — update ONLY room_name (company locked)
        await pool.query(
            `UPDATE Rooms 
             SET room_name = ?, 
                 updated_by = ?, 
                 updated_at = NOW()
             WHERE id = ?`,
            [room_name, user_id, id]
        );

        res.json({
            success: true,
            message: "Room updated successfully"
        });

    } catch (err) {
        console.error("ROOM UPDATE ERROR:", err);

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success:false,
                message:"Room name already exists in this company"
            });
        }

        res.status(500).json({
            success:false,
            message:"Database error"
        });
    }
};


//  DELETE ROOM
exports.deleteRoom = async (req, res) => {

    const { id } = req.params;
    const { company, user_id } = req.body;

    if (!company || !user_id) {
        return res.status(400).json({
            success:false,
            message:"company and user_id required"
        });
    }

    try {

        // ✅ Step 1 — verify room belongs to company
        const [room] = await pool.query(
            `SELECT * FROM Rooms WHERE id=? AND company=?`,
            [id, company]
        );

        if (room.length === 0) {
            return res.status(404).json({
                success:false,
                message:"Room not found for this company"
            });
        }

        const deletedRoom = room[0];

        // ✅ Step 2 — delete room permanently
        await pool.query(
            `DELETE FROM Rooms WHERE id=? AND company=?`,
            [id, company]
        );

        // ✅ Step 3 — response with deleted data
        res.json({
            success:true,
            message:"Room deleted permanently",
            deleted: deletedRoom
        });

    } catch (err) {

        console.error("ROOM DELETE ERROR:", err);

        res.status(500).json({
            success:false,
            message:"Database error"
        });
    }
};


// CHANGE ROOM STATUS (ACTIVE / INACTIVE)
exports.changeRoomStatus = async (req, res) => {
    const { id } = req.params;
    const { status, user_id, company } = req.body;

    // validation
    if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Status must be 'active' or 'inactive'"
        });
    }

    if (!user_id || !company) {
        return res.status(400).json({
            success: false,
            message: "user_id and company are required"
        });
    }

    try {

        // STEP 1 — verify room belongs to company
        const [existing] = await pool.query(
            `SELECT id FROM Rooms WHERE id=? AND company=?`,
            [id, company]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success:false,
                message:"Room not found for this company"
            });
        }

        // STEP 2 — update status
        await pool.query(
            `UPDATE Rooms 
             SET status = ?, 
                 updated_by = ?, 
                 updated_at = NOW()
             WHERE id = ?`,
            [status, user_id, id]
        );

        res.json({
            success: true,
            message: `Room ${status} successfully`
        });

    } catch (err) {
        console.error("ROOM STATUS ERROR:", err);
        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// getRoomByCompanyAndId

// Get room by company and room ID
exports.getRoomByCompanyAndId = async (req, res) => {
    const { company, room_id } = req.query; // query params

    if (!company || !room_id) {
        return res.status(400).json({
            success: false,
            message: "company and room_id are required"
        });
    }

    try {
        const [rows] = await pool.query(
            `SELECT * FROM Rooms WHERE id = ? AND company = ?`,
            [room_id, company]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Room not found for this company"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (err) {
        console.error("GET ROOM ERROR:", err);
        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};