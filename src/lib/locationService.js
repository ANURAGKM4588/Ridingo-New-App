// Location database and autocomplete search service for Ridingo

export const INDIAN_LANDMARKS = [
  // Airports
  { title: 'Kempegowda International Airport (BLR)', sub: 'Devanahalli, Bengaluru, Karnataka', type: 'airport', lat: 13.1986, lng: 77.7066 },
  { title: 'Indira Gandhi International Airport (DEL)', sub: 'Palam, New Delhi, Delhi', type: 'airport', lat: 28.5562, lng: 77.1000 },
  { title: 'Chhatrapati Shivaji Maharaj Airport (BOM)', sub: 'Sahar, Andheri East, Mumbai', type: 'airport', lat: 19.0896, lng: 72.8656 },
  { title: 'Rajiv Gandhi International Airport (HYD)', sub: 'Shamshabad, Hyderabad, Telangana', type: 'airport', lat: 17.2403, lng: 78.4294 },
  { title: 'Chennai International Airport (MAA)', sub: 'Meenambakkam, Chennai, Tamil Nadu', type: 'airport', lat: 12.9941, lng: 80.1709 },
  { title: 'Cochin International Airport (COK)', sub: 'Nedumbassery, Kochi, Kerala', type: 'airport', lat: 10.1518, lng: 76.3930 },
  { title: 'Pune International Airport (PNQ)', sub: 'Lohegaon, Pune, Maharashtra', type: 'airport', lat: 18.5822, lng: 73.9197 },
  { title: 'Sardar Vallabhbhai Patel Airport (AMD)', sub: 'Hansol, Ahmedabad, Gujarat', type: 'airport', lat: 23.0772, lng: 72.6347 },
  { title: 'Goa Dabolim International Airport (GOI)', sub: 'Dabolim, Vasco da Gama, Goa', type: 'airport', lat: 15.3808, lng: 73.8313 },
  { title: 'Trivandrum International Airport (TRV)', sub: 'Chacka, Thiruvananthapuram, Kerala', type: 'airport', lat: 8.4821, lng: 76.9200 },

  // Kochi Major Points
  { title: 'Lulu International Shopping Mall', sub: 'Edappally, Kochi, Kerala', type: 'mall', lat: 10.0284, lng: 76.3082 },
  { title: 'Infopark & SmartCity', sub: 'Kakkanad, Kochi, Kerala', type: 'tech', lat: 10.0104, lng: 76.3639 },
  { title: 'Marine Drive Walkway', sub: 'Ernakulam, Kochi, Kerala', type: 'hub', lat: 9.9796, lng: 76.2758 },
  { title: 'Fort Kochi Beach & Chinese Nets', sub: 'Fort Kochi, Kochi, Kerala', type: 'hub', lat: 9.9658, lng: 76.2421 },
  { title: 'Edappally Toll', sub: 'Edappally, Kochi, Kerala', type: 'hub', lat: 10.0250, lng: 76.3090 },
  { title: 'Panampilly Nagar Central Park', sub: 'Panampilly Nagar, Kochi, Kerala', type: 'hub', lat: 9.9610, lng: 76.2950 },

  // Bengaluru Major Points
  { title: 'Indiranagar 100 Feet Road', sub: 'Indiranagar, Bengaluru, Karnataka', type: 'hub', lat: 12.9719, lng: 77.6412 },
  { title: 'Koramangala 5th Block', sub: 'Koramangala, Bengaluru, Karnataka', type: 'hub', lat: 12.9352, lng: 77.6245 },
  { title: 'MG Road Metro Station', sub: 'Shivajinagar, Bengaluru, Karnataka', type: 'metro', lat: 12.9756, lng: 77.6068 },
  { title: 'Whitefield ITPL Main Gate', sub: 'Whitefield, Bengaluru, Karnataka', type: 'tech', lat: 12.9863, lng: 77.7346 },
  { title: 'Electronic City Phase 1', sub: 'Hosur Road, Bengaluru, Karnataka', type: 'tech', lat: 12.8399, lng: 77.6770 },
  { title: 'Manyata Tech Park', sub: 'Hebbal Outer Ring Road, Bengaluru', type: 'tech', lat: 13.0475, lng: 77.6200 },
  { title: 'HSR Layout BDA Complex', sub: 'HSR Layout Sector 6, Bengaluru', type: 'hub', lat: 12.9116, lng: 77.6389 },
  { title: 'Jayanagar 4th Block Complex', sub: 'Jayanagar, Bengaluru, Karnataka', type: 'hub', lat: 12.9299, lng: 77.5834 },
  { title: 'Phoenix Marketcity Mall', sub: 'Mahadevapura, Whitefield Road, Bengaluru', type: 'mall', lat: 12.9958, lng: 77.6963 },
  { title: 'Orion Mall & Brigade Gateway', sub: 'Rajajinagar, Malleshwaram, Bengaluru', type: 'mall', lat: 13.0112, lng: 77.5550 },
  { title: 'KSR Bengaluru City Railway Station', sub: 'Majestic, Bengaluru, Karnataka', type: 'station', lat: 12.9781, lng: 77.5695 },
  { title: 'Yeshwantpur Junction Railway Station', sub: 'Yeshwanthpur, Bengaluru, Karnataka', type: 'station', lat: 13.0238, lng: 77.5501 },

  // Mumbai Major Points
  { title: 'Bandra Kurla Complex (BKC)', sub: 'Bandra East, Mumbai, Maharashtra', type: 'tech', lat: 19.0664, lng: 72.8687 },
  { title: 'Marine Drive & Nariman Point', sub: 'South Mumbai, Mumbai, Maharashtra', type: 'hub', lat: 18.9432, lng: 72.8230 },
  { title: 'Andheri West Lokhandwala', sub: 'Andheri West, Mumbai, Maharashtra', type: 'hub', lat: 19.1411, lng: 72.8286 },
  { title: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)', sub: 'Fort, Mumbai, Maharashtra', type: 'station', lat: 18.9400, lng: 72.8353 },
  { title: 'Powai Hiranandani Gardens', sub: 'Powai, Mumbai, Maharashtra', type: 'tech', lat: 19.1176, lng: 72.9060 },

  // Delhi NCR Major Points
  { title: 'Connaught Place Inner Circle', sub: 'New Delhi, Central Delhi', type: 'hub', lat: 28.6315, lng: 77.2167 },
  { title: 'Cyber City DLF Phase 2', sub: 'NH-8, Gurugram, Haryana', type: 'tech', lat: 28.4950, lng: 77.0895 },
  { title: 'New Delhi Railway Station (NDLS)', sub: 'Ajmeri Gate, New Delhi', type: 'station', lat: 28.6430, lng: 77.2195 },
  { title: 'Sector 18 Market & Mall of India', sub: 'Noida, Uttar Pradesh', type: 'mall', lat: 28.5672, lng: 77.3210 },
  { title: 'Hauz Khas Social & Village', sub: 'Hauz Khas, South Delhi', type: 'hub', lat: 28.5494, lng: 77.1931 },

  // Hyderabad Major Points
  { title: 'Hitec City Cyber Towers', sub: 'Madhapur, Hyderabad, Telangana', type: 'tech', lat: 17.4504, lng: 78.3808 },
  { title: 'Jubilee Hills Check Post', sub: 'Jubilee Hills, Hyderabad, Telangana', type: 'hub', lat: 17.4319, lng: 78.4073 },
  { title: 'Gachibowli Financial District', sub: 'Gachibowli, Hyderabad, Telangana', type: 'tech', lat: 17.4239, lng: 78.3428 },
  { title: 'Secunderabad Junction Railway Station', sub: 'Secunderabad, Telangana', type: 'station', lat: 17.4344, lng: 78.5017 },

  // Chennai Major Points
  { title: 'T. Nagar Pondy Bazaar', sub: 'T. Nagar, Chennai, Tamil Nadu', type: 'hub', lat: 13.0418, lng: 80.2341 },
  { title: 'OMR Tidal Park', sub: 'Tharamani, OMR, Chennai, Tamil Nadu', type: 'tech', lat: 12.9897, lng: 80.2471 },
  { title: 'Chennai Central Railway Station (MAS)', sub: 'Park Town, Chennai, Tamil Nadu', type: 'station', lat: 13.0827, lng: 80.2755 },
  { title: 'Marina Beach Promenade', sub: 'Triplicane, Chennai, Tamil Nadu', type: 'hub', lat: 13.0500, lng: 80.2824 }
];

export const GRAPHIC_LANDMARKS = [
  { title: 'Lulu International Mall', sub: 'Edappally, Kochi', x: 400, y: 300, icon: 'bank' },
  { title: 'Cochin International Airport (COK)', sub: 'Terminal 1 / 2, Nedumbassery', x: 700, y: 80, icon: 'plane' },
  { title: 'MG Road Metro Station', sub: 'Ernakulam Central, Kochi', x: 220, y: 190, icon: 'route' },
  { title: 'Infopark & SmartCity', sub: 'Kakkanad IT Zone, Kochi', x: 250, y: 480, icon: 'bank' },
  { title: 'Marine Drive Walkway', sub: 'Rainbow Bridge, Kochi', x: 620, y: 220, icon: 'pin' },
  { title: 'Indiranagar 100 Feet Road', sub: 'Indiranagar, Bengaluru', x: 740, y: 440, icon: 'pin' }
];

let searchDebounceTimer = null;

export function searchPlaces(q, callback) {
  const clean = (q || '').trim();
  if (!clean) {
    callback([]);
    return;
  }
  const lower = clean.toLowerCase();

  // 1. Instant local index lookup (0ms) with prefix relevance scoring
  const matches = INDIAN_LANDMARKS.filter(p =>
    p.title.toLowerCase().includes(lower) || p.sub.toLowerCase().includes(lower)
  );

  matches.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aStarts = aTitle.startsWith(lower);
    const bStarts = bTitle.startsWith(lower);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    // Check word starts (e.g. typing "k" matches "Koramangala" or "Kempegowda")
    const wordsRegex = /[\s,()/-]+/;
    const aWord = aTitle.split(wordsRegex).some(w => w.startsWith(lower));
    const bWord = bTitle.split(wordsRegex).some(w => w.startsWith(lower));
    if (aWord && !bWord) return -1;
    if (!aWord && bWord) return 1;

    return aTitle.localeCompare(bTitle);
  });

  const local = matches.slice(0, 6);
  callback(local);

  // 2. OpenStreetMap Nominatim search for Indian addresses (debounced fallback)
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(clean) + '&countrycodes=in&limit=5', {
      headers: { 'Accept': 'application/json' }
    })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const osm = data.map(item => {
          const parts = item.display_name.split(',');
          return {
            title: parts[0].trim(),
            sub: parts.slice(1, 4).join(',').trim(),
            type: item.type === 'aeroway' ? 'airport' : 'hub',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          };
        });
        const titles = new Set(local.map(l => l.title.toLowerCase()));
        const merged = [...local];
        osm.forEach(o => {
          if (!titles.has(o.title.toLowerCase()) && merged.length < 6) {
            merged.push(o);
          }
        });
        callback(merged);
      })
      .catch(() => {});
  }, 250);
}
