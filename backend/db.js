const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

// Helper function to read the JSON file
const readDB = () => {
    const data = fs.readFileSync(dbPath);
    return JSON.parse(data);
};

// Helper function to write to the JSON file
const writeDB = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

module.exports = { readDB, writeDB };