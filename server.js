const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parse');
const app = express();

// Serve static files
app.use(express.static('public'));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for Tesla stock data
app.get('/api/tesla-data', (req, res) => {
    const csvFilePath = path.join(__dirname, 'public', 'data', 'TESLA.csv');
    
    fs.readFile(csvFilePath, 'utf-8', (err, fileContent) => {
        if (err) {
            console.error('Error reading CSV file:', err);
            return res.status(500).json({ error: 'Failed to read data' });
        }

        csv.parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        }, (err, data) => {
            if (err) {
                console.error('Error parsing CSV:', err);
                return res.status(500).json({ error: 'Failed to parse data' });
            }

            // Process the data
            const processedData = data.map(row => ({
                date: row.Date,
                open: parseFloat(row.Open),
                high: parseFloat(row.High),
                low: parseFloat(row.Low),
                close: parseFloat(row.Close),
                volume: parseInt(row.Volume)
            }));

            res.json(processedData);
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 