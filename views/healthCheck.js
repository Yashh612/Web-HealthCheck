
document.addEventListener("DOMContentLoaded", (event) => {

	const socket = io();
	const healthChecker = document.getElementById('healthChecker');
	const chartsContainer = document.getElementById('charts');
	const websiteCharts = {}; // Store charts for each website

	// Function to update system health display
	const updateSystemHealth = (healthData) => {
		const { memoryUsage, cpuLoad, uptime } = healthData;

		// Update the individual elements instead of replacing the entire innerHTML
		document.getElementById('memoryUsage').textContent = `${memoryUsage} KB`;
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
	
		// Get all chart containers as an array before removing the moved chart
		let chartElements = Array.from(chartsContainer.children);
	
		// Check if indices are valid and within bounds
		if (fromIndexInt < 0 || fromIndexInt >= chartElements.length || toIndexInt < 0) {
			console.error(`Invalid index values: fromIndex = ${fromIndexInt}, toIndex = ${toIndexInt}`);
			return;
		}
	
		// Get the chart being moved
		const movedChart = chartElements[fromIndexInt]; 
	
		// Check if movedChart exists to prevent errors
		if (!movedChart) {
			console.error(`Chart at index ${fromIndexInt} not found.`);
			return;
		}
	
		// Remove the dragged element from its current position
		chartsContainer.removeChild(movedChart);
	
		// Re-fetch the chart elements array after removal to update their positions
		chartElements = Array.from(chartsContainer.children);
	
		// Insert it before the target index or at the end if it's the last item
		if (toIndexInt >= chartElements.length) {
			// Append if the index is beyond the last element
			chartsContainer.appendChild(movedChart);
		} else {
			// Ensure that the target index exists before inserting
			const targetChart = chartElements[toIndexInt];
			if (targetChart) {
				chartsContainer.insertBefore(movedChart, targetChart);
			} else {
				console.error(`Target chart at index ${toIndexInt} not found.`);
			}
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
                <strong>Visit : <a class="text-[#3b82f6] underline underline-offset-1" href="${site}">${site}</a></strong><br />
                <strong>Memory Usage:</strong> <span id="memoryUsage" class="text-[#374151]">${memoryUsage} bytes</span><br />
                <strong>Uptime:</strong> <span id="uptime" class="text-[#374151]">${uptime.toFixed(2)} seconds</span><br />
                <strong>Health Status:</strong> 
				<span id="healthStatus" class="${healthStatus === 1 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'} font-bold">
					${healthStatus === 1 ? 'Healthy' : 'Unhealthy'}
				</span><br /><br />`;
			}
		});
	});


	const fetchWebsites = async () => {
		try {
			const response = await axios.get('/websites'); 
			const websites = response.data; 

			const container = document.getElementById('websites-container');
			container.innerHTML = ''; // Clear the container before adding new websites

			// Function to render websites
			const renderWebsites = () => {
				container.innerHTML = ''; 

				// Render each website
				websites.forEach((url, index) => {
					// Create a wrapper div for better layout control
					const websiteWrapper = document.createElement('div');
					websiteWrapper.style.display = 'flex'; 
					websiteWrapper.style.alignItems = 'center'; 
					websiteWrapper.style.marginBottom = '10px'; 
					websiteWrapper.draggable = true; 
					websiteWrapper.id = `website-${index}`;

					const dragIcon = document.createElement('img');
					dragIcon.src = 'https://cdn-icons-png.flaticon.com/256/8950/8950785.png'; 
					dragIcon.alt = 'Drag icon';
					dragIcon.style.width = '20px'; 
					dragIcon.style.marginRight = '5px';

					// Create main div for the website
					const websiteDiv = document.createElement('div');
					websiteDiv.textContent = url;
					websiteDiv.style.color = '#2C3E50'
					websiteDiv.classList.add('website-item'); 
					websiteDiv.style.flexGrow = '1';

					const deleteButtonContainer = document.createElement('div');
					deleteButtonContainer.id = url; 
					deleteButtonContainer.style.display = 'flex'; 
					deleteButtonContainer.style.alignItems = 'center'; 
					deleteButtonContainer.style.justifyContent = 'flex-end';

					// Create delete icon
					const deleteButton = document.createElement('i');
					deleteButton.className = 'fa fa-trash'; 
					deleteButton.style.color = '#E74C3C';
					deleteButton.style.margin = '0 5px'
					deleteButton.style.cursor = 'pointer'; 
					deleteButton.width = '20px';

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
								renderWebsites(); 
							} else {
								console.error('Failed to delete the website:', response.statusText);
							}
						} catch (error) {
							console.error('Error deleting the website:', error.response ? error.response.data : error.message);
						}
					};				
	
					// Add event listener to delete icon
					deleteButtonContainer.addEventListener('click', async (event) => {
						event.stopPropagation(); // Prevent the click from triggering other events
						await deleteWebsite(url); // Ensure you wait for the deletion to complete
					});

					// Create accordion panel for the website
					const websiteAccordianPanel = document.createElement('div');
					websiteAccordianPanel.id = `accord-${url}`;
					websiteAccordianPanel.style.display = 'none';
					websiteAccordianPanel.style.height = '100px';
					websiteAccordianPanel.style.width = '466px';
					websiteAccordianPanel.style.background = 'white';
					websiteAccordianPanel.style.padding = '5px 10px'
					websiteAccordianPanel.style.color = 'black';
					websiteAccordianPanel.style.border = '1px solid #ccc';
					websiteAccordianPanel.style.marginBottom = '10px';
					websiteAccordianPanel.textContent = `Details about ${url}`;

					// Toggle accordion panel
					websiteDiv.addEventListener('click', () => {
						websiteAccordianPanel.style.display = websiteAccordianPanel.style.display === 'block' ? 'none' : 'block';
					});
	
					websiteWrapper.addEventListener('dragstart', (e) => {
						e.dataTransfer.setData('text/plain', index);
					});

					websiteWrapper.addEventListener('dragover', (e) => {
						e.preventDefault(); 
					});

					websiteWrapper.addEventListener('drop', (e) => {
						e.preventDefault();
						const draggedIndex = e.dataTransfer.getData('text/plain'); // Get the dragged index
						const targetIndex = index; // The target index of the drop
						reorderWebsites(draggedIndex, targetIndex); // Call reorder function
					});

					// Append elements to the wrapper and container
					websiteWrapper.appendChild(dragIcon);
					websiteWrapper.appendChild(websiteDiv);
					// websiteWrapper.appendChild(deleteButton);
					deleteButtonContainer.appendChild(deleteButton);
					websiteWrapper.appendChild(deleteButtonContainer);
					container.appendChild(websiteWrapper);
					container.appendChild(websiteAccordianPanel);
				});				
			};

			// Function to reorder websites array and re-render
			const reorderWebsites = (fromIndex, toIndex) => {
				if (fromIndex === toIndex) return; // No change if same index
			
				// Get the item being moved
				const movedWebsite = websites[fromIndex];
			
				// Remove the item from its original position
				websites.splice(fromIndex, 1);
			
				// Adjust the target index based on whether we're moving up or down
				let adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
				
				websites.splice(adjustedToIndex, 0, movedWebsite);
				renderWebsites();
			
				// Call reorderCharts with the new adjusted indexes
				reorderCharts(fromIndex, adjustedToIndex);
			};
			
			// Initial call to render websites when the page loads
			renderWebsites();

		} catch (error) {
			console.error('Error fetching websites:', error.response ? error.response.data.message : error.message);
		}
	};

	// Call the fetchWebsites function on page load
	fetchWebsites();

	const renderMindMapper = () => {
		try {
			// Navigate to another page (URL)
			window.location.href = 'http://localhost:3000/run';
		} catch (error) {
			console.error('Error navigating to the new page:', error.message);
		}
	};
	document.getElementById('Mind-Mapping').addEventListener('click', renderMindMapper);
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