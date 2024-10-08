
document.addEventListener("DOMContentLoaded", (event) => {


	const socket = io();
	const healthChecker = document.getElementById('healthChecker');
	const chartsContainer = document.getElementById('charts');
	const websiteCharts = {}; // Store charts for each website

	// Function to update system health display
	const updateSystemHealth = (healthData) => {
		const { memoryUsage, cpuLoad, uptime } = healthData;

		// Update the individual elements instead of replacing the entire innerHTML
		document.getElementById('memoryUsage').textContent = `${memoryUsage} bytes`;
		document.getElementById('cpuLoad').textContent = cpuLoad.join(', ');
		document.getElementById('uptime').textContent = `${uptime.toFixed(2)} seconds`;
	};

	// Function to create or update the chart for each website
	const updateChart = (site, history, responseTimes) => {
		// Create a new canvas for each site if it doesn't exist
		if (!websiteCharts[site]) {
			const canvas = document.createElement('canvas');
			canvas.id = site.replace(/https?:\/\//, '').replace(/\//g, '_');
			// canvas.classList = ;
			chartsContainer.appendChild(canvas);

			websiteCharts[site] = new Chart(canvas, {
				type: 'line',
				data: {
					labels: responseTimes.map((_, index) => `Check ${index + 1}`),
					datasets: [{
						label: site,
						data: responseTimes,
						borderColor: 'rgba(75, 192, 192, 1)',
						backgroundColor: 'rgba(75, 192, 192, 0.2)',
						pointBackgroundColor: history.map(h => h === 1 ? 'green' : 'red'),
						fill: false,
					}]
				},
				options: {
					responsive: false,
					maintainAspectRatio: false,
					scales: {
						x: {
							title: {
								display: true,
								text: 'Checks',
							},
						},
						y: {
							title: {
								display: true,
								text: 'Response Time (ms)',
							},
							beginAtZero: true,
						},
					},
				},
			});
		} else {
			// Update existing chart data
			const chart = websiteCharts[site];
			chart.data.labels = responseTimes.map((_, index) => `Check ${index + 1}`);
			chart.data.datasets[0].data = responseTimes;
			chart.data.datasets[0].pointBackgroundColor = history.map(h => h === 1 ? 'green' : 'red');
			chart.update(); // Update the chart with new data
		}
	};

	// Listen for status updates and update the charts
	socket.on('statusUpdate', ({ site, history, responseTimes }) => {
		updateChart(site, history, responseTimes);
	});

	// Listen for system health updates
	socket.on('systemHealthUpdate', (healthData) => {
		updateSystemHealth(healthData);
	});

	socket.on('websiteHealthUpdate', (healthData) => {
		// Loop through each website and update the corresponding accordion panel
		healthData.forEach(data => {
			const { site, memoryUsage, uptime, healthStatus } = data;
			// Find the accordion panel corresponding to the site
			const panel = document.getElementById(`accord-${site}`);
			if (panel) {
				// Update the panel's text content with the received health data
				panel.innerHTML = `
                <strong>Details about ${site}</strong><br />
                <strong>Memory Usage:</strong> <span id="memoryUsage">${memoryUsage} bytes</span><br />
                <strong>Uptime:</strong> <span id="uptime">${uptime.toFixed(2)} seconds</span><br />
                <strong>Health Status:</strong> <span id="healthStatus">${healthStatus === 1 ? 'Healthy' : 'Unhealthy'}</span><br /><br />`;
			}
		});
	});

	// Fetch websites from the API
	const fetchWebsites = async () => {
		try {
			const response = await axios.get('/websites'); // Use axios to fetch from the API
			const websites = response.data; // Get data directly from the response

			console.log(response, "Fetched websites:");

			const container = document.getElementById('websites-container');
			// Clear the container before adding new websites
			container.innerHTML = '';

			// Create a div for each website URL
			// Assuming you have already included Axios in your project

			// Assuming you have already included Axios in your project

			// Function to render websites
			const renderWebsites = () => {
				// Clear the container before re-rendering
				container.innerHTML = '';

				// Render each website
				websites.forEach(url => {
					// Create a wrapper div for better layout control
					const websiteWrapper = document.createElement('div');
					websiteWrapper.style.display = 'flex'; // Use flexbox for alignment
					websiteWrapper.style.alignItems = 'center'; // Center items vertically
					websiteWrapper.style.marginBottom = '10px'; // Add space between items

					// Create main div for the website
					const websiteDiv = document.createElement('div');
					websiteDiv.textContent = url;
					websiteDiv.id = String(url);
					websiteDiv.classList.add('website-item'); // Add a class for styling
					websiteDiv.style.flexGrow = '1'; // Allow the website div to grow and take available space

					// Create delete button
					const deleteButton = document.createElement('button');
					deleteButton.textContent = 'Delete'; // Set button text
					deleteButton.classList.add('delete-button'); // Add a class for styling

					// Style the delete button
					deleteButton.style.backgroundColor = 'red'; // Set background color to red
					deleteButton.style.color = 'white'; // Set text color to white
					deleteButton.style.border = 'none'; // Remove border
					deleteButton.style.padding = '5px 10px'; // Add some padding
					deleteButton.style.marginLeft = '10px'; // Add margin to separate it from the website div
					deleteButton.style.cursor = 'pointer'; // Change cursor on hover
					deleteButton.style.borderRadius = '4px'; // Rounded corners
					deleteButton.style.fontWeight = 'bold'; // Bold text

					// Function to handle deletion using Axios
					const deleteWebsite = async (websiteUrl) => {
						console.log(`Attempting to delete website: ${websiteUrl}`); // Debugging log
						try {
							const response = await axios.delete('/websites', {
								headers: {
									'Content-Type': 'application/json' // Set the Content-Type header
								},
								data: {
									url: websiteUrl // Send the URL in the request body
								}
							});
							console.log('Response:', response); // Debugging log
							if (response.status === 200) {
								console.log('Website deleted successfully:', websiteUrl);
								// Remove the website from the array
								websites.splice(websites.indexOf(websiteUrl), 1);
								window.location.reload();
								// Re-render the websites
								renderWebsites();
							} else {
								console.error('Failed to delete the website:', response.statusText);
							}
						} catch (error) {
							console.error('Error deleting the website:', error.response ? error.response.data : error.message);
						}
					};

					// Add event listener to delete button
					deleteButton.addEventListener('click', (event) => {
						event.stopPropagation(); // Prevent the click from triggering the accordion toggle
						deleteWebsite(url);
					});

					// Create accordion panel for the website
					const websiteAccordianPanel = document.createElement('div');
					websiteAccordianPanel.id = `accord-${url}`; // Set accordion id
					websiteAccordianPanel.style.display = 'none'; // Initially hide the panel
					websiteAccordianPanel.style.height = '100px';
					websiteAccordianPanel.style.width = '480px';
					websiteAccordianPanel.style.background = 'white';
					websiteAccordianPanel.style.color = 'black';
					websiteAccordianPanel.textContent = `Details about ${url}`; // Placeholder text

					// Event listener to toggle accordion visibility
					websiteDiv.addEventListener('click', () => {
						const isDisplayed = websiteAccordianPanel.style.display === 'block';
						websiteAccordianPanel.style.display = isDisplayed ? 'none' : 'block'; // Toggle visibility
					});

					// Append website div, delete button, and accordion panel to the wrapper
					websiteWrapper.appendChild(websiteDiv);
					websiteWrapper.appendChild(deleteButton); // Append the delete button
					container.appendChild(websiteWrapper); // Append the wrapper to the container
					container.appendChild(websiteAccordianPanel); // Append the accordion panel to the container
				});
			};

			// Initial call to render websites when the page loads
			renderWebsites();

		} catch (error) {
			console.error('Error fetching websites:', error.response ? error.response.data.message : error.message);
		}
	};

	// Call the fetchWebsites function on page load
	fetchWebsites();

	// Handling form submission to check website health
	document.getElementById('siteHealthForm').addEventListener('submit', async (event) => {
		event.preventDefault(); // Prevent form submission reload

		const urlInput = document.getElementById('url').value; // Get the URL from the input field

		try {
			// Make an HTTP POST request to the server to add the website
			const response = await axios.post('/websites', { url: urlInput });

			// Check if the site was successfully added
			if (response.status === 201) {
				console.log('Website added successfully:', response.data.url);
				alert('Website added successfully!');
				fetchWebsites(); // Refresh the website list after adding
			} else {
				console.error('Failed to add website:', response.data.message);
				alert('Failed to add website: ' + response.data.message);
			}
		} catch (error) {
			console.error('Error adding website:', error.response ? error.response.data.message : error.message);
			alert('Error adding website: ' + (error.response ? error.response.data.message : error.message));
		}
	});

	console.log("DOM fully loaded and parsed");
});