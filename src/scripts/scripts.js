// ===================== Helper Functions =====================

// Fetch public IP
async function fetchPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (response.ok) {
            const data = await response.json();
            return data.ip;
        }
        throw new Error('Failed to fetch IP');
    } catch (error) {
        console.error("IP detection error:", error);
        throw error;
    }
}

// Get IP info from ipinfo.io
async function getIPInfo(ip = '') {
    const IPINFO_TOKEN = "a0ebe3e94c3c74";
    try {
        const url = ip ? `https://ipinfo.io/${ip}/json?token=${IPINFO_TOKEN}` : `https://ipinfo.io/json?token=${IPINFO_TOKEN}`;
        console.log("Fetching from:", url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received data:", data);
        return data;
    } catch (error) {
        console.error("Error fetching IP info:", error);
        throw error;
    }
}

// Show/hide loading
function showLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'none';
}

// Show message
function showMessage(message, isError = false) {
    alert(message); // Simple alert for now
}

// ===================== DOM Content Loaded =====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - setting up event listeners");

    // ===================== index.html functionality =====================
    const ipInput = document.getElementById("ipInput");
    const getInfoBtn = document.getElementById("getInfoBtn");
    const detectIPLink = document.getElementById("detectPublicIP");

    if (ipInput && getInfoBtn && detectIPLink) {
        console.log("Home page elements found");

        // Analyze IP button
        getInfoBtn.addEventListener("click", function() {
            const ip = ipInput.value.trim();
            console.log("Analyze IP clicked with:", ip);
            
            if (ip) {
                // Basic validation
                const ipRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
                if (!ipRegex.test(ip)) {
                    showMessage("Please enter a valid IP address format (e.g., 8.8.8.8)", true);
                    return;
                }
                
                sessionStorage.setItem("selectedIP", ip);
                showLoading();
                setTimeout(() => {
                    window.location.href = "location-info.html";
                }, 500);
            } else {
                showMessage("Please enter an IP address", true);
            }
        });

        // Detect My IP button
        detectIPLink.addEventListener("click", async function(e) {
            e.preventDefault();
            console.log("Detect My IP clicked");
            
            detectIPLink.textContent = "Detecting...";
            detectIPLink.disabled = true;

            try {
                const publicIP = await fetchPublicIP();
                if (publicIP) {
                    ipInput.value = publicIP;
                    console.log("Detected IP:", publicIP);
                    showMessage(`Your public IP is: ${publicIP}`);
                }
            } catch (error) {
                console.error("Failed to detect IP:", error);
                showMessage("Could not detect your IP. Please enter it manually.", true);
            } finally {
                detectIPLink.textContent = "Detect My IP";
                detectIPLink.disabled = false;
            }
        });

        // Enter key support
        ipInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                getInfoBtn.click();
            }
        });
    }

    // ===================== location-info.html functionality =====================
    if (window.location.pathname.includes('location-info.html') || document.querySelector('.location-info-page')) {
        console.log("Location info page detected");
        
        showLoading();

        // Get the IP to lookup
        const ipToLookup = sessionStorage.getItem("selectedIP") || '';
        console.log("Looking up IP:", ipToLookup);

        // Fetch and display IP info
        fetchAndDisplayIPInfo(ipToLookup);
    }
});

// Main function to fetch and display IP info
async function fetchAndDisplayIPInfo(ip = '') {
  try {
    console.log("Fetching IP info for:", ip);
    const data = await getIPInfo(ip);

    // ==== IP Address ====
    document.getElementById("ipDisplay").innerHTML = `
      <span class="ip-value">${data.ip || "Unknown"}</span>
      <span class="ip-type">${data.ip && data.ip.includes(":") ? "IPv6" : "IPv4"}</span>
    `;

    // ==== Location Info ====
    document.getElementById("countryValue").textContent = data.country || "—";
    document.getElementById("cityValue").textContent = data.city || "—";
    document.getElementById("regionValue").textContent = data.region || "—";
    document.getElementById("coordinatesValue").textContent = data.loc || "—";
    document.getElementById("addressValue").textContent =
      data.city && data.region && data.country
        ? `${data.city}, ${data.region}, ${data.country}`
        : "—";

    // ==== Network Info ====
    document.getElementById("ispValue").textContent = data.org || "—";
    document.getElementById("orgValue").textContent = data.org || "—";
    document.getElementById("hostnameValue").textContent = data.hostname || "—";

    // ==== Time Info ====
    document.getElementById("timezoneValue").textContent = data.timezone || "—";

    // Calculate local time and UTC offset if timezone exists
    if (data.timezone) {
      const now = new Date().toLocaleString("en-US", { timeZone: data.timezone });
      const utcOffset = new Date().getTimezoneOffset() / -60;
      document.getElementById("localTimeValue").textContent = now;
      document.getElementById("utcOffsetValue").textContent = `UTC${utcOffset >= 0 ? "+" : ""}${utcOffset}`;
    }

    // ==== Map ====
    if (data.loc) {
      initializeMap(data.loc, data.ip, data.city, data.country);
    } else {
      document.getElementById("mapContainer").innerHTML = "<p>Map data unavailable</p>";
    }

    hideLoading();
  } catch (error) {
    console.error("Error fetching IP info:", error);
    hideLoading();
    showMessage("Error fetching IP information.", true);
  }
}


// Initialize map
function initializeMap(locationString, ip, city, country) {
  const mapContainer = document.getElementById("mapContainer");
  if (!mapContainer || !locationString) return;

  const [lat, lon] = locationString.split(",").map(coord => parseFloat(coord));

  // Clear map container
  mapContainer.innerHTML = "";
  const map = L.map(mapContainer).setView([lat, lon], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  L.marker([lat, lon])
    .addTo(map)
    .bindPopup(`${ip}<br>${city || ""}, ${country || ""}`)
    .openPopup();
}

// Show error on page
function showErrorOnPage(error) {
    const ipElement = document.querySelector('.location-info-ipaddress h2');
    const moreInfoElement = document.querySelector('.location-info-moreinfo');
    const mapElement = document.querySelector('.location-info-map');
    
    if (ipElement) {
        ipElement.textContent = 'Error Loading IP Information';
    }
    
    if (moreInfoElement) {
        moreInfoElement.innerHTML = `
            <h2>Error</h2>
            <br>
            <p><strong>Message:</strong> ${error.message}</p>
            <p>Please check your internet connection and try again.</p>
        `;
    }
    
    if (mapElement) {
        mapElement.innerHTML = '<p>Map unavailable due to error</p>';
    }
}