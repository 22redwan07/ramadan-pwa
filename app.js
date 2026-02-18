const districts = [
    "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogra", "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga", "Cumilla", "Cox's Bazar", "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
];

const duas = {
    sehri: {
        arabic: "نَوَيْتُ اَنْ اَصُوْمَ غَدًا مِّنْ شَهْرِ رَمَضَانَ الْمُبَارَكِ فَرْضًا لَّكَ يَا اَللهُ فَتَقَبَّلْ مِنِّى اِنَّكَ اَنْتَ السَّمِيْعُ الْعَلِيْمُ",
        bangla: "নাওয়াইতু আন আছুমা গাদাম মিন শাহরি রামাদানাল মুবারাকি ফারদাল্লাকা ইয়া আল্লাহু ফাতাকাব্বাল মিন্নি ইন্নাকা আনতাস সামিউল আলিম।",
        trans: "I intend to keep the fast for tomorrow in the month of Ramadan, O Allah, so accept it from me, indeed You are the All-Hearing, the All-Knowing."
    },
    iftar: {
        arabic: "اَللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ اَفْطَرْتُ",
        bangla: "আল্লাহুম্মা লাকা ছুমতু ওয়া আলা রিযকিকা আফতারতু।",
        trans: "O Allah, I fasted for You and I break my fast with Your provision."
    }
};

let currentData = null;
let currentDistrict = localStorage.getItem('district') || 'Dhaka';

// DOM Elements
const districtSelect = document.getElementById('district-select');
const timerDisplay = document.getElementById('timer');
const countdownLabel = document.getElementById('countdown-label');
const nextEventTime = document.getElementById('next-event-time');
const duaDisplay = document.getElementById('dua-display');
const themeToggle = document.getElementById('theme-toggle');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    populateDistricts();
    loadTheme();
    fetchPrayerTimes();
    setupEventListeners();
    updateDua('sehri');
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    }
});

function populateDistricts() {
    districts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        if (d === currentDistrict) opt.selected = true;
        districtSelect.appendChild(opt);
    });
}

function setupEventListeners() {
    districtSelect.addEventListener('change', (e) => {
        currentDistrict = e.target.value;
        localStorage.setItem('district', currentDistrict);
        fetchPrayerTimes();
    });

    themeToggle.addEventListener('click', toggleTheme);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateDua(e.target.dataset.tab);
        });
    });

    document.getElementById('geo-btn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                // For simplicity in this PWA, we'll just keep district-based
                // but a real app would reverse geocode or use lat/lng in API
                alert("Geolocation detected. In this version, please select your district manually for accurate timing.");
            });
        }
    });

    document.getElementById('share-wa').addEventListener('click', () => {
        const text = `Check out today's Iftar and Sehri time for ${currentDistrict} on this Ramadan PWA!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + window.location.href)}`);
    });

    document.getElementById('copy-link').addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied!");
    });
}

async function fetchPrayerTimes() {
    try {
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${currentDistrict}&country=Bangladesh&method=1`);
        const data = await response.json();
        currentData = data.data;
        updateUI();
        saveToCache(data.data);
    } catch (err) {
        console.error("Fetch failed, loading from cache", err);
        loadFromCache();
    }
}

function updateUI() {
    if (!currentData) return;
    const t = currentData.timings;
    
    document.querySelector('#time-fajr .val').textContent = formatTime(t.Fajr);
    document.querySelector('#time-dhuhr .val').textContent = formatTime(t.Dhuhr);
    document.querySelector('#time-asr .val').textContent = formatTime(t.Asr);
    document.querySelector('#time-maghrib .val').textContent = formatTime(t.Maghrib);
    document.querySelector('#time-isha .val').textContent = formatTime(t.Isha);
    document.querySelector('#time-sehri .val').textContent = formatTime(t.Imsak || t.Fajr);
    document.querySelector('#time-iftar .val').textContent = formatTime(t.Maghrib);

    startCountdown(t);
    updateCalendar();
}

function formatTime(timeStr) {
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
}

function startCountdown(timings) {
    if (window.timerInterval) clearInterval(window.timerInterval);

    window.timerInterval = setInterval(() => {
        const now = new Date();
        const iftarTime = parseTime(timings.Maghrib);
        const sehriTime = parseTime(timings.Imsak || timings.Fajr);
        
        let target, label;
        
        if (now < iftarTime) {
            target = iftarTime;
            label = "Iftar Countdown";
        } else {
            // Target is next day's Sehri
            target = new Date(sehriTime.getTime() + 24 * 60 * 60 * 1000);
            label = "Sehri Countdown";
        }

        const diff = target - now;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        countdownLabel.textContent = label;
        timerDisplay.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        nextEventTime.textContent = `Target: ${formatTime(target.getHours() + ":" + target.getMinutes())}`;
        
        // Push notification logic would go here
    }, 1000);
}

function parseTime(timeStr) {
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d;
}

function updateDua(type) {
    const d = duas[type];
    duaDisplay.innerHTML = `
        <div class="dua-arabic">${d.arabic}</div>
        <div class="dua-bangla">${d.bangla}</div>
        <div class="dua-trans">${d.trans}</div>
    `;
}

function updateCalendar() {
    // This would ideally fetch the full month from Aladhan API
    // For now, we'll mock the table or fetch it if possible
    const tbody = document.querySelector('#ramadan-table tbody');
    tbody.innerHTML = '<tr><td colspan="4">Loading full calendar...</td></tr>';
    
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    
    fetch(`https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${currentDistrict}&country=Bangladesh&method=1`)
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = '';
            data.data.forEach((day, index) => {
                const row = `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${day.date.readable}</td>
                        <td>${formatTime(day.timings.Imsak || day.timings.Fajr)}</td>
                        <td>${formatTime(day.timings.Maghrib)}</td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        });
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('theme-light')) {
        body.classList.replace('theme-light', 'theme-dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.replace('theme-dark', 'theme-light');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.replace('theme-light', 'theme-dark');
        themeToggle.textContent = '☀️';
    }
}

function saveToCache(data) {
    localStorage.setItem('cached_prayer_data', JSON.stringify(data));
}

function loadFromCache() {
    const cached = localStorage.getItem('cached_prayer_data');
    if (cached) {
        currentData = JSON.parse(cached);
        updateUI();
    }
}
