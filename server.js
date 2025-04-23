const express = require('express');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const app = express();

dotenv.config();
app.use(express.json());

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

connection.connect(err => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to database.');
});


const createTableQuery = `
  CREATE TABLE IF NOT EXISTS schooldata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    address VARCHAR(255),
    latitude FLOAT,
    longitude FLOAT
  )
`;
connection.query(createTableQuery, err => {
  if (err) console.error('Error creating table:', err);
});


app.post('/addSchool', (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  if (!name || !address || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'Invalid input. Please provide name, address, latitude, and longitude.' });
  }

  const insertQuery = `
    INSERT INTO schooldata (name, address, latitude, longitude)
    VALUES (?, ?, ?, ?)
  `;

  connection.query(insertQuery, [name, address, latitude, longitude], (err, result) => {
    if (err) {
      console.error('Error inserting school:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'School added successfully', schoolId: result.insertId });
  });
});


const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = angle => (angle * Math.PI) / 180;
    const R = 6371;
  
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
  
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };
  
  app.get('/listSchools', (req, res) => {
    const { lat, lon } = req.query;
  
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
  
    connection.query('SELECT * FROM schooldata', (err, results) => {
      if (err) {
        console.error('Error fetching schools:', err);
        return res.status(500).json({ error: 'Database error' });
      }
  
      const sortedSchools = results.map(school => {
        const distance = haversineDistance(
          parseFloat(lat),
          parseFloat(lon),
          parseFloat(school.latitude),
          parseFloat(school.longitude)
        );
        return { ...school, distance };
      }).sort((a, b) => a.distance - b.distance);
  
      res.json(sortedSchools);
    });
  });

  app.delete('/deleteAllSchools', (req, res) => {
    const deleteQuery = 'DELETE FROM schooldata';
  
    connection.query(deleteQuery, (err, result) => {
      if (err) {
        console.error('Error deleting schools:', err);
        return res.status(500).json({ error: 'Database error' });
      }
  
      res.status(200).json({ message: 'All school records deleted successfully', affectedRows: result.affectedRows });
    });
  });
  


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
