const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set view engine to EJS
app.set('view engine', 'ejs');
app.use(express.static('views'))

app.use(express.json());

// Sample websites to monitor
const websites = [
    'https://www.google.com',
    'https://www.github.com',
    'http://localhost:8000',
    'http://localhost:3000',
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
            const responseTime = Date.now() - startTime;

            // Store response time and update history
            websiteStatus[site].responseTimes.push(responseTime);
            if (websiteStatus[site].responseTimes.length > 5) {
                websiteStatus[site].responseTimes.shift();
            }

            if (websiteStatus[site].history.length === 5) {
                websiteStatus[site].history.shift();
            }
            websiteStatus[site].history.push(1); // Healthy

            // Emit status update to the frontend
            io.emit('statusUpdate', {
                site,
                history: websiteStatus[site].history,
                responseTimes: websiteStatus[site].responseTimes
            });
        } catch (error) {
            const responseTime = Date.now() - startTime;

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
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = totalMemory - freeMemory;
    const cpuLoad = os.loadavg()
    const uptime = process.uptime(); 
    return {
        memoryUsage,
        uptime,
        cpuLoad,
        totalMemory,
        freeMemory
        
    };    
};

// Emit system health every 10 seconds
setInterval(() => {
    const systemHealth = checkSystemHealth();
    io.emit('systemHealthUpdate', systemHealth);
}, 10000);

// Periodically check website health
setInterval(checkWebsiteHealth, 10000);

// New function to emit memory usage, uptime, and health status for each website
const emitWebsiteHealth = () => {
    const siteHealthData = websites.map(site => {
        const { memoryUsage, uptime } = checkSystemHealth(); // Get system health
        
        // Get the last health status (0 or 1) from the websiteStatus object
        const healthStatus = websiteStatus[site].history[websiteStatus[site].history.length - 1] || 0;

        return {
            site,
            memoryUsage,
            uptime,
            healthStatus, // Add health status to the returned object
        };
    });

    // Emit the data to the connected clients
    io.emit('websiteHealthUpdate', siteHealthData); // Emit the site health data
};

// Call this function at regular intervals or based on specific triggers
setInterval(emitWebsiteHealth, 5000); // Adjust the interval as needed

// Serve the index page
app.get('/', (req, res) => {
    const systemHealth = checkSystemHealth();
    res.render('healthCheck', {
        systemHealth,
        websites,
    });
});

// API endpoints for websites
app.get('/websites', (req, res) => {
    res.json(websites);
});

app.post('/websites', (req, res) => {
    if (!req.body || !req.body.url) {
        return res.status(400).json({ message: 'URL is required.' });
    }

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
        websiteStatus[siteString] = { history: [], responseTimes: [] };

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
        websites[siteIndex] = validatedUrl.href;
        return res.status(200).json({ message: 'Website updated successfully.', url: validatedUrl.href });
    } catch (error) {
        return res.status(400).json({ message: 'Invalid URL.' });
    }
});

// API endpoint to delete a website
app.delete('/websites', (req, res) => {
    const { url } = req.body; // Get the URL from the request body
    // Validate that the URL is provided
    if (!url) {
        return res.status(400).json({ message: 'URL is required.' });
    }
    // Find the index of the website using the URL
    const siteIndex = websites.findIndex(site => site === url);

    // Validate the index
    if (siteIndex === -1) {
        return res.status(404).json({ message: 'Website not found.' });
    }
    // Remove the website from the list
    const deletedSite = websites.splice(siteIndex, 1);
    return res.status(200).json({ message: 'Website deleted successfully.', deleted: deletedSite[0] });
});



// Serve static files from the public folder (for assets like JS/CSS)
// app.use(express.static('public'));

// Start server
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
