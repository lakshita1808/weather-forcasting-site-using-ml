// Global state and constants (फॉर मॉक डेटा)
// Hum ab bhi mock data rakhenge, lekin live prediction se temp ko overwrite kar denge.
const WEATHER_MOCK_DATA = {
    city: "New Delhi",
    country: "IN",
    temp: 32,
    feels_like: 34,
    temp_min: 25,
    temp_max: 38,
    humidity: 45,
    wind_speed: 18,
    weather_condition: "Clear", // Weather condition के लिए
    description: "Partly Cloudy",
    precipitation: "0%",
    aqi_value: 165,
    dew_point: 20,
    wind_direction: "WNW",
    // मॉडाल कंटेंट के लिए विस्तारित डिटेल्स
    extended_details: {
        pressure: "1012 hPa",
        visibility: "10 km",
        cloudiness: "40%",
        uv_index: "0 (Low)",
        sunrise: "06:41 AM",
        sunset: "05:33 PM"
    }
};
// --- NEW LIVE API CONFIGURATION ---
const OPENWEATHER_API_KEY = "c7c94aaaa39619a7b585888656944eb1d"; // <--- Aapki OpenWeatherMap Key
const FORECAST_API_URL = "https://api.openweathermap.org/data/2.5/forecast";
// --- END NEW LIVE API CONFIGURATION ---
// **[START CHANGE 1/3: API URL DEFINE KARNA]**
const API_URL = 'http://127.0.0.1:5000/api/predict_next'; 
// **[END CHANGE 1/3]**

/**
 * यह जांचता है कि अभी रात का समय है या नहीं (शाम 6 बजे से सुबह 6 बजे तक रात).
 */
function isNightTime() {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
}

// मौसम और समय के आधार पर बैकग्राउंड रंग और एनिमेशन कॉन्फ़िगरेशन
const BACKGROUND_CONFIG = {
    "Clear": { 
        day: { color: '#4a90e2', animation: 'sun' }, // दिन में साफ मौसम के लिए नीला और सूरज की रोशनी
        night: { color: '#151d3b', animation: 'stars' } // रात में साफ मौसम के लिए गहरा नीला और तारे
    },
    "Clouds": { 
        day: { color: '#3f5d7d', animation: 'none' },
        night: { color: '#33445c', animation: 'none' }
    },
    "Rain": { 
        day: { color: '#1e385c', animation: 'rain' },
        night: { color: '#1a2c48', animation: 'rain' }
    },
    "Drizzle": { 
        day: { color: '#1e385c', animation: 'rain' },
        night: { color: '#1a2c48', animation: 'rain' }
    },
    "Thunderstorm": { 
        day: { color: '#151d3b', animation: 'rain' }, // बिजली के लिए rain animation
        night: { color: '#0f1429', animation: 'rain' }
    },
    "Snow": { 
        day: { color: '#4a5d73', animation: 'snow' },
        night: { color: '#3a4a5d', animation: 'snow' }
    },
    // डिफ़ॉल्ट या अन्य स्थितियों के लिए
    "Mist": { day: { color: '#5e738d', animation: 'none' }, night: { color: '#5e738d', animation: 'none' } },
    "Haze": { day: { color: '#5e738d', animation: 'none' }, night: { color: '#5e738d', animation: 'none' } },
};

// --- DOM Manipulation Functions ---

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showAlert(message) {
    document.getElementById('alert-message').textContent = message;
    document.getElementById('alert-modal').classList.remove('hidden');
    hideLoading();
}

/**
 * मुख्य वेदर डैशबोर्ड को डेटा से अपडेट करता है।
 */
function updateDashboard(data) {
    // 1. मुख्य आंकड़े अपडेट करें
    document.getElementById('city-name').textContent = `${data.city}, ${data.country || 'IN'}`;
    document.getElementById('main-temp').textContent = data.temp;
    document.getElementById('weather-desc').textContent = data.description;
    document.getElementById('feels-like').textContent = `Feels like ${data.feels_like}°`;

    // 2. डिटेल्स सेक्शन अपडेट करें
    document.getElementById('precipitation').textContent = data.precipitation;
    document.getElementById('high-low').textContent = `${data.temp_max}°/${data.temp_min}°`;
    document.getElementById('wind-speed-details').textContent = `${data.wind_direction} ${data.wind_speed} km/h`;
    document.getElementById('humidity').textContent = `${data.humidity}%`; 
    document.getElementById('uv-index').textContent = data.extended_details.uv_index;
    document.getElementById('dew-point').textContent = `${data.dew_point}°`;

    // 3. AQI अपडेट करें
    const aqiValue = data.aqi_value;
    const aqiBar = document.getElementById('aqi-bar');
    const aqiDot = document.getElementById('aqi-dot'); 

    document.getElementById('aqi-value').textContent = aqiValue;

    let category, color, widthPercent;
    if (aqiValue <= 50) { category = 'Good'; color = '#10b981'; widthPercent = 20; }
    else if (aqiValue <= 100) { category = 'Moderate'; color = '#fce300'; widthPercent = 40; }
    else if (aqiValue <= 150) { category = 'Unhealthy for Sensitive Groups'; color = '#f97316'; widthPercent = 60; }
    else if (aqiValue <= 200) { category = 'Unhealthy'; color = '#ef4444'; widthPercent = 80; }
    else { category = 'Very Unhealthy'; color = '#8b5cf6'; widthPercent = 100; }

    document.getElementById('aqi-category').textContent = category;
    aqiBar.style.backgroundColor = color;
    aqiBar.style.width = `${widthPercent}%`;
    aqiDot.style.left = `calc(${widthPercent}% - 6px)`;

    // 4. मौसम की स्थिति और समय के आधार पर बैकग्राउंड अपडेट करें
    updateBackground(data.weather_condition);

    // 5. डायनेमिक तत्वों को रेंडर करें
    renderHourlyForecast();
    renderDailyForecast();
    
    // सभी अपडेट के बाद लोडिंग छिपाएं
    hideLoading();
}

/**
 * 24-घंटे का मॉक फॉरकास्ट जनरेट और डिस्प्ले करता है।
 */
// **[START CHANGE 2/3: renderHourlyForecast FUNCTION BADALNA]**
/**
 * 24-घंटे का LIVE FORCAAST जनरेट और डिस्प्ले करता है (ML Prediction ke sath).
 * Ab yeh function live forecast data (jo searchWeather se pass hoga) use karega.
 */
function renderHourlyForecast(forecastData) { // <--- Naya: ismein 'forecastData' aayega
    const container = document.getElementById('hourly-forecast');
    container.innerHTML = ''; 
    
    // ML Prediction Item (Yeh aapki mehnat dikhayega)
    const predictedTemp = document.getElementById('main-temp').textContent; 
    container.innerHTML = `
        <div class="hourly-item flex flex-col items-center justify-between p-3 rounded-xl bg-green-700/50 min-w-[120px] shadow-lg transition duration-300">
            <span class="text-sm font-semibold">Predicted Next Hour</span>
            <i class="fas fa-microchip text-blue-300 text-xl my-2"></i>
            <span class="text-lg font-bold">${predictedTemp}°C</span>
            <span class="text-xs text-gray-400">ML Forecast</span>
        </div>
    `;

    // LIVE 24-Hour Forecast (OpenWeatherMap se)
    // Hum agle 8 intervals (24 ghante) ka data dikhayenge.
    if (forecastData && forecastData.list) {
        for (let i = 0; i < 8; i++) { 
            const itemData = forecastData.list[i];
            if (!itemData) continue;

            const date = new Date(itemData.dt * 1000);
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const temp = Math.round(itemData.main.temp);
            const iconCode = itemData.weather[0].icon;

            const item = `
                <div class="hourly-item text-center p-3 rounded-xl hover:bg-gray-700/50 min-w-[100px] transition duration-300">
                    <span class="text-sm font-semibold">${timeStr.slice(0, 5)}</span>
                    <img src="http://openweathermap.org/img/wn/${iconCode}@2x.png" alt="Icon" class="w-10 h-10 mx-auto">
                    <span class="text-lg font-bold">${temp}°C</span>
                    <span class="text-xs text-gray-400">${itemData.weather[0].main}</span>
                </div>
            `;
            container.innerHTML += item;
        }
    }
}
/**
 * 7-दिन का मॉक फॉरकास्ट जनरेट और डिस्प्ले करता है।
 */
function renderDailyForecast() {
    const container = document.getElementById('daily-forecast');
    container.innerHTML = ''; 

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const mockIconMap = ["sun", "cloud-sun", "cloud", "cloud-showers-heavy", "cloud-bolt"];

    for (let i = 0; i < 7; i++) {
        const day = new Date(now.getTime() + i * 24 * 3600000); 
        const dayStr = i === 0 ? "Today" : dayNames[day.getDay()];
        const high = WEATHER_MOCK_DATA.temp_max + Math.floor(Math.random() * 4) - 2;
        const low = WEATHER_MOCK_DATA.temp_min + Math.floor(Math.random() * 4) - 2;
        const pop = Math.floor(Math.random() * 5) * 10;
        const iconClass = mockIconMap[Math.floor(Math.random() * mockIconMap.length)];

        const item = `
            <div class="daily-item flex justify-between items-center p-3 rounded-lg hover:bg-gray-700/50 transition">
                <span class="font-semibold text-gray-300 w-1/4">${dayStr}</span>
                <i class="fas fa-${iconClass} text-yellow-300 text-xl w-1/4 text-center"></i>
                <span class="font-bold text-lg w-1/4 text-right">${high}°<span class="font-normal text-gray-400">/${low}°</span></span>
                <span class="text-sm text-gray-500 w-1/4 text-right">${pop}%</span>
            </div>
        `;
        container.innerHTML += item;
    }
}

/**
 * सेक्शन के आधार पर डायनेमिक डिटेल्स मॉडाल दिखाता है।
 */
function showDetailsModal(type) {
    const title = document.getElementById('modal-title');
    const contentArea = document.getElementById('modal-content-area');
    
    // पिछले कंटेंट को साफ़ करें
    contentArea.innerHTML = '';
    
    let contentHTML = '';

    if (type === 'hourly') {
        title.textContent = '24-Hour Detailed Forecast';
        contentHTML = `
            <p class="text-lg font-medium text-blue-400">मॉक डेटा (बैकएंड कनेक्शन आवश्यक)</p>
            <p class="text-sm text-gray-400">कनेक्ट होने पर, यह सेक्शन अगले 24 घंटों के लिए तापमान, आर्द्रता और हवा की गति के लिए विस्तृत तालिका या चार्ट दिखाएगा।</p>
            <div class="space-y-3 p-4 bg-gray-700/50 rounded-xl">
                <div class="flex justify-between"><span>**Time Period:**</span><span class="font-semibold text-white">Next 24 Hours (Only 1 hour predicted by ML)</span></div>
                <div class="flex justify-between"><span>**Avg Temp:**</span><span class="font-semibold text-white">${document.getElementById('main-temp').textContent}°C</span></div>
                <div class="flex justify-between"><span>**Data Source:**</span><span class="font-semibold text-white">ML Model / Mock</span></div>
            </div>
        `;
    } else if (type === 'daily') {
        title.textContent = '7-Day Extended Trend';
        contentHTML = `
            <p class="text-lg font-medium text-blue-400">मॉक डेटा (बैकएंड कनेक्शन आवश्यक)</p>
            <p class="text-sm text-gray-400">कनेक्ट होने पर, यह प्रत्येक दिन के लिए सूर्योदय/सूर्यास्त के समय और वर्षा की संभावना सहित एक विस्तृत 7-दिन का पूर्वानुमान दिखाएगा।</p>
            <div class="space-y-3 p-4 bg-gray-700/50 rounded-xl">
                <div class="flex justify-between"><span>**Forecast Period:**</span><span class="font-semibold text-white">7 Days</span></div>
                <div class="flex justify-between"><span>**Temp Range (Mock):**</span><span class="font-semibold text-white">${WEATHER_MOCK_DATA.temp_min}°C to ${WEATHER_MOCK_DATA.temp_max}°C</span></div>
                <div class="flex justify-between"><span>**ML Insight:**</span><span class="font-semibold text-white">Next hour temp: ${document.getElementById('main-temp').textContent}°C</span></div>
            </div>
        `;
    } else if (type === 'aqi') {
        title.textContent = 'Air Quality Index (AQI) Details';
        contentHTML = `
            <p class="text-lg font-medium text-blue-400">${WEATHER_MOCK_DATA.city} के लिए वर्तमान AQI: ${WEATHER_MOCK_DATA.aqi_value}</p>
            <p class="text-sm text-gray-400">कनेक्ट होने पर, यह सेक्शन प्रदूषक स्तर (PM2.5, O3, NO2) और स्वास्थ्य संबंधी सिफ़ारिशें दिखाएगा।</p>
            <div class="space-y-3 p-4 bg-gray-700/50 rounded-xl">
                <div class="flex justify-between"><span>**Health Recommendation:**</span><span class="font-semibold text-white">Limit outdoor exercise.</span></div>
                <div class="flex justify-between"><span>**Dominant Pollutant (Mock):**</span><span class="font-semibold text-white">PM2.5</span></div>
                <div class="flex justify-between"><span>**Next Update:**</span><span class="font-semibold text-white">Hourly</span></div>
            </div>
        `;
    }

    contentArea.innerHTML = contentHTML;
    document.getElementById('details-modal').classList.remove('hidden');
}


// --- Main Action Functions (अब लाइव डेटा के साथ) ---
// --- Main Action Functions ---
async function searchWeather() {
    const location = document.getElementById('city-input').value.trim();
    if (!location) {
        showAlert("कृपया खोज करने के लिए शहर का नाम दर्ज करें।");
        return;
    }
    
    showLoading();
    let predictedTemp = null;
    let liveData = null;
    let forecastData = null;
    let mlError = null;

    // 1. **ML Server Se Prediction Laana (Priority)**
    try {
        const mlResponse = await fetch(API_URL);
        if (!mlResponse.ok) {
             throw new Error(`ML Server HTTP Error: ${mlResponse.status}`);
        }
        const mlData = await mlResponse.json();
        
        if (mlData.status === 'success') {
            predictedTemp = mlData.predicted_temp_c;
        } else {
            mlError = `ML Data Error: ${mlData.error || "Server data error."}`;
        }
    } catch (error) {
        mlError = `ML Server Down: Is CMD running? (${error.message})`;
        predictedTemp = null; // Agar ML fail ho gaya, toh null rakhenge
    }
    
    // 2. **OpenWeatherMap Se Live Data Laana (Optional)**
    try {
        const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${OPENWEATHER_API_KEY}&units=metric`);
        if (!weatherResponse.ok) {
            // Agar key invalid hai, toh data fetch ko roko, lekin code fail mat hone do
            throw new Error(`Live API Error: Invalid Key or City not found.`);
        }
        liveData = await weatherResponse.json();

        const forecastResponse = await fetch(`${FORECAST_API_URL}?q=${location}&appid=${OPENWEATHER_API_KEY}&units=metric`);
        if (forecastResponse.ok) {
            forecastData = await forecastResponse.json();
        }

    } catch (error) {
        // Live API fail ho gaya, toh hum use skip kar denge
        // error ko log kar do, lekin program ko continue rakho
        console.error("Live API (OpenWeatherMap) failed:", error.message);
    }
    
    // 3. **Data Ko Mix Karke Dashboard Update Karna**
    
    let tempToDisplay = WEATHER_MOCK_DATA.temp;
    let weatherCondition = WEATHER_MOCK_DATA.weather_condition;
    let description = WEATHER_MOCK_DATA.description;
    
    // ML Prediction ko highest priority do
    if (predictedTemp !== null) {
        tempToDisplay = Math.round(predictedTemp);
        description = "ML Predicted Next Hour";
    } 
    // Agar Live Data available hai, toh baki details usse bharo
    else if (liveData && liveData.main) {
        tempToDisplay = Math.round(liveData.main.temp); // Agar ML fail, toh live temp dikhao
        weatherCondition = liveData.weather[0].main;
        description = liveData.weather[0].description.charAt(0).toUpperCase() + liveData.weather[0].description.slice(1);
    }

    // Final mixed data object
    const finalData = {
        ...WEATHER_MOCK_DATA, 
        city: (liveData && liveData.name) ? liveData.name : location,
        country: (liveData && liveData.sys) ? liveData.sys.country : 'IN',
        temp: tempToDisplay, 
        feels_like: (liveData && liveData.main) ? Math.round(liveData.main.feels_like) : tempToDisplay,
        temp_min: (liveData && liveData.main) ? Math.round(liveData.main.temp_min) : tempToDisplay - 2,
        temp_max: (liveData && liveData.main) ? Math.round(liveData.main.temp_max) : tempToDisplay + 2,
        humidity: (liveData && liveData.main) ? liveData.main.humidity : WEATHER_MOCK_DATA.humidity,
        wind_speed: (liveData && liveData.wind) ? (liveData.wind.speed * 3.6).toFixed(1) : WEATHER_MOCK_DATA.wind_speed,
        weather_condition: weatherCondition,
        description: description,
    };

    updateDashboard(finalData);
    
    // Hourly aur Daily forecast ko ML/Live data se render karo
    if (forecastData) {
        renderHourlyForecast(forecastData);
        // Live data se daily forecast render karne ke liye aapko renderDailyForecast function bhi badalna padega
        // Lekin abhi mock chalne do jab tak key active nahi hoti
        // renderDailyForecast(forecastData);
    } else {
        // Agar forecast data nahi aaya, toh sirf mock chalao (jo pehle se aapke code mein hai)
        renderHourlyForecast(); 
        renderDailyForecast();
    }
    
    // Agar koi bada error hai toh showAlert do
    if (mlError) {
         showAlert(mlError); 
    } else if (!liveData) {
         showAlert("ML prediction is live. Live Weather/Forecast is showing mock data (API key not active or failed).");
    }

    hideLoading();
}

// **[CURRENT LOCATION FUNCTION MEIN CHOTA BADLAV]**
function getCurrentLocation() {
    // Ab getCurrentLocation() sirf input field ko New Delhi se set karega aur phir searchWeather() ko call karega
    document.getElementById('city-input').value = "New Delhi, India";
    searchWeather(); // Ab yeh function live data ke liye searchWeather ko call karega
}


// --- Dynamic Background Animation Logic ---

let currentAnimation = 'none';

function clearAnimations(container) {
    // सभी GSAP एनिमेशन रोकें और सभी एनिमेटेड तत्वों को हटा दें
    gsap.killTweensOf(container.children);
    container.innerHTML = '';
    const sunGlow = document.getElementById('sun-glow');
    if (sunGlow) {
        sunGlow.remove();
    }
}

function createRain(container) {
    for (let i = 0; i < 50; i++) {
        const drop = document.createElement('div');
        drop.classList.add('rain-drop');
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.top = `${Math.random() * 100}vh`;
        container.appendChild(drop);

        gsap.to(drop, {
            y: window.innerHeight + 100,
            x: 50,
            opacity: 0.5 + Math.random() * 0.5,
            duration: 0.5 + Math.random() * 0.7,
            repeat: -1,
            ease: "linear",
            delay: Math.random() * 2,
        });
    }
}

function createSnow(container) {
    for (let i = 0; i < 70; i++) {
        const flake = document.createElement('div');
        flake.classList.add('snow-flake');
        flake.style.left = `${Math.random() * 100}vw`;
        flake.style.top = `${Math.random() * 100}vh`;
        container.appendChild(flake);

        gsap.to(flake, {
            y: window.innerHeight + 50,
            x: Math.sin(i * 0.5) * 50, // हल्का बहाव प्रभाव
            opacity: 0.8 + Math.random() * 0.2,
            duration: 4 + Math.random() * 6,
            repeat: -1,
            ease: "none",
            delay: Math.random() * 5,
        });
    }
}

function createStars(container) {
    // 1. टिमटिमाते तारे बनाएं
    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.classList.add('star', 'star-flicker');
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 70}vh`; 
        container.appendChild(star);
    }
    
    // 2. शूटिंग स्टार एनिमेशन बनाएं
    function shootStar() {
        const sStar = document.createElement('div');
        sStar.classList.add('shooting-star');
        container.appendChild(sStar);

        // रैंडम स्टार्ट पोजीशन
        const startX = Math.random() * 300;
        const startY = Math.random() * 200;

        gsap.set(sStar, {
            x: startX,
            y: startY,
            opacity: 1,
            rotation: 45 + Math.random() * 45, // नीचे की ओर कोण
        });

        gsap.to(sStar, {
            x: startX + 1500, // यात्रा की दूरी
            y: startY + 1500,
            opacity: 0,
            duration: 1.5 + Math.random() * 1,
            ease: "power1.in",
            onComplete: () => {
                sStar.remove();
                // एक रैंडम अंतराल के बाद दोहराएं
                gsap.delayedCall(5 + Math.random() * 10, shootStar);
            }
        });
    }
    // पहला शूटिंग स्टार शुरू करें
    shootStar();
}

/**
 * मौसम की स्थिति और समय के आधार पर बैकग्राउंड रंग अपडेट करें और सही एनिमेशन शुरू करें।
 */
function updateBackground(condition) {
    const bgContainer = document.getElementById('weather-background');
    clearAnimations(bgContainer); // कोई भी मौजूदा एनिमेशन साफ़ करें
    
    const isNight = isNightTime();
    const config = BACKGROUND_CONFIG[condition] || BACKGROUND_CONFIG['Clouds']; // डिफ़ॉल्ट रूप से Clouds
    
    // समय के आधार पर कॉन्फ़िगरेशन चुनें
    const timeConfig = isNight ? config.night : config.day;

    bgContainer.style.backgroundColor = timeConfig.color;
    currentAnimation = timeConfig.animation;

    // नया एनिमेशन शुरू करें
    if (timeConfig.animation === 'rain') {
        createRain(bgContainer);
    } else if (timeConfig.animation === 'snow') {
        createSnow(bgContainer);
    } else if (timeConfig.animation === 'sun') {
        let glow = document.getElementById('sun-glow');
        if (!glow) {
            glow = document.createElement('div');
            glow.id = 'sun-glow';
            bgContainer.appendChild(glow);
        }
    } else if (timeConfig.animation === 'stars') {
        createStars(bgContainer);
    }
}


// --- Initialization and Event Listeners ---

window.onload = function() {
    // 1. शुरुआती लोड: मॉक डेटा और शुरुआती एनिमेशन दिखाएं
    updateDashboard(WEATHER_MOCK_DATA);
    
    // 2. मोबाइल मेनू टॉगल
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        document.getElementById('mobile-menu').classList.toggle('hidden');
    });

    // 3. सर्च फ़ील्ड इवेंट
    document.getElementById('city-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchWeather();
        }
    });

    // 4. GPS बटन को उसके फ़ंक्शन से लिंक करें
    document.querySelector('nav button').onclick = getCurrentLocation;
    
    // 5. लिंक क्लिक पर मोबाइल मेनू छिपाएं
    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('mobile-menu').classList.add('hidden');
        });
    });
};