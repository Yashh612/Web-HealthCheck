
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
	const updateChart = (site, history, responseTimes, index) => {
		// Create a new canvas for each site if it doesn't exist
		if (!websiteCharts[site]) {
			const chartContainer = document.createElement('div');
			chartContainer.classList.add('bg-white', 'rounded-lg', 'h-fit', 'w-[49%]'); // Background and padding for each chart
			chartContainer.draggable = true; // Make chart container draggable
			chartContainer.setAttribute('data-index', index); // Assign data-index for tracking
	
			const canvas = document.createElement('canvas');
			canvas.id = site.replace(/https?:\/\//, '').replace(/\//g, '_');
			canvas.style.width = '100%';
			canvas.style.height = '250px';
	
			chartContainer.appendChild(canvas);
			chartsContainer.appendChild(chartContainer);
	
			// Initialize the chart
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
								text: 'Monitor',
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
	
			// Drag-and-drop handlers for charts
			chartContainer.addEventListener('dragstart', (e) => {
				e.dataTransfer.setData('text/plain', index); // Set the index as drag data
			});
	
			chartContainer.addEventListener('dragover', (e) => {
				e.preventDefault(); // Allow dropping
			});
	
			chartContainer.addEventListener('drop', (e) => {
				e.preventDefault();
				const draggedIndex = e.dataTransfer.getData('text/plain'); // Get the dragged index from dataTransfer
				const targetIndex = chartContainer.getAttribute('data-index'); // Get the target index from the container's data attribute
				reorderCharts(draggedIndex, targetIndex); // Call reorder function
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
	
	const reorderCharts = (fromIndex, toIndex) => {
		const fromIndexInt = parseInt(fromIndex, 10); // Convert to integer
		const toIndexInt = parseInt(toIndex, 10); // Convert to integer
	
		const chartElements = Array.from(chartsContainer.children); // Get all chart containers as an array
		const movedChart = chartElements[fromIndexInt]; // Get the dragged chart container
	
		// Remove the dragged element and insert it before the target index
		chartsContainer.removeChild(movedChart);
		
		// Insert before the correct target or at the end if toIndex is the last element
		if (toIndexInt >= chartElements.length) {
			chartsContainer.appendChild(movedChart);
		} else {
			chartsContainer.insertBefore(movedChart, chartElements[toIndexInt]);
		}
	
		// Update the data-index attribute for all chart containers after reordering
		Array.from(chartsContainer.children).forEach((child, i) => {
			child.setAttribute('data-index', i);
		});
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


	const fetchWebsites = async () => {
		try {
			const response = await axios.get('/websites'); // Use axios to fetch from the API
			const websites = response.data; // Get data directly from the response

			const container = document.getElementById('websites-container');
			container.innerHTML = ''; // Clear the container before adding new websites

			// Function to render websites
			const renderWebsites = () => {
				container.innerHTML = ''; // Clear the container before re-rendering

				// Render each website
				websites.forEach((url, index) => {
					// Create a wrapper div for better layout control
					const websiteWrapper = document.createElement('div');
					websiteWrapper.style.display = 'flex'; // Use flexbox for alignment
					websiteWrapper.style.alignItems = 'center'; // Center items vertically
					websiteWrapper.style.marginBottom = '10px'; // Add space between items
					websiteWrapper.draggable = true; // Make it draggable
					websiteWrapper.id = `website-${index}`; // Assign unique ID

					// Create main div for the website
					const websiteDiv = document.createElement('div');
					websiteDiv.textContent = url;
					websiteDiv.classList.add('website-item'); // Add a class for styling
					websiteDiv.style.flexGrow = '1'; // Allow the website div to grow and take available space

					// Create delete button
					const deleteButton = document.createElement('button');
					deleteButton.textContent = 'Delete'; // Set button text
					deleteButton.classList.add('delete-button'); // Add a class for styling
					// Add styles for delete button
					deleteButton.style.backgroundColor = 'red';
					deleteButton.style.color = 'white';
					deleteButton.style.border = 'none';
					deleteButton.style.padding = '5px 10px';
					deleteButton.style.marginLeft = '10px';
					deleteButton.style.cursor = 'pointer';
					deleteButton.style.borderRadius = '4px';
					deleteButton.style.fontWeight = 'bold';

					// Function to handle deletion
					const deleteWebsite = async (websiteUrl) => {
						try {
							const response = await axios.delete('/websites', {
								headers: {
									'Content-Type': 'application/json'
								},
								data: {
									url: websiteUrl
								}
							});
							if (response.status === 200) {
								websites.splice(websites.indexOf(websiteUrl), 1);
								renderWebsites(); // Re-render websites after deletion
							} else {
								console.error('Failed to delete the website:', response.statusText);
							}
						} catch (error) {
							console.error('Error deleting the website:', error.response ? error.response.data : error.message);
						}
					};

					// Add event listener to delete button
					deleteButton.addEventListener('click', (event) => {
						event.stopPropagation(); // Prevent the click from triggering other events
						deleteWebsite(url);
					});

					// Create accordion panel for the website
					const websiteAccordianPanel = document.createElement('div');
					websiteAccordianPanel.id = `accord-${url}`;
					websiteAccordianPanel.style.display = 'none';
					websiteAccordianPanel.style.height = '100px';
					websiteAccordianPanel.style.width = '466px';
					websiteAccordianPanel.style.background = 'white';
					websiteAccordianPanel.style.color = 'black';
					websiteAccordianPanel.style.border = '1px solid #ccc';
					websiteAccordianPanel.style.marginBottom = '10px';
					websiteAccordianPanel.textContent = `Details about ${url}`;

					// Toggle accordion panel
					websiteDiv.addEventListener('click', () => {
						websiteAccordianPanel.style.display = websiteAccordianPanel.style.display === 'block' ? 'none' : 'block';
					});

					// Drag and Drop Handlers
					websiteWrapper.addEventListener('dragstart', (e) => {
						e.dataTransfer.setData('text/plain', index); // Set the index as drag data
					});

					websiteWrapper.addEventListener('dragover', (e) => {
						e.preventDefault(); // Allow dropping
					});

					websiteWrapper.addEventListener('drop', (e) => {
						e.preventDefault();
						const draggedIndex = e.dataTransfer.getData('text/plain'); // Get the dragged index
						const targetIndex = index; // The target index of the drop
						reorderWebsites(draggedIndex, targetIndex); // Call reorder function
					});

					// Append elements to the wrapper and container
					websiteWrapper.appendChild(websiteDiv);
					websiteWrapper.appendChild(deleteButton);
					container.appendChild(websiteWrapper);
					container.appendChild(websiteAccordianPanel);
				});
			};

			// Function to reorder websites array and re-render
			const reorderWebsites = (fromIndex, toIndex) => {
				if (fromIndex === toIndex) return; // If the dragged and dropped positions are the same, do nothing
			
				// Get the item being moved
				const movedWebsite = websites[fromIndex];
			
				// Remove the item from its original position
				websites.splice(fromIndex, 1);
			
				// Insert the item at the new position
				if (fromIndex < toIndex) {
					// If moving down, insert at the new position after removal
					websites.splice(toIndex, 0, movedWebsite);
				} else {
					// If moving up, insert before the target index
					websites.splice(toIndex, 0, movedWebsite);
				}
			
				// Re-render the websites after the reorder
				renderWebsites();
			
				// If you have a reorderCharts function, call it here
				reorderCharts(fromIndex, toIndex);
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
				document.getElementById('url').value = '';
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


});