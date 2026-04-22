// Default anime data
const defaultAnimeData = [
    {
        id: 1,
        title: "Trump and Zelenskyy play cards in the Oval Office",
        channel: "@22Minutes",
        thumbnail: "https://i.ytimg.com/vi/demo1/maxresdefault.jpg",
        videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", // Demo M3U8
        duration: "2:31",
        subtitles: [
            {
                language: "English",
                url: "",
                content: `WEBVTT

00:00:01.000 --> 00:00:04.000
Trump: Zelenskyy, aao cards khelte hain

00:00:04.500 --> 00:00:07.000
Zelenskyy: Theek hai, lekin main jeetunga

00:00:07.500 --> 00:00:10.000
Trump: Ha ha, we'll see about that

00:00:10.500 --> 00:00:13.000
Zelenskyy: *plays card* Your move

00:00:13.500 --> 00:00:16.000
Trump: *slams table* You're fired!`
            }
        ],
        views: "1.2M",
        likes: 45000,
        uploaded: "2 days ago"
    }
];

// Initialize localStorage
function initDatabase() {
    if (!localStorage.getItem('animeData')) {
        localStorage.setItem('animeData', JSON.stringify(defaultAnimeData));
    }
    if (!localStorage.getItem('adminPassword')) {
        localStorage.setItem('adminPassword', 'Sumit.streamer@81#live.ott');
    }
}

// Get all anime
function getAllAnime() {
    return JSON.parse(localStorage.getItem('animeData') || '[]');
}

// Get single anime
function getAnime(id) {
    const data = getAllAnime();
    return data.find(a => a.id === id);
}

// Add anime
function addAnime(anime) {
    const data = getAllAnime();
    anime.id = Date.now();
    data.push(anime);
    localStorage.setItem('animeData', JSON.stringify(data));
    return anime;
}

// Update anime
function updateAnime(id, updates) {
    const data = getAllAnime();
    const index = data.findIndex(a => a.id === id);
    if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        localStorage.setItem('animeData', JSON.stringify(data));
        return data[index];
    }
    return null;
}

// Delete anime
function deleteAnime(id) {
    const data = getAllAnime();
    const filtered = data.filter(a => a.id !== id);
    localStorage.setItem('animeData', JSON.stringify(filtered));
}

// Initialize on load
initDatabase();
