const express = require('express');
const initDB = require('./config/init');

const app = express();
app.use(express.json());

app.use('/appointments', require('./routes/appointment.routes'));


(async () => {
    await initDB();
    app.listen(3008, () =>
        console.log('Server running at http://localhost:3008')
    );
})();
