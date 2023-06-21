// var express = require('express');
// var app = express();
// var sql = require('./mySqlConnection');
// var mongo = require('./mongodb');

// app.use(express.static('public'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

// pp.post('/members', (req, res) => {
//     const { name, address, phone, feePaymentOption, age } = req.body;
//     // Insert member into the database
//     res.status(201).json({ message: 'Member added successfully' });
// });

// // Serve the HTML file
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });


// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });