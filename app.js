// ==================== FIREBASE IMPORTS ====================
import { 
    getFirestore, collection, addDoc, getDocs, query, orderBy, 
    doc, deleteDoc, updateDoc, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, signInAnonymously, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==================== APP CLASS ====================
class StreamerApp {
    constructor() {
        this.db = window.db;
        this.auth = window.auth;
        this.movies = [];
        this.continueWatching = JSON.parse(localStorage.getItem('streamer_continue') || '[]');
        this.watchTime = parseInt(localStorage.getItem('streamer_watchtime') || '0');
        this.currentMovie = null;
        this.isAdmin = false;
        this.activeCategory = 'All';
        this.isLoading = false;
        this.videoType = 'dailymotion'; // 'dailymotion' or 'mp4'
        this.dmPlayer = null;
        this.currentSlide = 0;
        this.slideInterval = null;
        this.heroMovies = [];
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.checkFirstTime();
        this.checkAdminMode();
        this.setupParticles();
        
        // Auth state listener
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                console.log('User signed in:', user.uid);
            } else {
                this.signInGuest();
            }
        });
    }
    
    // ==================== AUTHENTICATION ====================
    async signInGuest() {
        try {
            await signInAnonymously(this.auth);
        } catch (error) {
            console.error('Auth error:', error);
        }
    }
    
    // ==================== FIRST TIME CHECK ====================
    checkFirstTime() {
        const hasVisited = localStorage.getItem('streamer_visited');
        if (hasVisited) {
            this.showScreen('main-screen');
            this.loadMovies();
        } else {
            localStorage.setItem('streamer_visited', 'true');
            this.showScreen('welcome-screen');
        }
    }
    
    // ==================== PARTICLES BACKGROUND ====================
    setupParticles() {
        const container = document.getElementById('particles-bg');
        if (!container) return;
        
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (10 + Math.random() * 10) + 's';
            particle.style.width = (2 + Math.random() * 4) + 'px';
            particle.style.height = particle.style.width;
            
            const colors = ['rgba(239,68,68,0.5)', 'rgba(168,85,247,0.5)', 'rgba(236,72,153,0.5)'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            container.appendChild(particle);
        }
    }
    
    // ==================== ADMIN & AUTH ====================
    checkAdminMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const adminParam = urlParams.get('admin');
        const sessionAdmin = sessionStorage.getItem('streamer_admin');
        
        if (adminParam === 'sumit81' || sessionAdmin === 'true') {
            this.isAdmin = true;
            sessionStorage.setItem('streamer_admin', 'true');
            this.showAdminUI();
        }
    }
    
    showAdminUI() {
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) {
            adminPanel.classList.remove('hidden');
            adminPanel.classList.add('visible');
        }
        this.showToast('🔥 Admin Mode Activated', 'success');
    }
    
    showAdminLogin() {
        const password = prompt('Enter admin password:');
        if (password === 'sumit81') {
            this.isAdmin = true;
            sessionStorage.setItem('streamer_admin', 'true');
            this.showAdminUI();
            
            // Update URL without reload
            const url = new URL(window.location);
            url.searchParams.set('admin', 'sumit81');
            window.history.pushState({}, '', url);
        } else {
            this.showToast('Invalid password', 'error');
        }
    }
    
    hideAdminPanel() {
        const panel = document.getElementById('admin-panel');
        if (panel) {
            panel.classList.add('hidden');
            panel.classList.remove('visible');
        }
    }
    
    // ==================== VIDEO TYPE SELECTION ====================
    setVideoType(type) {
        this.videoType = type;
        const dmBtn = document.getElementById('btn-dailymotion');
        const mp4Btn = document.getElementById('btn-mp4');
        const help = document.getElementById('video-help');
        
        if (type === 'dailymotion') {
            dmBtn.classList.add('bg-red-600/20', 'text-red-400', 'border-red-600/30');
            dmBtn.classList.remove('bg-gray-700/50', 'text-gray-400', 'border-gray-600');
            mp4Btn.classList.remove('bg-red-600/20', 'text-red-400', 'border-red-600/30');
            mp4Btn.classList.add('bg-gray-700/50', 'text-gray-400', 'border-gray-600');
            help.textContent = 'Paste Dailymotion video URL (e.g., https://www.dailymotion.com/video/xXXXXX)';
        } else {
            mp4Btn.classList.add('bg-red-600/20', 'text-red-400', 'border-red-600/30');
            mp4Btn.classList.remove('bg-gray-700/50', 'text-gray-400', 'border-gray-600');
            dmBtn.classList.remove('bg-red-600/20', 'text-red-400', 'border-red-600/30');
            dmBtn.classList.add('bg-gray-700/50', 'text-gray-400', 'border-gray-600');
            help.textContent = 'Paste direct MP4 or CDN URL (must end in .mp4 or .m3u8)';
        }
    }
    
    // ==================== DATA LOADING ====================
    async loadMovies() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            const q = query(collection(this.db, "movies"), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            
            this.movies = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`Loaded ${this.movies.length} movies`);
            
            if (this.movies.length === 0) {
                this.renderEmptyState();
            } else {
                this.renderMovies();
                this.setupHeroSlider();
            }
            
            this.updateStats();
            
        } catch (error) {
            console.error("Error loading movies:", error);
            this.showToast('Failed to load content', 'error');
            this.renderEmptyState();
        } finally {
            this.isLoading = false;
        }
    }
    
    // ==================== HERO SLIDER ====================
    setupHeroSlider() {
        const featured = [...this.movies]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 5);
        
        this.heroMovies = featured;
        this.currentSlide = 0;
        
        this.renderHeroSlides();
        this.startSlideTimer();
    }
    
    renderHeroSlides() {
        const container = document.getElementById('hero-slides');
        const dotsContainer = document.getElementById('hero-dots');
        
        if (!container || !this.heroMovies.length) return;
        
        container.innerHTML = this.heroMovies.map((movie, index) => `
            <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                <img src="${movie.poster}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/1200x600/1a1a1a/666?text=NO+IMAGE'">
                <div class="hero-slide-content">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="px-3 py-1 bg-red-600 rounded-full text-xs font-bold animate-pulse">FEATURED</span>
                        <span class="px-2 py-1 bg-white/10 rounded text-xs backdrop-blur-md">${movie.category}</span>
                        <span class="text-yellow-400 text-sm font-bold"><i class="fas fa-star mr-1"></i>${movie.rating || 'N/A'}</span>
                    </div>
                    <h2 class="text-3xl md:text-5xl font-black mb-3 line-clamp-2 leading-tight">${movie.title}</h2>
                    <p class="text-gray-300 text-sm md:text-base mb-4 line-clamp-2 max-w-xl">${movie.description || ''}</p>
                    <div class="flex items-center gap-4 mb-6 text-sm text-gray-400">
                        <span>${movie.year || ''}</span>
                        <span class="w-1 h-1 rounded-full bg-gray-600"></span>
                        <span>${movie.duration || ''}</span>
                    </div>
                    <button onclick="app.playMovie('${movie.id}')" class="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold flex items-center gap-2 transition transform hover:scale-105 ripple-btn">
                        <i class="fas fa-play"></i> Play Now
                    </button>
                </div>
            </div>
        `).join('');
        
        dotsContainer.innerHTML = this.heroMovies.map((_, index) => `
            <div class="hero-dot ${index === 0 ? 'active' : ''}" onclick="app.goToSlide(${index})"></div>
        `).join('');
    }
    
    startSlideTimer() {
        if (this.slideInterval) clearInterval(this.slideInterval);
        this.slideInterval = setInterval(() => this.nextSlide(), 4000);
    }
    
    nextSlide() {
        if (!this.heroMovies.length) return;
        this.goToSlide((this.currentSlide + 1) % this.heroMovies.length);
    }
    
    prevSlide() {
        if (!this.heroMovies.length) return;
        this.goToSlide((this.currentSlide - 1 + this.heroMovies.length) % this.heroMovies.length);
    }
    
    goToSlide(index) {
        if (this.slideInterval) clearInterval(this.slideInterval);
        
        const slides = document.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('.hero-dot');
        
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
        this.currentSlide = index;
        this.startSlideTimer();
    }
    
    // ==================== RENDERING ====================
    renderEmptyState() {
        const emptyHTML = `
            <div class="text-center py-12 animate-fade-in">
                <i class="fas fa-film text-5xl text-gray-700 mb-4 animate-bounce-slow"></i>
                <p class="text-gray-500 mb-2">No content available</p>
                ${this.isAdmin ? 
                    '<p class="text-xs text-gray-600">Add content using the Admin Panel above</p>' : 
                    '<p class="text-xs text-gray-600">Check back later for new content</p>'
                }
            </div>`;
        
        const hero = document.getElementById('hero-slides');
        if (hero) hero.innerHTML = emptyHTML;
        
        ['trending-container', 'foryou-container', 'new-container'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = emptyHTML;
        });
    }
    
    renderMovies() {
        const movies = this.activeCategory === 'All' 
            ? this.movies 
            : this.movies.filter(m => m.category === this.activeCategory);
        
        this.renderContinueWatching();
        
        const trending = [...movies].sort((a, b) => (b.views || 0) - (a.views || 0));
        this.renderSection('trending-container', trending.slice(0, 10));
        
        const forYou = [...movies].sort(() => Math.random() - 0.5);
        this.renderSection('foryou-container', forYou.slice(0, 10));
        
        const newReleases = [...movies].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        this.renderSection('new-container', newReleases.slice(0, 10));
    }
    
    renderSection(containerId, movies) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!movies.length) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500 w-full animate-fade-in">
                    <i class="fas fa-inbox text-3xl mb-3 opacity-50"></i>
                    <p class="text-sm">No content in this category</p>
                    <span class="coming-soon-badge mt-2 inline-block">Coming Soon</span>
                </div>`;
            return;
        }
        
        container.innerHTML = movies.map(m => this.createCard(m)).join('');
    }
    
    createCard(movie) {
        return `
            <div class="flex-shrink-0 w-36 md:w-44 movie-card movie-card-3d" onclick="app.playMovie('${movie.id}')">
                <div class="relative rounded-xl overflow-hidden mb-2 shadow-lg aspect-[2/3] bg-gray-800 group">
                    <img src="${movie.poster}" class="w-full h-full object-cover" loading="lazy" 
                         onerror="this.src='https://via.placeholder.com/300x450/1a1a1a/666?text=NO+IMAGE'">
                    <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold">
                        <i class="fas fa-star text-yellow-400 mr-1"></i>${movie.rating || '-'}
                    </div>
                    <div class="absolute top-2 left-2">
                        <span class="px-2 py-1 bg-red-600/80 rounded text-[10px] font-bold uppercase tracking-wider">${movie.category}</span>
                    </div>
                    <div class="play-overlay">
                        <div class="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center hover:scale-110 transition shadow-lg shadow-red-600/40 animate-glow">
                            <i class="fas fa-play text-white ml-1"></i>
                        </div>
                    </div>
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <p class="text-xs text-gray-300 line-clamp-2">${movie.description || ''}</p>
                    </div>
                </div>
                <p class="text-sm font-semibold truncate mb-1 group-hover:text-red-400 transition">${movie.title}</p>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span>${movie.year || ''}</span>
                    <span class="w-1 h-1 rounded-full bg-gray-600"></span>
                    <span>${movie.duration || ''}</span>
                </div>
            </div>`;
    }
    
    renderContinueWatching() {
        const section = document.getElementById('continue-watching-section');
        const container = document.getElementById('continue-container');
        
        if (!section || !container) return;
        
        if (!this.continueWatching.length) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        container.innerHTML = this.continueWatching.slice(0, 6).map(item => {
            const movie = this.movies.find(m => m.id === item.movieId);
            if (!movie) return '';
            return `
                <div onclick="app.playMovie('${movie.id}')" class="flex-shrink-0 w-40 cursor-pointer group animate-fade-up">
                    <div class="relative rounded-xl overflow-hidden mb-2 aspect-[2/3] shadow-lg">
                        <img src="${movie.poster}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                             onerror="this.src='https://via.placeholder.com/300x450/1a1a1a/666?text=NO+IMAGE'">
                        <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                            <div class="h-full bg-gradient-to-r from-red-500 to-purple-500 transition-all duration-300" 
                                 style="width: ${item.percent || 0}%"></div>
                        </div>
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                            <div class="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition transform scale-0 group-hover:scale-100">
                                <i class="fas fa-play text-white text-xs ml-0.5"></i>
                            </div>
                        </div>
                    </div>
                    <p class="text-sm font-medium truncate group-hover:text-red-400 transition">${movie.title}</p>
                    <p class="text-xs text-gray-500">${item.percent || 0}% watched</p>
                </div>`;
        }).join('');
    }
    
    // ==================== CATEGORY FILTER ====================
    filterCategory(cat) {
        this.activeCategory = cat;
        
        document.querySelectorAll('.category-pill').forEach(pill => {
            const isActive = pill.dataset.cat === cat;
            pill.classList.toggle('active', isActive);
        });
        
        this.renderMovies();
        this.showToast(`Showing: ${cat}`, 'info');
    }
    
    // ==================== SEARCH ====================
    searchMovies() {
        const query = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
        const container = document.getElementById('search-container');
        
        if (!container) return;
        
        if (!query) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500 animate-fade-in">
                    <i class="fas fa-search text-4xl mb-4 opacity-50 animate-bounce-slow"></i>
                    <p>Type to search content...</p>
                </div>`;
            return;
        }
        
        const filtered = this.movies.filter(m => 
            m.title?.toLowerCase().includes(query) ||
            m.category?.toLowerCase().includes(query) ||
            m.description?.toLowerCase().includes(query)
        );
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 animate-fade-in">
                    <i class="fas fa-search text-4xl text-gray-600 mb-4 animate-bounce-slow"></i>
                    <p class="text-gray-400">No results for "${query}"</p>
                    <span class="coming-soon-badge mt-4 inline-block">Try different keywords</span>
                </div>`;
        } else {
            container.innerHTML = `<div class="col-span-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-fade-in">${filtered.map(m => this.createCard(m)).join('')}</div>`;
        }
    }
    
    // ==================== VIDEO PLAYER ====================
    async playMovie(movieId) {
        const movie = this.movies.find(m => m.id === movieId);
        if (!movie) {
            this.showToast('Content not found', 'error');
            return;
        }
        
        this.currentMovie = movie;
        this.showScreen('player-screen');
        
        // Update views
        try {
            await updateDoc(doc(this.db, "movies", movieId), {
                views: (movie.views || 0) + 1
            });
        } catch (e) { console.log('View update failed', e); }
        
        // Setup player based on video type
        if (movie.videoUrl.includes('dailymotion.com') || movie.videoType === 'dailymotion') {
            this.setupDailymotionPlayer(movie);
        } else {
            this.setupNativePlayer(movie);
        }
        
        // Setup subtitle
        const subtitleDisplay = document.getElementById('subtitle-display');
        const aiBtn = document.getElementById('ai-sub-btn');
        
        if (movie.subtitleUrl) {
            subtitleDisplay.classList.add('show');
            aiBtn.style.display = 'flex';
        } else {
            subtitleDisplay.classList.remove('show');
            aiBtn.style.display = 'none';
        }
        
        // Resume progress
        const progress = this.continueWatching.find(item => item.movieId === movieId);
        if (progress && progress.currentTime > 10) {
            this.showToast(`Resumed from ${this.formatTime(progress.currentTime)}`, 'info');
        }
    }
    
    setupDailymotionPlayer(movie) {
        const dmContainer = document.getElementById('dailymotion-player');
        const videoEl = document.getElementById('video-element');
        const title = document.getElementById('player-title');
        const meta = document.getElementById('player-meta');
        
        dmContainer.classList.remove('hidden');
        videoEl.classList.add('hidden');
        
        title.textContent = movie.title;
        meta.textContent = `${movie.category} • ${movie.year || ''} • ${movie.duration || ''}`;
        
        // Extract video ID from URL
        let videoId = '';
        const match = movie.videoUrl.match(/video\/([a-zA-Z0-9]+)/);
        if (match) videoId = match[1];
        
        if (!videoId) {
            this.showToast('Invalid Dailymotion URL', 'error');
            return;
        }
        
        // Destroy existing player
        if (this.dmPlayer) {
            this.dmPlayer.destroy();
        }
        
        // Create Dailymotion player
        if (window.dailymotion) {
            this.dmPlayer = window.dailymotion.createPlayer('dailymotion-player', {
                video: videoId,
                params: {
                    autoplay: true,
                    mute: false,
                    controls: false,
                    'queue-autoplay-next': false,
                    'queue-enable': false
                }
            });
            
            this.setupDMTracking();
        }
        
        // Show quality button for DM
        document.getElementById('quality-btn').style.display = 'flex';
    }
    
    setupNativePlayer(movie) {
        const dmContainer = document.getElementById('dailymotion-player');
        const video = document.getElementById('video-element');
        const title = document.getElementById('player-title');
        const meta = document.getElementById('player-meta');
        
        dmContainer.classList.add('hidden');
        video.classList.remove('hidden');
        
        title.textContent = movie.title;
        meta.textContent = `${movie.category} • ${movie.year || ''} • ${movie.duration || ''}`;
        
        // Destroy DM player if exists
        if (this.dmPlayer) {
            this.dmPlayer.destroy();
            this.dmPlayer = null;
        }
        
        video.src = movie.videoUrl;
        video.load();
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                this.showToast('Click to play', 'info');
            });
        }
        
        this.setupVideoTracking(video, movie.id);
        
        // Hide quality button for native (browser handles it)
        document.getElementById('quality-btn').style.display = 'none';
    }
    
    setupDMTracking() {
        // Dailymotion tracking through API events
        if (!this.dmPlayer) return;
        
        const updateProgress = async () => {
            try {
                const currentTime = await this.dmPlayer.currentTime;
                const duration = await this.dmPlayer.duration;
                
                if (duration > 0) {
                    const percent = (currentTime / duration) * 100;
                    document.getElementById('progress-fill').style.width = percent + '%';
                    document.getElementById('time-display').textContent = 
                        `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
                    
                    if (Math.floor(currentTime) % 5 === 0) {
                        this.saveContinueWatching(this.currentMovie.id, currentTime, duration, percent);
                    }
                }
            } catch (e) {}
        };
        
        // Update progress every second
        this.dmProgressInterval = setInterval(updateProgress, 1000);
    }
    
    setupVideoTracking(video, movieId) {
        const progressFill = document.getElementById('progress-fill');
        const timeDisplay = document.getElementById('time-display');
        const playBtn = document.getElementById('play-pause-btn');
        const centerBtn = document.getElementById('center-play-btn');
        const container = document.getElementById('video-container');
        const spinner = document.getElementById('buffering-spinner');
        
        // Remove old listeners
        video.onplay = null;
        video.onpause = null;
        video.ontimeupdate = null;
        video.onended = null;
        video.onwaiting = null;
        video.onplaying = null;
        
        video.addEventListener('timeupdate', () => {
            if (video.duration) {
                const percent = (video.currentTime / video.duration) * 100;
                progressFill.style.width = percent + '%';
                timeDisplay.textContent = `${this.formatTime(video.currentTime)} / ${this.formatTime(video.duration)}`;
                
                if (Math.floor(video.currentTime) % 5 === 0) {
                    this.saveContinueWatching(movieId, video.currentTime, video.duration, percent);
                }
                
                this.watchTime++;
                if (this.watchTime % 60 === 0) {
                    localStorage.setItem('streamer_watchtime', this.watchTime);
                }
            }
        });
        
        video.addEventListener('play', () => {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            centerBtn.innerHTML = '<i class="fas fa-pause text-2xl"></i>';
            container.classList.remove('paused');
        });
        
        video.addEventListener('pause', () => {
            playBtn.innerHTML = '<i class="fas fa-play ml-1"></i>';
            centerBtn.innerHTML = '<i class="fas fa-play text-2xl ml-1"></i>';
            container.classList.add('paused');
        });
        
        video.addEventListener('ended', () => {
            this.showToast('Video ended', 'info');
            this.continueWatching = this.continueWatching.filter(item => item.movieId !== movieId);
            localStorage.setItem('streamer_continue', JSON.stringify(this.continueWatching));
        });
        
        video.addEventListener('waiting', () => {
            spinner.style.display = 'block';
        });
        
        video.addEventListener('playing', () => {
            spinner.style.display = 'none';
        });
        
        video.addEventListener('click', () => this.togglePlay());
        
        // Resume progress
        const progress = this.continueWatching.find(item => item.movieId === movieId);
        if (progress && progress.currentTime > 10) {
            video.currentTime = progress.currentTime;
        }
    }
    
    // ==================== PLAYER CONTROLS ====================
    togglePlay() {
        const video = document.getElementById('video-element');
        const dmPlayer = this.dmPlayer;
        
        if (dmPlayer) {
            dmPlayer.then ? dmPlayer.then(p => {
                p.getState().then(state => {
                    if (state.playerIsPlaying) {
                        p.pause();
                    } else {
                        p.play();
                    }
                });
            }) : null;
        } else if (video) {
            video.paused ? video.play() : video.pause();
        }
    }
    
    seekVideo(event) {
        const video = document.getElementById('video-element');
        const rect = event.currentTarget.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        
        if (this.dmPlayer) {
            this.dmPlayer.then ? this.dmPlayer.then(p => {
                p.duration.then(duration => {
                    p.seek(percent * duration);
                });
            }) : null;
        } else if (video && video.duration) {
            video.currentTime = percent * video.duration;
        }
    }
    
    skipForward() {
        const video = document.getElementById('video-element');
        
        if (this.dmPlayer) {
            this.dmPlayer.then ? this.dmPlayer.then(p => {
                p.currentTime.then(time => {
                    p.duration.then(duration => {
                        p.seek(Math.min(time + 10, duration));
                    });
                });
            }) : null;
        } else if (video) {
            video.currentTime = Math.min(video.currentTime + 10, video.duration);
        }
        
        this.showToast('+10 seconds', 'info');
    }
    
    skipBackward() {
        const video = document.getElementById('video-element');
        
        if (this.dmPlayer) {
            this.dmPlayer.then ? this.dmPlayer.then(p => {
                p.currentTime.then(time => {
                    p.seek(Math.max(time - 10, 0));
                });
            }) : null;
        } else if (video) {
            video.currentTime = Math.max(video.currentTime - 10, 0);
        }
        
        this.showToast('-10 seconds', 'info');
    }
    
    toggleSubtitle() {
        const track = document.getElementById('subtitle-track');
        const display = document.getElementById('subtitle-display');
        const btn = document.getElementById('subtitle-toggle');
        
        if (display.classList.contains('show')) {
            display.classList.remove('show');
            btn.classList.remove('text-red-500');
            this.showToast('Subtitles off', 'info');
        } else {
            display.classList.add('show');
            btn.classList.add('text-red-500');
            this.showToast('Subtitles on', 'success');
        }
    }
    
    toggleAISubtitles() {
        this.showToast('AI Subtitles: Analyzing audio...', 'info');
        
        // Simulate AI subtitle generation
        setTimeout(() => {
            const display = document.getElementById('subtitle-display');
            display.innerHTML = '<span class="ai-indicator">AI</span> [Auto-generated subtitles enabled]';
            display.classList.add('show');
            this.showToast('AI Subtitles active', 'success');
        }, 2000);
    }
    
    toggleFullscreen() {
        const container = document.getElementById('video-container');
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(() => this.showToast('Fullscreen error', 'error'));
        } else {
            document.exitFullscreen();
        }
    }
    
    closePlayer() {
        const video = document.getElementById('video-element');
        
        if (video) {
            video.pause();
            video.src = '';
        }
        
        if (this.dmPlayer) {
            this.dmPlayer.destroy();
            this.dmPlayer = null;
        }
        
        if (this.dmProgressInterval) {
            clearInterval(this.dmProgressInterval);
        }
        
        this.showScreen('main-screen');
    }
    
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
    
    // ==================== CONTINUE WATCHING ====================
    saveContinueWatching(movieId, currentTime, duration, percent) {
        const existing = this.continueWatching.find(item => item.movieId === movieId);
        const item = {
            movieId,
            currentTime,
            duration,
            percent: Math.round(percent),
            timestamp: Date.now()
        };
        
        if (existing) Object.assign(existing, item);
        else this.continueWatching.push(item);
        
        this.continueWatching.sort((a, b) => b.timestamp - a.timestamp);
        localStorage.setItem('streamer_continue', JSON.stringify(this.continueWatching));
    }
    
    clearContinueWatching() {
        if (confirm('Clear continue watching history?')) {
            this.continueWatching = [];
            localStorage.removeItem('streamer_continue');
            this.renderContinueWatching();
            this.updateStats();
            this.showToast('History cleared', 'success');
        }
    }
    
    // ==================== ADMIN: SAVE CONTENT ====================
    async saveContent() {
        const title = document.getElementById('admin-title').value.trim();
        const category = document.getElementById('admin-category').value;
        const year = parseInt(document.getElementById('admin-year').value) || new Date().getFullYear();
        const duration = document.getElementById('admin-duration').value.trim();
        const rating = parseFloat(document.getElementById('admin-rating').value) || 0;
        const description = document.getElementById('admin-description').value.trim();
        const videoUrl = document.getElementById('admin-video').value.trim();
        const subtitleUrl = document.getElementById('admin-subtitle').value.trim();
        const posterUrl = document.getElementById('poster-url').value.trim();
        
        let poster = posterUrl;
        const uploadPreview = document.getElementById('upload-preview');
        if (!uploadPreview.classList.contains('hidden') && uploadPreview.src && !uploadPreview.src.includes('placeholder')) {
            poster = uploadPreview.src;
        }
        
        if (!title || !category || !poster || !videoUrl) {
            this.showToast('Fill all required fields (*)', 'error');
            return;
        }
        
        const movieData = {
            title,
            category,
            year,
            duration,
            rating,
            description,
            poster,
            videoUrl,
            videoType: this.videoType,
            subtitleUrl: subtitleUrl || null,
            views: 0,
            timestamp: Date.now()
        };
        
        try {
            this.showToast('Saving to Firebase...', 'info');
            await addDoc(collection(this.db, "movies"), movieData);
            this.showToast('✅ Content saved!', 'success');
            
            this.resetAdminForm();
            await this.loadMovies();
        } catch (error) {
            console.error("Error saving:", error);
            let errorMsg = error.message;
            if (error.code === 'permission-denied') {
                errorMsg = 'Firebase rules not updated. Wait 2-3 mins & refresh.';
            }
            this.showToast('Error: ' + errorMsg, 'error');
        }
    }
    
    resetAdminForm() {
        document.getElementById('admin-title').value = '';
        document.getElementById('admin-video').value = '';
        document.getElementById('admin-subtitle').value = '';
        document.getElementById('poster-url').value = '';
        document.getElementById('admin-description').value = '';
        document.getElementById('admin-duration').value = '';
        document.getElementById('admin-rating').value = '';
        document.getElementById('upload-preview').classList.add('hidden');
        document.getElementById('upload-preview').src = '';
    }
    
    // ==================== DEMO CONTENT ====================
    async addDemoContent() {
        const demoMovies = [
            {
                title: "Demon Slayer",
                category: "Anime",
                year: 2019,
                duration: "24 min",
                rating: 8.7,
                description: "A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko.",
                poster: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
                videoUrl: "https://www.dailymotion.com/video/x7yg6mc",
                videoType: "dailymotion",
                views: 0,
                timestamp: Date.now()
            },
            {
                title: "Soul Land",
                category: "Donghua",
                year: 2018,
                duration: "20 min",
                rating: 8.2,
                description: "Tang San embarks on a journey to become a Spirit Master in the Soul Land.",
                poster: "https://m.media-amazon.com/images/M/MV5BNzBjZTBiZDgtYjA1OS00MjViLThkYWItMDU3YzcxNmQxNmRhXkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_.jpg",
                videoUrl: "https://www.dailymotion.com/video/x7yg6mc",
                videoType: "dailymotion",
                views: 0,
                timestamp: Date.now() - 1000
            },
            {
                title: "Squid Game",
                category: "K-Drama",
                year: 2021,
                duration: "60 min",
                rating: 8.0,
                description: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games.",
                poster: "https://m.media-amazon.com/images/M/MV5BYWE3MDVkN2EtNjQ5MS00ZDQ4LTllNzQtM2I1N2JkZDZlNTkwXkEyXkFqcGdeQXVyMTEzMTI1Mjk3._V1_.jpg",
                videoUrl: "https://www.dailymotion.com/video/x7yg6mc",
                videoType: "dailymotion",
                views: 0,
                timestamp: Date.now() - 2000
            },
            {
                title: "The Batman",
                category: "Movies",
                year: 2022,
                duration: "176 min",
                rating: 7.8,
                description: "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate.",
                poster: "https://m.media-amazon.com/images/M/MV5BMDdmMTBiNTYtMDIzNi00NGVlLWIzMDYtZTk3MTQ3NGQxZGEwXkEyXkFqcGdeQXVyMzMwOTU5MDk@._V1_.jpg",
                videoUrl: "https://www.dailymotion.com/video/x7yg6mc",
                videoType: "dailymotion",
                views: 0,
                timestamp: Date.now() - 3000
            }
        ];
        
        try {
            this.showToast('Adding demo content...', 'info');
            for (const movie of demoMovies) {
                await addDoc(collection(this.db, "movies"), movie);
            }
            this.showToast('✅ Demo content added!', 'success');
            await this.loadMovies();
        } catch (error) {
            console.error("Demo error:", error);
            this.showToast('Error: ' + error.message, 'error');
        }
    }
    
    // ==================== IMAGE UPLOAD ====================
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('upload-preview');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            this.showToast('Image loaded', 'success');
        };
        reader.readAsDataURL(file);
    }
    
    handleUrlInput(url) {
        if (url && url.startsWith('http')) {
            const preview = document.getElementById('upload-preview');
            preview.src = url;
            preview.classList.remove('hidden');
            preview.onload = () => this.showToast('Image URL valid', 'success');
            preview.onerror = () => {
                preview.classList.add('hidden');
                this.showToast('Invalid image URL', 'error');
            };
        }
    }
    
    // ==================== UI UTILITIES ====================
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            setTimeout(() => {
                if (!s.classList.contains('active')) s.style.display = 'none';
            }, 500);
        });
        
        const target = document.getElementById(screenId);
        if (target) {
            target.style.display = 'block';
            // Small delay for transition
            requestAnimationFrame(() => {
                target.classList.add('active');
            });
        }
        
        const hideNav = ['welcome-screen', 'player-screen'];
        const nav = document.getElementById('bottom-nav');
        if (nav) {
            if (hideNav.includes(screenId)) {
                nav.classList.add('hidden');
                nav.classList.remove('flex');
            } else {
                nav.classList.remove('hidden');
                nav.classList.add('flex');
            }
        }
        
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            const isActive = item.dataset.screen === screenId;
            item.classList.toggle('active', isActive);
            item.classList.toggle('text-red-500', isActive);
            item.classList.toggle('text-gray-400', !isActive);
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    guestLogin() {
        this.showScreen('main-screen');
        this.loadMovies();
    }
    
    updateStats() {
        const continueEl = document.getElementById('continue-count');
        const totalEl = document.getElementById('total-count');
        const watchEl = document.getElementById('watch-time');
        
        if (continueEl) continueEl.textContent = this.continueWatching.length;
        if (totalEl) totalEl.textContent = this.movies.length;
        if (watchEl) watchEl.textContent = Math.floor(this.watchTime / 60) + 'h';
    }
    
    clearAllData() {
        if (confirm('Clear all local data?')) {
            localStorage.removeItem('streamer_continue');
            localStorage.removeItem('streamer_watchtime');
            localStorage.removeItem('streamer_visited');
            this.continueWatching = [];
            this.watchTime = 0;
            this.updateStats();
            this.renderContinueWatching();
            this.showToast('All data cleared', 'success');
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `<i class="fas ${icons[type]}"></i>${message}`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.4s ease reverse';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
    
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('player-screen').classList.contains('active')) return;
            
            switch(e.key) {
                case ' ': 
                    e.preventDefault(); 
                    this.togglePlay(); 
                    break;
                case 'ArrowRight': 
                    this.skipForward(); 
                    break;
                case 'ArrowLeft': 
                    this.skipBackward(); 
                    break;
                case 'f': 
                    this.toggleFullscreen(); 
                    break;
                case 'Escape': 
                    if (document.fullscreenElement) document.exitFullscreen(); 
                    break;
            }
        });
        
        // Progress bar hover preview
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.addEventListener('mousemove', (e) => {
                const preview = document.getElementById('progress-preview');
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                preview.style.left = (percent * 100) + '%';
            });
        }
        
        // Double tap to skip
        let lastTap = 0;
        const videoContainer = document.getElementById('video-container');
        if (videoContainer) {
            videoContainer.addEventListener('touchend', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    const screenWidth = window.innerWidth;
                    if (e.changedTouches[0].clientX < screenWidth / 2) {
                        this.skipBackward();
                    } else {
                        this.skipForward();
                    }
                }
                lastTap = currentTime;
            });
        }
    }
}

// ==================== INITIALIZE APP ====================
window.app = new StreamerApp();
