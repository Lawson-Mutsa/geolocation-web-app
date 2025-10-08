// ===================== Helper Functions =====================

// Detect private/reserved IPs
function isPrivateOrReservedIP(ip) {
    if (!ip || typeof ip !== "string") return false;
    ip = ip.trim();

    // IPv4 private ranges
    const ipv4Private = [
        /^127\./, // loopback
        /^10\./,
        /^192\.168\./,
        /^169\.254\./, // link-local
        /^172\.(1[6-9]|2\d|3[0-1])\./ // 172.16.0.0 - 172.31.255.255
    ];
    for (const re of ipv4Private) if (re.test(ip)) return true;

    // IPv6 reserved examples
    const ipv6Reserved = [
        /^::1$/, // loopback
        /^fe80:/i, // link-local
        /^fc00:/i, // unique local
        /^fd00:/i // unique local
    ];
    for (const re of ipv6Reserved) if (re.test(ip)) return true;

    return false;
}

// Fetch public IP from multiple services as fallback
async function fetchPublicIP() {
    const services = [
        'https://api.ipify.org?format=json',
        'https://api64.ipify.org?format=json',
        'https://ipinfo.io/json'
    ];

    for (const service of services) {
        try {
            const response = await fetch(service, {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.ip || data.ipAddress;
            }
        } catch (error) {
            console.warn(`Service ${service} failed:`, error);
            // Continue to next service
            continue;
        }
    }
    
    throw new Error('All IP detection services failed');
}

// Reverse geocode lat/lon using OpenCage
async function getAddress(lat, lon) {
    try {
        const OPEN_CAGE_KEY = "c34f8f29d49046e682961e89db45199e";
        const res = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${OPEN_CAGE_KEY}`);
        
        if (!res.ok) {
            throw new Error(`OpenCage API error: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
            return data.results[0].formatted;
        } else {
            return "Address not found";
        }
    } catch (err) {
        console.error("Geocoding error:", err);
        return "Address lookup failed";
    }
}

// Initialize map with error handling
function initializeMap(container, lat, lon, popupText) {
    try {
        // Ensure container has proper dimensions
        container.style.height = '400px';
        container.style.width = '100%';
        container.style.borderRadius = '8px';
        container.style.marginTop = '20px';

        const map = L.map(container).setView([lat, lon], 10);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(map);

        L.marker([lat, lon])
            .addTo(map)
            .bindPopup(popupText)
            .openPopup();

        return map;
    } catch (error) {
        console.error('Map initialization error:', error);
        container.innerHTML = '<p>Error loading map. Please try refreshing the page.</p>';
        return null;
    }
}

// ===================== DOM Content Loaded =====================
document.addEventListener('DOMContentLoaded', function() {
    // ===================== index.html functionality =====================
    const ipInput = document.getElementById("ipInput");
    const getInfoBtn = document.getElementById("getInfoBtn");
    const detectIPLink = document.getElementById("detectPublicIP");

    if (ipInput && getInfoBtn && detectIPLink) {
        console.log("Home page elements found, setting up event listeners...");

        // Normal lookup button
        getInfoBtn.addEventListener("click", handleGetInfoClick);

        // Detect public IP button/link and fill input field
        detectIPLink.addEventListener("click", handleDetectIPClick);

        // Allow form submission with Enter key
        ipInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                handleGetInfoClick();
            }
        });

        function handleGetInfoClick() {
            const ip = ipInput.value.trim();
            console.log("Get info clicked with IP:", ip);
            
            if (ip) {
                // Basic IP format validation
                const ipRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
                
                if (!ipRegex.test(ip)) {
                    alert("Please enter a valid IP address format (IPv4 or IPv6).");
                    return;
                }

                sessionStorage.setItem("selectedIP", ip);
                window.location.href = "location-info.html";
            } else {
                alert("Please enter an IP address.");
            }
        }

        async function handleDetectIPClick(e) {
            e.preventDefault();
            console.log("Detect IP clicked");
            
            const originalText = detectIPLink.textContent;
            detectIPLink.textContent = "Detecting your public IP...";
            detectIPLink.style.pointerEvents = "none";
            detectIPLink.style.opacity = "0.7";

            try {
                const publicIP = await fetchPublicIP();
                if (publicIP) {
                    ipInput.value = publicIP;
                    console.log("Detected public IP:", publicIP);
                    
                    // Optional: Auto-submit after detection
                    // sessionStorage.setItem("selectedIP", publicIP);
                    // window.location.href = "location-info.html";
                } else {
                    throw new Error("Public IP not found");
                }
            } catch (err) {
                console.error("IP detection error:", err);
                alert("Could not detect your public IP automatically. Please check your internet connection and try again, or enter your IP manually.");
            } finally {
                detectIPLink.textContent = originalText;
                detectIPLink.style.pointerEvents = "auto";
                detectIPLink.style.opacity = "1";
            }
        }
    }

    // ===================== location-info.html functionality =====================
    if (document.querySelector(".location-info-ipaddress")) {
        console.log("Location info page detected");
        
        const IPINFO_TOKEN = "a0ebe3e94c3c74";
        const ipAddressDiv = document.querySelector(".location-info-ipaddress h2");
        const moreInfoDiv = document.querySelector(".location-info-moreinfo");
        const mapDiv = document.querySelector(".location-info-map");

        // Ensure map div has proper styling
        if (mapDiv) {
            mapDiv.style.height = '400px';
            mapDiv.style.width = '100%';
            mapDiv.style.marginTop = '20px';
            mapDiv.style.borderRadius = '8px';
            mapDiv.style.backgroundColor = '#f8f9fa';
            mapDiv.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #666;">Loading map...</div>';
        }

        async function fetchIPInfo(ip) {
            try {
                console.log("Fetching info for IP:", ip);

                // Handle private/reserved IPs
                if (ip && isPrivateOrReservedIP(ip)) {
                    showPrivateIPMessage(ip);
                    return;
                }

                // Fetch IP info from ipinfo.io
                const url = ip ? `https://ipinfo.io/${ip}/json?token=${IPINFO_TOKEN}` : `https://ipinfo.io/json?token=${IPINFO_TOKEN}`;
                console.log("Fetching from URL:", url);
                
                const res = await fetch(url);
                
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                
                const data = await res.json();
                console.log("IP info data:", data);

                displayIPInfo(data);

            } catch (err) {
                console.error("Error fetching IP info:", err);
                showErrorPage(err);
            }
        }

        function showPrivateIPMessage(ip) {
            ipAddressDiv.textContent = `IP Address: ${ip} (Private/Reserved IP)`;
            moreInfoDiv.innerHTML = `
                <h2>More Information</h2>
                <p style="color: #e74c3c; font-weight: 500;">
                    Location information is not available for private IP addresses.
                </p>
                <p>Private IPs are used within local networks and cannot be geolocated.</p>
                
                <div id="manualIPSection" style="margin-top: 2vh; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
                    <p style="margin-bottom: 10px; font-weight: 500;">Try these options instead:</p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <input type="text" id="manualIPInput" placeholder="Enter a public IP address" 
                                   style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; width: 200px; margin-right: 8px;">
                            <button id="lookupIPBtn" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Lookup Public IP
                            </button>
                        </div>
                        <div>
                            <button id="geoLocateBtn" style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                📍 Use My Browser Location
                            </button>
                        </div>
                    </div>
                </div>
            `;

            setupAlternativeOptions();
        }

        function setupAlternativeOptions() {
            const manualInput = document.getElementById("manualIPInput");
            const lookupBtn = document.getElementById("lookupIPBtn");
            const geoBtn = document.getElementById("geoLocateBtn");

            lookupBtn.addEventListener("click", () => {
                const publicIp = manualInput.value.trim();
                if (publicIp) {
                    if (isPrivateOrReservedIP(publicIp)) {
                        alert("This appears to be a private IP. Please enter a public IP address.");
                        return;
                    }
                    fetchIPInfo(publicIp);
                } else {
                    alert("Please enter a public IP address.");
                }
            });

            manualInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    lookupBtn.click();
                }
            });

            geoBtn.addEventListener("click", handleGeolocation);
        }

        function handleGeolocation() {
            if (!navigator.geolocation) {
                alert("Geolocation is not supported by your browser.");
                return;
            }
            
            const geoBtn = document.getElementById("geoLocateBtn");
            geoBtn.textContent = "Getting your location...";
            geoBtn.disabled = true;
            geoBtn.style.opacity = "0.7";

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        const address = await getAddress(lat, lon);

                        ipAddressDiv.textContent = `Your Current Location`;
                        moreInfoDiv.innerHTML = `
                            <h2>More Information</h2>
                            <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lon.toFixed(6)}</p>
                            <p><strong>Address:</strong> ${address}</p>
                            <p><strong>Accuracy:</strong> ${pos.coords.accuracy} meters</p>
                            <p><strong>Source:</strong> Browser Geolocation</p>
                        `;

                        // Clear and initialize map
                        mapDiv.innerHTML = '';
                        initializeMap(
                            mapDiv, 
                            lat, 
                            lon, 
                            `Your Location<br>Accuracy: ${pos.coords.accuracy}m`
                        );

                    } catch (error) {
                        console.error("Geolocation display error:", error);
                        alert("Error displaying location information.");
                    } finally {
                        geoBtn.textContent = "📍 Use My Browser Location";
                        geoBtn.disabled = false;
                        geoBtn.style.opacity = "1";
                    }
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    let errorMessage = "Unable to get your location. ";
                    
                    switch (err.code) {
                        case err.PERMISSION_DENIED:
                            errorMessage += "Please allow location access and try again.";
                            break;
                        case err.POSITION_UNAVAILABLE:
                            errorMessage += "Location information is unavailable.";
                            break;
                        case err.TIMEOUT:
                            errorMessage += "Location request timed out.";
                            break;
                        default:
                            errorMessage += "Please try again.";
                    }
                    
                    alert(errorMessage);
                    geoBtn.textContent = "📍 Use My Browser Location";
                    geoBtn.disabled = false;
                    geoBtn.style.opacity = "1";
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                }
            );
        }

        function displayIPInfo(data) {
            // Update IP address display
            ipAddressDiv.textContent = `IP Address: ${data.ip || "Unknown"}`;

            // Handle case where location data is not available
            if (!data.loc) {
                moreInfoDiv.innerHTML = `
                    <h2>More Information</h2>
                    <p style="color: #e67e22;">Precise location information is not available for this IP.</p>
                    <p><strong>Country:</strong> ${data.country || 'Unknown'}</p>
                    <p><strong>City:</strong> ${data.city || 'Unknown'}</p>
                    <p><strong>ISP:</strong> ${data.org || 'Unknown'}</p>
                    <p><strong>Timezone:</strong> ${data.timezone || 'Unknown'}</p>
                    ${data.hostname ? `<p><strong>Hostname:</strong> ${data.hostname}</p>` : ''}
                `;
                
                // Show world map
                mapDiv.innerHTML = '';
                initializeMap(mapDiv, 0, 0, "Location data not available");
                return;
            }

            // Process location data
            const [lat, lon] = data.loc.split(",").map(Number);
            
            // Display basic info while fetching address
            moreInfoDiv.innerHTML = `
                <h2>More Information</h2>
                <p><strong>Country:</strong> ${data.country || 'Unknown'}</p>
                <p><strong>City:</strong> ${data.city || 'Unknown'}</p>
                <p><strong>Location:</strong> Loading address...</p>
                <p><strong>ISP:</strong> ${data.org || 'Unknown'}</p>
                <p><strong>Timezone:</strong> ${data.timezone || 'Unknown'}</p>
                ${data.hostname ? `<p><strong>Hostname:</strong> ${data.hostname}</p>` : ''}
            `;

            // Fetch and display address, then initialize map
            getAddress(lat, lon).then(address => {
                moreInfoDiv.innerHTML = `
                    <h2>More Information</h2>
                    <p><strong>Country:</strong> ${data.country || 'Unknown'}</p>
                    <p><strong>City:</strong> ${data.city || 'Unknown'}</p>
                    <p><strong>Location:</strong> ${address}</p>
                    <p><strong>ISP:</strong> ${data.org || 'Unknown'}</p>
                    <p><strong>Timezone:</strong> ${data.timezone || 'Unknown'}</p>
                    ${data.hostname ? `<p><strong>Hostname:</strong> ${data.hostname}</p>` : ''}
                `;

                // Initialize map with the location
                mapDiv.innerHTML = '';
                initializeMap(
                    mapDiv, 
                    lat, 
                    lon, 
                    `IP: ${data.ip}<br>${data.city ? data.city + ', ' : ''}${data.country || ''}`
                );
            });
        }

        function showErrorPage(error) {
            ipAddressDiv.textContent = "Unable to Fetch IP Information";
            moreInfoDiv.innerHTML = `
                <h2>Error</h2>
                <p style="color: #e74c3c;">We encountered an issue while fetching the IP information.</p>
                <p><strong>Details:</strong> ${error.message}</p>
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 5px; border: 1px solid #ffeaa7;">
                    <p><strong>Possible solutions:</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Check your internet connection</li>
                        <li>Verify the IP address is correct</li>
                        <li>Try refreshing the page</li>
                        <li>Try using browser location instead</li>
                    </ul>
                </div>
            `;
            
            // Add retry button
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Try Again';
            retryButton.style.padding = '10px 20px';
            retryButton.style.marginTop = '15px';
            retryButton.style.background = '#3498db';
            retryButton.style.color = 'white';
            retryButton.style.border = 'none';
            retryButton.style.borderRadius = '5px';
            retryButton.style.cursor = 'pointer';
            
            retryButton.addEventListener('click', () => {
                const ipToLookup = sessionStorage.getItem("selectedIP") || "";
                fetchIPInfo(ipToLookup);
            });
            
            moreInfoDiv.appendChild(retryButton);
        }

        // Get IP from sessionStorage and fetch info
        const ipToLookup = sessionStorage.getItem("selectedIP") || "";
        console.log("Looking up IP from sessionStorage:", ipToLookup);
        fetchIPInfo(ipToLookup);
        
        // Clear the stored IP after use (optional - comment out if you want to keep it)
        // sessionStorage.removeItem("selectedIP");
    }
});