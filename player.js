// Player State
let player = {
    video: null,
    hls: null,
    isPlaying: false,
    isMuted: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackSpeed: 1,
    subtitlesEnabled: false,
    currentSubtitle: null,
    currentQuality: 'auto',
    isFullscreen: false,
    isCasting: false,
    hideControlsTimeout: null,
    currentAnime: null
};

// DOM Elements
const elements = {
    video: document.getElementById('mainVideo'),
    container: document.getElementById('videoContainer'),
    loading: document.getElementById('loadingSpinner'),
    bigPlayBtn: document.getElementById('bigPlayBtn'),
    progressBar: document.getElementById('progressBar'),
    progressFilled: document.getElementById('progressFilled'),
    progressHandle: document.getElementById('progressHandle'),
    progressContainer: document.getElementById('progressContainer'),
    timeTooltip: document.getElementById('timeTooltip'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),
    centerPlayBtn: document.getElementById('centerPlayBtn'),
    bottomPlayBtn: document.getElementById('bottomPlayBtn'),
    topPauseBtn: document.getElementById('topPauseBtn'),
    muteBtn: document.getElementById('muteBtn'),
    volumeSlider: document.getElementById('volumeSlider'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    settingsMenu: document.getElementById('settingsMenu'),
    qualityMenu: document.getElementById('qualityMenu'),
    speedMenu: document.getElementById('speedMenu'),
    subtitleDisplay: document.getElementById('subtitleDisplay'),
    videoTitle: document.getElementById('videoTitle'),
    videoChannel: document.getElementById('videoChannel'),
    shareModal: document.getElementById('shareModal'),
    videoGrid: document.getElementById('videoGrid')
};

// Initialize Player
function initPlayer() {
    player.video = elements.video;
    
    // Load first anime
    const animeList = getAllAnime();
    if (animeList.length > 0) {
        loadAnime(animeList[0]);
    }

    // Event Listeners
    setupEventListeners();
    renderVideoGrid();
}

// Load Anime
function loadAnime(anime) {
    player.currentAnime = anime;
    elements.videoTitle.textContent = anime.title;
    elements.videoChannel.textContent = anime.channel;
    
    // Destroy existing HLS
    if (player.hls) {
        player.hls.destroy();
        player.hls = null;
    }

    // Setup new source
    if (Hls.isSupported() && anime.videoUrl.includes('.m3u8')) {
        player.hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });
        
        player.hls.loadSource(anime.videoUrl);
        player.hls.attachMedia(player.video);
        
        player.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log('Manifest loaded, found ' + data.levels.length + ' quality level(s)');
            populateQualityOptions(data.levels);
            elements.loading.classList.remove('active');
        });
        
        player.hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.error('HLS Error:', data);
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        player.hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        player.hls.recoverMediaError();
                        break;
                    default:
                        initPlayer();
                        break;
                }
            }
        });
        
        player.hls.on(Hls.Events.BUFFERING, () => {
            elements.loading.classList.add('active');
        });
        
        player.hls.on(Hls.Events.BUFFER_APPENDED, () => {
            elements.loading.classList.remove('active');
        });
        
    } else if (player.video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        player.video.src = anime.videoUrl;
    } else {
        // Fallback to MP4
        player.video.src = anime.videoUrl;
    }

    // Load subtitles
    if (anime.subtitles && anime.subtitles.length > 0) {
        loadSubtitles(anime.subtitles[0]);
    }

    // Reset UI
    elements.bigPlayBtn.classList.remove('hidden');
    elements.container.classList.remove('playing');
    updatePlayButton(false);
}

// Populate Quality Options
function populateQualityOptions(levels) {
    const container = document.getElementById('qualityOptions');
    container.innerHTML = '<div class="quality-option active" onclick="setQuality(\'auto\')">Auto</div>';
    
    levels.forEach((level, index) => {
        const height = level.height || 'Unknown';
        const option = document.createElement('div');
        option.className = 'quality-option';
        option.textContent = `${height}p`;
        option.onclick = () => setQuality(index);
        container.appendChild(option);
    });
}

// Subtitle System
let subtitleTrack = [];
let subtitleInterval = null;

function loadSubtitles(subtitleData) {
    if (!subtitleData) return;
    
    player.currentSubtitle = subtitleData;
    
    if (subtitleData.content) {
        // Parse VTT content
        parseVTT(subtitleData.content);
    } else if (subtitleData.url) {
        // Load from URL
        fetch(subtitleData.url)
            .then(r => r.text())
            .then(parseVTT);
    }
}

function parseVTT(vttText) {
    subtitleTrack = [];
    const lines = vttText.split('\n');
    let currentCue = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === 'WEBVTT' || line === '' || line.includes('NOTE')) continue;
        
        // Check if it's a timestamp line
        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
        
        if (timeMatch) {
            currentCue = {
                start: timeToSeconds(timeMatch[1]),
                end: timeToSeconds(timeMatch[2]),
                text: ''
            };
        } else if (currentCue && line !== '') {
            currentCue.text += (currentCue.text ? ' ' : '') + line;
        } else if (currentCue && line === '' && currentCue.text) {
            subtitleTrack.push(currentCue);
            currentCue = null;
        }
    }
    
    if (currentCue && currentCue.text) {
        subtitleTrack.push(currentCue);
    }
    
    console.log('Loaded', subtitleTrack.length, 'subtitles');
}

function timeToSeconds(timeStr) {
    const [hours, minutes, seconds] = timeStr.split(':');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
}

function updateSubtitles() {
    if (!player.subtitlesEnabled || subtitleTrack.length === 0) return;
    
    const currentTime = player.video.currentTime;
    const activeCue = subtitleTrack.find(cue => 
        currentTime >= cue.start && currentTime <= cue.end
    );
    
    if (activeCue) {
        elements.subtitleDisplay.textContent = activeCue.text;
        elements.subtitleDisplay.classList.add('active');
    } else {
        elements.subtitleDisplay.classList.remove('active');
    }
}

// Event Listeners
function setupEventListeners() {
    // Video events
    player.video.addEventListener('timeupdate', () => {
        updateProgress();
        updateSubtitles();
    });
    
    player.video.addEventListener('loadedmetadata', () => {
        player.duration = player.video.duration;
        elements.duration.textContent = formatTime(player.duration);
    });
    
    player.video.addEventListener('waiting', () => {
        elements.loading.classList.add('active');
    });
    
    player.video.addEventListener('playing', () => {
        elements.loading.classList.remove('active');
    });
    
    player.video.addEventListener('ended', () => {
        updatePlayButton(false);
        elements.bigPlayBtn.classList.remove('hidden');
        elements.container.classList.remove('playing');
    });
    
    // Progress bar
    elements.progressContainer.addEventListener('click', seek);
    elements.progressContainer.addEventListener('mousemove', showTimeTooltip);
    elements.progressContainer.addEventListener('mouseleave', () => {
        elements.timeTooltip.style.display = 'none';
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Click on video to toggle play
    elements.container.addEventListener('click', (e) => {
        if (e.target === elements.container || e.target === player.video) {
            togglePlay();
        }
    });
}

// Controls Functions
function togglePlay() {
    if (player.video.paused) {
        player.video.play();
        player.isPlaying = true;
        elements.container.classList.add('playing');
        elements.container.classList.remove('paused');
        elements.bigPlayBtn.classList.add('hidden');
    } else {
        player.video.pause();
        player.isPlaying = false;
        elements.container.classList.remove('playing');
        elements.container.classList.add('paused');
    }
    updatePlayButton(player.isPlaying);
}

function updatePlayButton(isPlaying) {
    const icon = isPlaying ? 'fa-pause' : 'fa-play';
    elements.centerPlayBtn.innerHTML = `<i class="fas ${icon}"></i>`;
    elements.bottomPlayBtn.innerHTML = `<i class="fas ${icon}"></i>`;
    elements.topPauseBtn.innerHTML = `<i class="fas ${icon}"></i>`;
}

function skipBackward() {
    player.video.currentTime = Math.max(0, player.video.currentTime - 10);
    showSkipAnimation('backward');
}

function skipForward() {
    player.video.currentTime = Math.min(player.duration, player.video.currentTime + 10);
    showSkipAnimation('forward');
}

function showSkipAnimation(direction) {
    // Visual feedback
    const btn = direction === 'backward' ? 
        document.querySelector('.skip-back') : 
        document.querySelector('.skip-forward');
    
    btn.style.transform = 'scale(1.3)';
    setTimeout(() => btn.style.transform = '', 200);
}

function updateProgress() {
    const percent = (player.video.currentTime / player.video.duration) * 100;
    elements.progressFilled.style.width = percent + '%';
    elements.progressHandle.style.left = percent + '%';
    elements.currentTime.textContent = formatTime(player.video.currentTime);
}

function seek(e) {
    const rect = elements.progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    player.video.currentTime = percent * player.video.duration;
}

function showTimeTooltip(e) {
    const rect = elements.progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * player.video.duration;
    elements.timeTooltip.textContent = formatTime(time);
    elements.timeTooltip.style.left = (percent * 100) + '%';
    elements.timeTooltip.style.display = 'block';
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function toggleMute() {
    player.video.muted = !player.video.muted;
    player.isMuted = player.video.muted;
    
    const icon = player.isMuted ? 'fa-volume-mute' : 
                 player.video.volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up';
    elements.muteBtn.innerHTML = `<i class="fas ${icon}"></i>`;
}

function setVolume(value) {
    player.video.volume = value / 100;
    player.volume = player.video.volume;
    
    if (player.video.volume === 0) {
        player.video.muted = true;
        elements.muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    } else {
        player.video.muted = false;
        elements.muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        elements.container.requestFullscreen();
        player.isFullscreen = true;
        elements.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        document.exitFullscreen();
        player.isFullscreen = false;
        elements.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
}

function toggleSettings() {
    elements.settingsMenu.classList.toggle('active');
    elements.qualityMenu.classList.remove('active');
    elements.speedMenu.classList.remove('active');
}

function showQualityMenu() {
    elements.settingsMenu.classList.remove('active');
    elements.qualityMenu.classList.add('active');
}

function showSpeedMenu() {
    elements.settingsMenu.classList.remove('active');
    elements.speedMenu.classList.add('active');
}

function backToSettings() {
    elements.qualityMenu.classList.remove('active');
    elements.speedMenu.classList.remove('active');
    elements.settingsMenu.classList.add('active');
}

function setQuality(quality) {
    if (!player.hls) return;
    
    if (quality === 'auto') {
        player.hls.currentLevel = -1;
        player.currentQuality = 'auto';
    } else {
        player.hls.currentLevel = quality;
        player.currentQuality = quality;
    }
    
    document.getElementById('currentQuality').innerHTML = 
        quality === 'auto' ? 'Auto <i class="fas fa-chevron-right"></i>' : 
        `${player.hls.levels[quality].height}p <i class="fas fa-chevron-right"></i>`;
    
    // Update active state
    document.querySelectorAll('.quality-option').forEach((opt, i) => {
        opt.classList.toggle('active', 
            (quality === 'auto' && i === 0) || 
            (quality !== 'auto' && i === quality + 1)
        );
    });
    
    elements.qualityMenu.classList.remove('active');
}

function setSpeed(speed) {
    player.video.playbackRate = speed;
    player.playbackSpeed = speed;
    document.getElementById('currentSpeed').innerHTML = 
        `${speed}x <i class="fas fa-chevron-right"></i>`;
    
    document.querySelectorAll('.speed-option').forEach(opt => {
        opt.classList.toggle('active', opt.textContent.includes(speed + 'x'));
    });
    
    elements.speedMenu.classList.remove('active');
}

function toggleSubtitles() {
    player.subtitlesEnabled = !player.subtitlesEnabled;
    elements.subtitleDisplay.classList.toggle('active', player.subtitlesEnabled);
    document.getElementById('subtitlesStatus').textContent = 
        player.subtitlesEnabled ? 'On' : 'Off';
    elements.settingsMenu.classList.remove('active');
}

function nextVideo() {
    const animeList = getAllAnime();
    const currentIndex = animeList.findIndex(a => a.id === player.currentAnime.id);
    const nextIndex = (currentIndex + 1) % animeList.length;
    loadAnime(animeList[nextIndex]);
}

function goBack() {
    // Scroll to video grid
    elements.videoGrid.scrollIntoView({ behavior: 'smooth' });
}

function closePlayer() {
    player.video.pause();
    player.isPlaying = false;
    updatePlayButton(false);
}

// Keyboard Shortcuts
function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key) {
        case ' ':
        case 'k':
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            skipBackward();
            break;
        case 'ArrowRight':
            e.preventDefault();
            skipForward();
            break;
        case 'ArrowUp':
            e.preventDefault();
            setVolume(Math.min(100, (player.video.volume * 100) + 5));
            elements.volumeSlider.value = player.video.volume * 100;
            break;
        case 'ArrowDown':
            e.preventDefault();
            setVolume(Math.max(0, (player.video.volume * 100) - 5));
            elements.volumeSlider.value = player.video.volume * 100;
            break;
        case 'f':
            toggleFullscreen();
            break;
        case 'm':
            toggleMute();
            break;
        case 'c':
            toggleSubtitles();
            break;
    }
}

// Cast (UI only - requires Cast SDK for real functionality)
function toggleCast() {
    alert('Cast feature requires Google Cast SDK integration.\nUI is ready for implementation.');
}

// Share Functions
function shareVideo() {
    elements.shareModal.classList.add('active');
}

function closeShare() {
    elements.shareModal.classList.remove('active');
}

function shareTo(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(player.currentAnime?.title || 'Check this video');
    
    const urls = {
        whatsapp: `https://wa.me/?text=${title}%20${url}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
        copy: null
    };
    
    if (platform === 'copy') {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copied to clipboard!');
        });
    } else {
        window.open(urls[platform], '_blank');
    }
    
    closeShare();
}

// Action Buttons
function likeVideo() {
    alert('Liked! ❤️');
}

function dislikeVideo() {
    alert('Disliked! 👎');
}

function showComments() {
    alert('Comments section would open here!');
}

function saveVideo() {
    alert('Video saved to watch later! 🔖');
}

function showMore() {
    alert('More options: Report, Not interested, etc.');
}

// Admin Login
function showAdminLogin() {
    document.getElementById('adminLoginModal').classList.add('active');
}

function closeAdminLogin() {
    document.getElementById('adminLoginModal').classList.remove('active');
    document.getElementById('adminPassword').value = '';
    document.getElementById('loginError').textContent = '';
}

function verifyAdmin() {
    const password = document.getElementById('adminPassword').value;
    const correctPassword = localStorage.getItem('adminPassword');
    
    if (password === correctPassword) {
        window.location.href = 'admin.html';
    } else {
        document.getElementById('loginError').textContent = 'Wrong password! Try again.';
    }
}

// Render Video Grid
function renderVideoGrid() {
    const animeList = getAllAnime();
    elements.videoGrid.innerHTML = animeList.map(anime => `
        <div class="video-card" onclick="loadAnimeById(${anime.id})">
            <img src="${anime.thumbnail}" alt="${anime.title}" onerror="this.src='https://via.placeholder.com/640x360?text=No+Thumbnail'">
            <div class="video-card-info">
                <h4>${anime.title}</h4>
                <p>${anime.channel} • ${anime.views} views • ${anime.uploaded}</p>
            </div>
        </div>
    `).join('');
}

function loadAnimeById(id) {
    const anime = getAnime(id);
    if (anime) {
        loadAnime(anime);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', initPlayer);
    
