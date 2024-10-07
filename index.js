const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const os = require('os'); // Import OS module
const { log } = require('console');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set view engine to EJS
app.set('view engine', 'ejs');

app.use(express.json()); // Add this line


// Sample websites to monitor
const websites = [
    'https://www.google.com',
    'https://www.github.com',
    'http://localhost:3000',
    'http://localhost:8000',
];

let websiteStatus = {};

// Initialize status object for each website
websites.forEach(site => {
    websiteStatus[site] = {
        history: [],
        responseTimes: [],
    };
});

// Function to check website health
const checkWebsiteHealth = async () => {
    for (const site of websites) {
        // Ensure the websiteStatus for the site is initialized
        if (!websiteStatus[site]) {
            websiteStatus[site] = {
                history: [],
                responseTimes: []
            };
        }

        const startTime = Date.now();
        try {
            await axios.get(site);
            const responseTime = Date.now() - startTime; // Calculate response time

            // Store response time and update history
            websiteStatus[site].responseTimes.push(responseTime);
            if (websiteStatus[site].responseTimes.length > 5) {
                websiteStatus[site].responseTimes.shift(); // Keep only the last 5 response times
            }

            if (websiteStatus[site].history.length === 5) {
                websiteStatus[site].history.shift(); // Keep only the last 5 health checks
            }
            websiteStatus[site].history.push(1); // Healthy

            // Emit status update to the frontend
            io.emit('statusUpdate', {
                site,
                history: websiteStatus[site].history,
                responseTimes: websiteStatus[site].responseTimes
            });
        } catch (error) {
            const responseTime = Date.now() - startTime; // Calculate response time even for failed requests

            // Store response time and update history
            websiteStatus[site].responseTimes.push(responseTime);
            if (websiteStatus[site].responseTimes.length > 5) {
                websiteStatus[site].responseTimes.shift();
            }

            if (websiteStatus[site].history.length === 5) {
                websiteStatus[site].history.shift();
            }
            websiteStatus[site].history.push(0); // Unhealthy

            // Emit status update to the frontend
            io.emit('statusUpdate', {
                site,
                history: websiteStatus[site].history,
                responseTimes: websiteStatus[site].responseTimes
            });
        }
    }
};

// Function to check system health
const checkSystemHealth = () => {
    const memoryUsage = os.freemem(); // Get memory usage
    const cpuLoad = os.loadavg(); // Get CPU load
    const uptime = process.uptime(); // Get uptime in seconds
    const systemHealth = {
        memoryUsage,
        cpuLoad,
        uptime,
    };
    return systemHealth;
};

// Emit system health every 10 seconds
setInterval(() => {
    const systemHealth = checkSystemHealth();
    io.emit('systemHealthUpdate', systemHealth); // Emit system health update to frontend
}, 10000); // Check every 10 seconds

// Periodically check website health
setInterval(checkWebsiteHealth, 10000); // Check every 10 seconds

// Serve the index page
app.get('/', (req, res) => {
    const systemHealth = checkSystemHealth(); // Get system health
    res.render('index', {
        systemHealth, // Pass the systemHealth object to the EJS template
        websites,
    });
});

app.get('/websites', (req, res)=>{
    res.json(websites);
})

app.post('/websites', (req, res) => {

    if (!req.body || !req.body.url) {
        return res.status(400).json({ message: 'URL is required.' });
    }

    console.log(req.body, "=====");
    

    const { url } = req.body;

    // Validate the URL
    try {
        const validatedUrl = new URL(url); 
        const siteString = validatedUrl.href; 

        // Check if the site already exists
        if (websites.includes(siteString)) {
            return res.status(400).json({ message: 'Site already exists.' });
        }

        // Add the new site to the websites array
        websites.push(siteString);
        websiteStatus[siteString] = { history: [], responseTimes: [] }; // Initialize status for the new site

        console.log(`Added new site: ${siteString}`);
        res.status(201).json({ message: 'Site added successfully.', url: siteString });

        // Start checking the health of the new site
        checkWebsiteHealth(siteString);
    } catch (error) {
        return res.status(400).json({ message: 'Invalid URL.' });
    }
});

// API endpoint to update a website link
app.put('/websites/:index', (req, res) => {
    const { index } = req.params;
    const { url } = req.body;

    // Validate the index
    const siteIndex = parseInt(index, 10);
    if (isNaN(siteIndex) || siteIndex < 0 || siteIndex >= websites.length) {
        return res.status(404).json({ message: 'Website not found.' });
    }

    // Validate the new URL
    try {
        const validatedUrl = new URL(url);
        websites[siteIndex] = validatedUrl.href; // Update the website link
        return res.status(200).json({ message: 'Website updated successfully.', url: validatedUrl.href });
    } catch (error) {
        return res.status(400).json({ message: 'Invalid URL.' });
    }
});

// API endpoint to delete a website
app.delete('/websites/:index', (req, res) => {
    const { index } = req.params;

    // Validate the index
    const siteIndex = parseInt(index, 10);
    if (isNaN(siteIndex) || siteIndex < 0 || siteIndex >= websites.length) {
        return res.status(404).json({ message: 'Website not found.' });
    }

    // Remove the website from the list
    const deletedSite = websites.splice(siteIndex, 1);
    return res.status(200).json({ message: 'Website deleted successfully.', deleted: deletedSite[0] });
});

// Serve static files from the public folder (for assets like JS/CSS)
app.use(express.static('public'));

// Start server
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

////////////////////////////////////////////////////////////////////////////////////////