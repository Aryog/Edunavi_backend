const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();
app.use(express.json());
const connection_url = process.env.MONGODB_CONNECTION_URL
mongoose.connect(connection_url);

const db = mongoose.connection;
db.on('error', (error) => {
    console.log(error);
})
db.once('open', () => {
    console.log('Connected to DB')
})

app.use('/api', require('./Routes/uniroute'))
const port = process.env.PORT || 3000;

// Start the Express server
app.get('/', (req, res) => {
    res.status(200).send({ message: "Server is UP" });
})
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});