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
    console.log("Message:", message, "Error:", isError);
    alert(message);
}

// ===================== SAVE SEARCH FUNCTIONALITY =====================

function setupSaveSearchButton() {
    console.log("=== SETUP SAVE SEARCH BUTTON ===");
    
    const saveSearchBtn = document.getElementById("saveSearchBtn");
    console.log("Save button element:", saveSearchBtn);
    
    if (!saveSearchBtn) {
        console.error("Save search button not found!");
        return;
    }
    
    console.log("Save button found, adding event listener...");
    
    // Remove any existing event listeners and add new one
    const newBtn = saveSearchBtn.cloneNode(true);
    saveSearchBtn.parentNode.replaceChild(newBtn, saveSearchBtn);
    
    document.getElementById("saveSearchBtn").addEventListener("click", function() {
        console.log("🎯 SAVE SEARCH BUTTON CLICKED! 🎯");
        
        // Get all the current data
        const ip = document.querySelector("#ipDisplay .ip-value")?.textContent?.trim() || "";
        const ipType = document.querySelector("#ipDisplay .ip-type")?.textContent?.trim() || "IPv4";
        
        console.log("IP to save:", ip);
        
        if (!ip || ip === "Loading..." || ip === "Unknown") {
            showMessage("No valid IP data to save. Please wait for data to load.", true);
            return;
        }

        const country = document.getElementById("countryValue")?.textContent?.trim() || "—";
        const city = document.getElementById("cityValue")?.textContent?.trim() || "—";
        const region = document.getElementById("regionValue")?.textContent?.trim() || "—";
        const coordinates = document.getElementById("coordinatesValue")?.textContent?.trim() || "—";
        const isp = document.getElementById("ispValue")?.textContent?.trim() || "—";

        const search = {
            id: Date.now(),
            ip, 
            ipType,
            country, 
            city, 
            region, 
            coordinates,
            isp,
            timestamp: new Date().toISOString()
        };

        console.log("Search data to save:", search);

        // Save to localStorage
        let searches = JSON.parse(localStorage.getItem("recentSearches") || "[]");
        console.log("Existing searches before:", searches);
        
        // Remove duplicates
        searches = searches.filter(s => s.ip !== ip);
        
        // Add to beginning
        searches.unshift(search);
        
        // Keep only last 20
        searches = searches.slice(0, 20);
        
        localStorage.setItem("recentSearches", JSON.stringify(searches));
        showMessage(`Search saved for IP: ${ip}`);
        
        console.log("Search saved successfully! Total searches now:", searches.length);
        console.log("Updated searches:", searches);
    });
    
    console.log("Save search button setup complete!");
}

// ===================== RECENT SEARCHES FUNCTIONALITY =====================

function loadRecentSearches() {
    console.log("Loading recent searches...");
    
    const searches = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    console.log("Found searches:", searches);
    
    const totalSearchesElem = document.getElementById("totalSearches");
    const uniqueCountriesElem = document.getElementById("uniqueCountries");
    const lastSearchElem = document.getElementById("lastSearch");
    const recentListElem = document.getElementById("recentList");
    const clearHistoryBtn = document.getElementById("clearHistoryBtn");

    // Update stats
    if (totalSearchesElem) totalSearchesElem.textContent = searches.length;
    if (uniqueCountriesElem) {
        const uniqueCountries = [...new Set(searches.map(s => s.country).filter(c => c && c !== "—"))];
        uniqueCountriesElem.textContent = uniqueCountries.length;
    }
    if (lastSearchElem) {
        lastSearchElem.textContent = searches.length > 0 ? 
            new Date(searches[0].timestamp).toLocaleDateString() : "—";
    }

    // Update list
    if (recentListElem) {
        if (searches.length === 0) {
            recentListElem.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <h3>No Recent Searches</h3>
                    <p>Your IP search history will appear here.</p>
                    <a href="index.html" class="action-btn primary">
                        <span class="btn-icon">🔍</span>
                        Start Searching
                    </a>
                </div>`;
        } else {
            recentListElem.innerHTML = searches.map(search => `
                <div class="recent-search-card">
                    <div class="search-card-header">
                        <div class="search-ip-info">
                            <span class="ip-address">${search.ip}</span>
                            <span class="ip-type-badge">${search.ipType}</span>
                        </div>
                        <span class="search-date">${new Date(search.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="search-card-content">
                        <div class="search-location">
                            <span class="location-icon">📍</span>
                            ${search.city !== "—" ? search.city + ", " : ""}${search.country !== "—" ? search.country : "Unknown location"}
                        </div>
                        <div class="search-isp">${search.isp !== "—" ? search.isp : "Unknown ISP"}</div>
                    </div>
                    <div class="search-card-actions">
                        <button class="view-search-btn action-btn" onclick="viewSearch('${search.ip}')">
                            <span class="btn-icon">🔍</span>
                            View Details
                        </button>
                        <button class="delete-search-btn action-btn secondary" onclick="deleteSearch(${search.id})">
                            <span class="btn-icon">🗑️</span>
                        </button>
                    </div>
                </div>
            `).join("");
        }
    }

    // Clear history button
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", function() {
            if (searches.length === 0) {
                showMessage("No searches to clear");
                return;
            }
            
            if (confirm("Clear all recent searches?")) {
                localStorage.removeItem("recentSearches");
                showMessage("All searches cleared");
                setTimeout(() => window.location.reload(), 1000);
            }
        });
    }
}

function viewSearch(ip) {
    console.log("Viewing search for IP:", ip);
    sessionStorage.setItem("selectedIP", ip);
    window.location.href = "location-info.html";
}

function deleteSearch(searchId) {
    console.log("Deleting search:", searchId);
    if (confirm("Delete this search?")) {
        let searches = JSON.parse(localStorage.getItem("recentSearches") || "[]");
        searches = searches.filter(search => search.id !== searchId);
        localStorage.setItem("recentSearches", JSON.stringify(searches));
        showMessage("Search deleted");
        setTimeout(() => window.location.reload(), 500);
    }
}

// ===================== MAIN PAGE DETECTION =====================

document.addEventListener('DOMContentLoaded', function() {
    console.log("=== DOM CONTENT LOADED ===");
    console.log("Current page:", window.location.pathname);

    // Home page functionality
    const ipInput = document.getElementById("ipInput");
    const getInfoBtn = document.getElementById("getInfoBtn");
    const detectIPLink = document.getElementById("detectPublicIP");

    if (ipInput && getInfoBtn && detectIPLink) {
        console.log("Setting up home page");
        
        getInfoBtn.addEventListener("click", function() {
            const ip = ipInput.value.trim();
            if (ip) {
                const ipRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
                if (!ipRegex.test(ip)) {
                    showMessage("Please enter a valid IP address", true);
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

        detectIPLink.addEventListener("click", async function(e) {
            e.preventDefault();
            detectIPLink.textContent = "Detecting...";
            detectIPLink.disabled = true;
            try {
                const publicIP = await fetchPublicIP();
                if (publicIP) {
                    ipInput.value = publicIP;
                    showMessage(`Your public IP is: ${publicIP}`);
                }
            } catch (error) {
                showMessage("Could not detect your IP", true);
            } finally {
                detectIPLink.textContent = "Detect My IP";
                detectIPLink.disabled = false;
            }
        });
    }

    // Location info page functionality
    if (window.location.pathname.includes('location-info.html')) {
        console.log("=== LOCATION INFO PAGE DETECTED ===");
        showLoading();

        const ipToLookup = sessionStorage.getItem("selectedIP") || '';
        console.log("Looking up IP:", ipToLookup);
        
        // Fetch and display IP info
        fetchAndDisplayIPInfo(ipToLookup);

        // Setup save button after data loads
        setTimeout(() => {
            console.log("Setting up save search button...");
            setupSaveSearchButton();
        }, 1500);

        // New search button
        const newSearchBtn = document.getElementById("newSearchBtn");
        if (newSearchBtn) {
            newSearchBtn.addEventListener("click", () => {
                window.location.href = "index.html";
            });
        }

        // Copy buttons
        setupCopyButtons();
    }

    // Recent searches page functionality
    if (window.location.pathname.includes('recent-searches.html')) {
        console.log("=== RECENT SEARCHES PAGE DETECTED ===");
        loadRecentSearches();
    }
});

// ===================== COPY BUTTONS =====================

function setupCopyButtons() {
    console.log("Setting up copy buttons...");
    
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => showMessage("Copied to clipboard!"))
            .catch(() => showMessage("Failed to copy.", true));
    }

    const copyIpBtn = document.getElementById("copyIpBtn");
    if (copyIpBtn) {
        copyIpBtn.addEventListener("click", () => {
            const ip = document.querySelector("#ipDisplay .ip-value")?.textContent || "";
            copyToClipboard(ip);
        });
    }

    const copyLocationBtn = document.getElementById("copyLocationBtn");
    if (copyLocationBtn) {
        copyLocationBtn.addEventListener("click", () => {
            const country = document.getElementById("countryValue")?.textContent || "";
            const city = document.getElementById("cityValue")?.textContent || "";
            const region = document.getElementById("regionValue")?.textContent || "";
            const coordinates = document.getElementById("coordinatesValue")?.textContent || "";
            const address = document.getElementById("addressValue")?.textContent || "";
            const locationInfo = `Country: ${country}\nCity: ${city}\nRegion: ${region}\nCoordinates: ${coordinates}\nAddress: ${address}`;
            copyToClipboard(locationInfo);
        });
    }

    const copyNetworkBtn = document.getElementById("copyNetworkBtn");
    if (copyNetworkBtn) {
        copyNetworkBtn.addEventListener("click", () => {
            const isp = document.getElementById("ispValue")?.textContent || "";
            const org = document.getElementById("orgValue")?.textContent || "";
            const hostname = document.getElementById("hostnameValue")?.textContent || "";
            const networkInfo = `ISP: ${isp}\nOrganization: ${org}\nHostname: ${hostname}`;
            copyToClipboard(networkInfo);
        });
    }

    const copyTimeBtn = document.getElementById("copyTimeBtn");
    if (copyTimeBtn) {
        copyTimeBtn.addEventListener("click", () => {
            const timezone = document.getElementById("timezoneValue")?.textContent || "";
            const localTime = document.getElementById("localTimeValue")?.textContent || "";
            const utcOffset = document.getElementById("utcOffsetValue")?.textContent || "";
            const timeInfo = `Timezone: ${timezone}\nLocal Time: ${localTime}\nUTC Offset: ${utcOffset}`;
            copyToClipboard(timeInfo);
        });
    }
}

// ===================== IP INFO DISPLAY =====================

async function fetchAndDisplayIPInfo(ip = '') {
    try {
        console.log("Fetching IP info for:", ip || 'current IP');
        const data = await getIPInfo(ip);

        console.log("Updating DOM with IP data...");

        // Update all display elements
        document.getElementById("ipDisplay").innerHTML = `
            <span class="ip-value">${data.ip || "Unknown"}</span>
            <span class="ip-type">${data.ip && data.ip.includes(":") ? "IPv6" : "IPv4"}</span>
        `;
        document.getElementById("countryValue").textContent = data.country || "—";
        document.getElementById("cityValue").textContent = data.city || "—";
        document.getElementById("regionValue").textContent = data.region || "—";
        document.getElementById("coordinatesValue").textContent = data.loc || "—";
        document.getElementById("addressValue").textContent =
            data.city && data.region && data.country
                ? `${data.city}, ${data.region}, ${data.country}`
                : "—";
        document.getElementById("ispValue").textContent = data.org || "—";
        document.getElementById("orgValue").textContent = data.org || "—";
        document.getElementById("hostnameValue").textContent = data.hostname || "—";
        document.getElementById("timezoneValue").textContent = data.timezone || "—";
        
        if (data.timezone) {
            const now = new Date().toLocaleString("en-US", { timeZone: data.timezone });
            const utcOffset = new Date().getTimezoneOffset() / -60;
            document.getElementById("localTimeValue").textContent = now;
            document.getElementById("utcOffsetValue").textContent = `UTC${utcOffset >= 0 ? "+" : ""}${utcOffset}`;
        }
        
        if (data.loc) {
            initializeMap(data.loc, data.ip, data.city, data.country);
        } else {
            document.getElementById("mapContainer").innerHTML = "<p>Map data unavailable</p>";
        }
        
        hideLoading();
        console.log("IP info display complete - data is ready!");
        
    } catch (error) {
        console.error("Error fetching IP info:", error);
        hideLoading();
        showMessage("Error fetching IP information", true);
    }
}

function initializeMap(locationString, ip, city, country) {
    const mapContainer = document.getElementById("mapContainer");
    if (!mapContainer || !locationString) return;

    const [lat, lon] = locationString.split(",").map(coord => parseFloat(coord));
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