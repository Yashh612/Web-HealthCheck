// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');
// const axios = require('axios');
// const path = require('path'); // Import path module
// const os = require('os'); // Import OS module

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// // Sample websites to monitor
// const websites = [
//     'https://www.google.com',
//     'https://www.github.com',
//     'http://localhost:3000',
//     'http://localhost:8000',
// ];

// let websiteStatus = {};

// websites.forEach(site => {
//     websiteStatus[site] = {
//         history: [],
//         responseTimes: [],
//     };
// });

// // Function to check website health
// const checkWebsiteHealth = async () => {
//     for (const site of websites) {
//         const startTime = Date.now(); // Start time for response measurement
//         try {
//             await axios.get(site);
//             const responseTime = Date.now() - startTime; // Calculate response time
//             // console.log(`${site} is healthy, response time: ${responseTime} ms`);

//             // Store response time in websiteStatus
//             websiteStatus[site].responseTimes.push(responseTime);
//             if (websiteStatus[site].responseTimes.length > 5) {
//                 websiteStatus[site].responseTimes.shift(); // Keep only the last 5 response times
//             }

//             if (websiteStatus[site].history.length === 5) {
//                 websiteStatus[site].history.shift();
//             }
//             websiteStatus[site].history.push(1);
//             io.emit('statusUpdate', { site, history: websiteStatus[site].history, responseTimes: websiteStatus[site].responseTimes });
//         } catch (error) {
//             const responseTime = Date.now() - startTime; // Calculate response time even for failed requests
//             console.log(`${site} is unhealthy, response time: ${responseTime} ms`);

//             // Store response time in websiteStatus
//             websiteStatus[site].responseTimes.push(responseTime);
//             if (websiteStatus[site].responseTimes.length > 5) {
//                 websiteStatus[site].responseTimes.shift(); // Keep only the last 5 response times
//             }

//             if (websiteStatus[site].history.length === 5) {
//                 websiteStatus[site].history.shift();
//             }
//             websiteStatus[site].history.push(0);
//             io.emit('statusUpdate', { site, history: websiteStatus[site].history, responseTimes: websiteStatus[site].responseTimes });
//         }
//     }
// };

// // Function to check system health
// const checkSystemHealth = () => {
//     const memoryUsage = os.freemem(); // Get memory usage
//     const cpuLoad = os.loadavg(); // Get CPU load
//     const uptime = process.uptime(); // Get uptime in seconds
//     const systemHealth = {
//         memoryUsage,
//         cpuLoad,
//         uptime,
//     };
//     return systemHealth;
// };

// // Emit system health every 10 seconds
// setInterval(() => {
//     const systemHealth = checkSystemHealth();
//     io.emit('systemHealthUpdate', systemHealth); // Emit system health update to frontend
// }, 10000); // Check every 10 seconds

// // Periodically check website health
// setInterval(checkWebsiteHealth, 10000); // Check every 10 seconds

// // Serve static files
// app.use(express.static('public'));

// // Serve the index.html file when accessing the root URL
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html')); // Send the index.html file
// });

// // Start server
// server.listen(3000, () => {
//     console.log('Server is running on http://localhost:3000');
// });




///////////////////////////////////////////////////////////////////////////////////////////////////////////////////



const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path'); // Import path module
const os = require('os'); // Import OS module

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set view engine to EJS
app.set('view engine', 'ejs');

// Sample websites to monitor
const websites = [
    'https://www.google.com',
    'https://www.github.com',
    'http://localhost:3000',
    'http:localhost:8000',
];

let websiteStatus = {};

websites.forEach(site => {
    websiteStatus[site] = {
        history: [],
        responseTimes: [],
    };
});

// Function to check website health
const checkWebsiteHealth = async () => {
    for (const site of websites) {
        const startTime = Date.now(); 
        try {
            await axios.get(site);
            const responseTime = Date.now() - startTime; // Calculate response time
            // console.log(`${site} is healthy, response time: ${responseTime} ms`);

            // Store response time in websiteStatus
            websiteStatus[site].responseTimes.push(responseTime);
            if (websiteStatus[site].responseTimes.length > 5) {
                websiteStatus[site].responseTimes.shift(); // Keep only the last 5 response times
            }

            if (websiteStatus[site].history.length === 5) {
                websiteStatus[site].history.shift();
            }
            websiteStatus[site].history.push(1);
            io.emit('statusUpdate', { site, history: websiteStatus[site].history, responseTimes: websiteStatus[site].responseTimes });
        } catch (error) {
            const responseTime = Date.now() - startTime; // Calculate response time even for failed requests
            // console.log(`${site} is unhealthy, response time: ${responseTime} ms`);

            // Store response time in websiteStatus
            websiteStatus[site].responseTimes.push(responseTime);
            if (websiteStatus[site].responseTimes.length > 5) {
                websiteStatus[site].responseTimes.shift(); 
            }

            if (websiteStatus[site].history.length === 5) {
                websiteStatus[site].history.shift();
            }
            websiteStatus[site].history.push(0);
            io.emit('statusUpdate', { site, history: websiteStatus[site].history, responseTimes: websiteStatus[site].responseTimes });
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


app.get('/', (req, res) => {
    res.render('index'); 
});

// Serve static files from the public folder (for assets like JS/CSS)
app.use(express.static('public'));

// Start server
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
