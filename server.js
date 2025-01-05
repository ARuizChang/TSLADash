const express = require('express');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse');
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
    
    try {
        const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
        
        parse(fileContent, {
            columns: false,
            skip_empty_lines: true,
            trim: true
        }, (err, rows) => {
            if (err) {
                console.error('Error parsing CSV:', err);
                return res.status(500).json({ error: 'Failed to parse data' });
            }

            // Skip header row and process data
            const processedData = rows.slice(1).map(row => ({
                date: row[1],
                open: parseFloat(row[2]),
                high: parseFloat(row[3]),
                low: parseFloat(row[4]),
                close: parseFloat(row[5]),
                volume: parseInt(row[7])
            })).filter(row => 
                !isNaN(row.open) && 
                !isNaN(row.close) && 
                !isNaN(row.high) && 
                !isNaN(row.low) &&
                !isNaN(row.volume)
            );

            res.json(processedData);
        });
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: 'Failed to read file' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 