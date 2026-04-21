import { 
    getFirestore, collection, addDoc, getDocs, query, orderBy, 
    doc, deleteDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, signInAnonymously, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
        this.videoType = 'dailymotion';
        this.dmPlayer = null;
        this.currentSlide = 0;
        this.slideInterval = null;
        this.heroMovies = [];
        
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('App initializing...');
        this.bindEvents();
        this.setupParticles();
        this.checkFirstTime();
        this.checkAdminMode();
        
        onAuthStateChanged(this.auth, (user) => {
            if (!user) this.signInGuest();
        });
    }
    
    // ==================== EVENT BINDING (FIXED) ====================
    bindEvents() {
        // Welcome screen
        document.getElementById('btn-start')?.addEventListener('click', () => this.guestLogin());
        document.getElementById('btn-admin')?.addEventListener('click', () => this.showAdminLogin());
        
        // Navigation
        document.getElementById('btn-search')?.addEventListener('click', () => this.showScreen('search-screen'));
        document.getElementById('btn-profile')?.addEventListener('click', () => this.showScreen('profile-screen'));
        document.getElementById('btn-back-search')?.addEventListener('click', () => this.showScreen('main-screen'));
        document.getElementById('btn-back-profile')?.addEventListener('click', () => this.showScreen('main-screen'));
        
        // Bottom nav
        document.getElementById('nav-home')?.addEventListener('click', () => this.showScreen('main-screen'));
        document.getElementById('nav-search')?.addEventListener('click', () => this.showScreen('search-screen'));
        document.getElementById('nav-profile')?.addEventListener('click', () => this.showScreen('profile-screen'));
        
        // Admin panel
        document.getElementById('btn-close-admin')?.addEventListener('click', () => this.hideAdminPanel());
        document.getElementById('btn-admin-panel')?.addEventListener('click', () => this.showAdminLogin());
        document.getElementById('upload-area')?.addEventListener('click', () => {
            document.getElementById('image-upload')?.click();
        });
        document.getElementById('image-upload')?.addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('poster-url')?.addEventListener('input', (e) => this.handleUrlInput(e.target.value));
        document.getElementById('btn-save')?.addEventListener('click', () => this.saveContent());
        document.getElementById('btn-demo')?.addEventListener('click', () => this.addDemoContent());
        
        // Video type buttons
        document.getElementById('btn-dailymotion')?.addEventListener('click', () => this.setVideoType('dailymotion'));
        document.getElementById('btn-mp4')?.addEventListener('click', () => this.setVideoType('mp4'));
        
        // Category pills
        document.querySelectorAll('.category-pill').forEach(pill => {
            pill.addEventListener('click', () => this.filterCategory(pill.dataset.cat));
        });
        
        // Slider buttons
        document.getElementById('btn-prev-slide')?.addEventListener('click', () => this.prevSlide());
        document.getElementById('btn-next-slide')?.addEventListener('click', () => this.nextSlide());
        
        // Search
        document.getElementById('search-input')?.addEventListener('keyup', () => this.searchMovies());
        
        // Player controls
        document.getElementById('btn-play-pause')?.addEventListener('click', () => this.togglePlay());
        document.getElementById('center-play-btn')?.addEventListener('click', () => this.togglePlay());
        document.getElementById('btn-skip-fwd')?.addEventListener('click', () => this.skipForward());
        document.getElementById('btn-skip-back')?.addEventListener('click', () => this.skipBackward());
        document.getElementById('btn-close-player')?.addEventListener('click', () => this.closePlayer());
        document.getElementById('btn-subtitle')?.addEventListener('click', () => this.toggleSubtitle());
        document.getElementById('btn-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('progress-bar')?.addEventListener('click', (e) => this.seekVideo(e));
        
        // AI Subtitles
        document.getElementById('btn-ai-sub')?.addEventListener('click', () => this.toggleAISubtitles());
        
        // Profile
        document.getElementById('btn-clear-continue')?.addEventListener('click', () => this.clearContinueWatching());
        document.getElementById('btn-clear-all')?.addEventListener('click', () => this.clearAllData());
        
        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    // ==================== FIRST TIME CHECK ====================
    checkFirstTime() {
        const hasVisited = localStorage.getItem('streamer_visited');
        if (hasVisited) {
            this.showScreen('main-screen');
            this.loadMovies();
        }
    }
    
    // ==================== PARTICLES ====================
    setupParticles() {
        const container = document.getElementById('particles-bg');
        if (!container) return;
        
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.cssText = `
                left: ${Math.random() * 100}%;
                animation-delay: ${Math.random() * 15}s;
                animation-duration: ${10 + Math.random() * 10}s;
                width: ${2 + Math.random() * 4}px;
                height: ${p.style.width};
            `;
            container.appendChild(p);
        }
    }
    
    // ==================== AUTH ====================
    async signInGuest() {
        try { await signInAnonymously(this.auth); } 
        catch (e) { console.log('Auth error:', e); }
    }
    
    // ==================== ADMIN ====================
    checkAdminMode() {
        const url = new URLSearchParams(window.location.search);
        const session = sessionStorage.getItem('streamer_admin');
        
        if (url.get('admin') === 'sumit81' || session === 'true') {
            this.isAdmin = true;
            sessionStorage.setItem('streamer_admin', 'true');
            document.getElementById('admin-panel')?.classList.remove('hidden');
        }
    }
    
    showAdminLogin() {
        const pass = prompt('Enter admin password:');
        if (pass === 'sumit81') {
            this.isAdmin = true;
            sessionStorage.setItem('streamer_admin', 'true');
            document.getElementById('admin-panel')?.classList.remove('hidden');
            this.showToast('Admin Mode Activated', 'success');
            
            const url = new URL(window.location);
            url.searchParams.set('admin', 'sumit81');
            window.history.pushState({}, '', url);
        } else {
            this.showToast('Invalid password', 'error');
        }
    }
    
    hideAdminPanel() {
        document.getElementById('admin-panel')?.classList.add('hidden');
    }
    
    // ==================== VIDEO TYPE ====================
    setVideoType(type) {
        this.videoType = type;
        const dm = document.getElementById('btn-dailymotion');
        const mp4 = document.getElementById('btn-mp4');
        const help = document.getElementById('video-help');
        
        if (type === 'dailymotion') {
            dm.className = 'flex-1 py-2 px-3 rounded-lg bg-red-600/20 text-red-400 text-xs font-semibold border border-red-600/30';
            mp4.className = 'flex-1 py-2 px-3 rounded-lg bg-gray-700/50 text-gray-400 text-xs font-semibold border border-gray-600';
            help.textContent = 'Paste Dailymotion video URL';
        } else {
            mp4.className = 'flex-1 py-2 px-3 rounded-lg bg-red-600/20 text-red-400 text-xs font-semibold border border-red-600/30';
            dm.className = 'flex-1 py-2 px-3 rounded-lg bg-gray-700/50 text-gray-400 text-xs font-semibold border border-gray-600';
            help.textContent = 'Paste direct MP4 or CDN URL';
        }
    }
    
    // ==================== LOAD MOVIES ====================
    async loadMovies() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            console.log('Loading from Firebase...');
            const q = query(collection(this.db, "movies"), orderBy("timestamp", "desc"));
            const snap = await getDocs(q);
            
            this.movies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log(`Loaded ${this.movies.length} movies`);
            
            if (this.movies.length === 0) {
                this.renderEmptyState();
            } else {
                this.renderMovies();
                this.setupHeroSlider();
            }
            this.updateStats();
            
        } catch (err) {
            console.error('Load error:', err);
            this.showToast('Failed to load: ' + err.message, 'error');
            // Load demo data if Firebase fails
            this.loadDemoData();
        } finally {
            this.isLoading = false;
        }
    }
    
    // ==================== DEMO DATA (FALLBACK) ====================
    loadDemoData() {
        this.movies = [
            {
                id: 'demo1',
                title: "Demon Slayer",
                category: "Anime",
                year: 2019,
                duration: "24 min",
                rating: 8.7,
                description: "A family is attacked by demons and only two members survive.",
                poster: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
                videoUrl: "https://www.dailymotion.com/video/x7yg6mc",
                videoType: "dailymotion",
                views: 1250,
                timestamp: Date.now()
            },
            {
                id: 'demo2',
                title: "Soul Land",
                category: "Donghua",
                year: 2018,
                duration: "20 min",
                rating: 8.2,
                description: "Tang San embarks on a journey to become a Spirit Master.",
                poster: "https://m.media-amazon.com/images/M/MV5BNzBjZTBiZDgtYjA1OS00MjViLThkYWItMDU3YzcxNmQxNmRhXkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_.jpg",
                videoUrl: "https://www.dailymotion.com/video/x7yg6mc",
                videoType: "dailymotion",
                views: 980,
                timestamp: Date.now() - 1000
            },
            {
                id: 'demo3',
                title: "Squid Game",
                category: "K-Drama",
                year: 2021,
                duration: "60 min",
                rating: 8.0,
                description: "Hundreds of cash-strapped players accept a strange invitation.",
                poster: "https://m.media-amazon.com/images/M/MV5BYWE3MDVkN2EtNjQ5MS00ZDQ4LTllNzQtM2I1N2JkZDZlNTkwXkEyXkFqcGdeQXVyMTEzMTI1Mjk3._V1_.jpg",
                videoUrl: "https://www.dailymotion.com/video/x7yg6mc",
                videoType: "dailymotion",
                views: 2100,
                timestamp: Date.now() - 2000
            }
        ];
        
        this.renderMovies();
        this.setupHeroSlider();
        this.updateStats();
        this.showToast('Demo mode: Firebase connection failed', 'info');
    }
    
    // ==================== HERO SLIDER ====================
    setupHeroSlider() {
        const featured = [...this.movies].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
        this.heroMovies = featured;
        this.currentSlide = 0;
        this.renderHeroSlides();
        this.startSlideTimer();
    }
    
    renderHeroSlides() {
        const container = document.getElementById('hero-slides');
        const dots = document.getElementById('hero-dots');
        
        if (!container || !this.heroMovies.length) return;
        
        container.innerHTML = this.heroMovies.map((m, i) => `
            <div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                <img src="${m.poster}" alt="${m.title}" onerror="this.src='https://via.placeholder.com/1200x600/1a1a1a/666?text=NO+IMAGE'">
                <div class="hero-slide-content">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="px-3 py-1 bg-red-600 rounded-full text-xs font-bold animate-pulse">FEATURED</span>
                        <span class="px-2 py-1 bg-white/10 rounded text-xs backdrop-blur-md">${m.category}</span>
                        <span class="text-yellow-400 text-sm font-bold"><i class="fas fa-star mr-1"></i>${m.rating || 'N/A'}</span>
                    </div>
                    <h2 class="text-3xl md:text-5xl font-black mb-3 line-clamp-2 leading-tight">${m.title}</h2>
                    <p class="text-gray-300 text-sm md:text-base mb-4 line-clamp-2 max-w-xl">${m.description || ''}</p>
                    <div class="flex items-center gap-4 mb-6 text-sm text-gray-400">
                        <span>${m.year || ''}</span>
                        <span class="w-1 h-1 rounded-full bg-gray-600"></span>
                        <span>${m.duration || ''}</span>
                        <span class="w-1 h-1 rounded-full bg-gray-600"></span>
                        <span><i class="fas fa-eye mr-1"></i>${m.views || 0}</span>
                    </div>
                    <button class="hero-play-btn bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold flex items-center gap-2 transition transform hover:scale-105 ripple-btn" data-movie-id="${m.id}">
                        <i class="fas fa-play"></i> Play Now
                    </button>
                </div>
            </div>
        `).join('');
        
        dots.innerHTML = this.heroMovies.map((_, i) => `
            <div class="hero-dot ${i === 0 ? 'active' : ''}" data-slide="${i}"></div>
        `).join('');
        
        // Bind hero play buttons (CRITICAL FIX)
        container.querySelectorAll('.hero-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const movieId = btn.dataset.movieId;
                console.log('Hero play clicked:', movieId);
                this.playMovie(movieId);
            });
        });
        
        // Bind dots
        dots.querySelectorAll('.hero-dot').forEach(dot => {
            dot.addEventListener('click', () => this.goToSlide(parseInt(dot.dataset.slide)));
        });
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
        
        document.querySelectorAll('.hero-slide').forEach((s, i) => {
            s.classList.toggle('active', i === index);
        });
        
        document.querySelectorAll('.hero-dot').forEach((d, i) => {
            d.classList.toggle('active', i === index);
        });
        
        this.currentSlide = index;
        this.startSlideTimer();
    }
    
    // ==================== RENDER MOVIES ====================
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
                    <span class="inline-block mt-2 px-3 py-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-full text-xs font-bold">Coming Soon</span>
                </div>`;
            return;
        }
        
        container.innerHTML = movies.map(m => this.createCard(m)).join('');
        
        // Bind card clicks (CRITICAL FIX)
        container.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                console.log('Card clicked:', movieId);
                this.playMovie(movieId);
            });
        });
    }
    
    createCard(movie) {
        return `
            <div class="flex-shrink-0 w-36 md:w-44 movie-card movie-card-3d" data-movie-id="${movie.id}">
                <div class="relative rounded-xl overflow-hidden mb-2 shadow-lg aspect-[2/3] bg-gray-800 group cursor-pointer">
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
    
    renderEmptyState() {
        const html = `
            <div class="text-center py-12 animate-fade-in">
                <i class="fas fa-film text-5xl text-gray-700 mb-4 animate-bounce-slow"></i>
                <p class="text-gray-500 mb-2">No content available</p>
                <p class="text-xs text-gray-600">Add content using Admin Panel</p>
            </div>`;
        
        document.getElementById('hero-slides').innerHTML = html;
        ['trending-container', 'foryou-container', 'new-container'].forEach(id => {
            document.getElementById(id).innerHTML = html;
        });
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
                <div class="flex-shrink-0 w-40 cursor-pointer group animate-fade-up" data-movie-id="${movie.id}">
                    <div class="relative rounded-xl overflow-hidden mb-2 aspect-[2/3] shadow-lg">
                        <img src="${movie.poster}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                             onerror="this.src='https://via.placeholder.com/300x450/1a1a1a/666?text=NO+IMAGE'">
                        <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                            <div class="h-full bg-gradient-to-r from-red-500 to-purple-500 transition-all duration-300" style="width: ${item.percent || 0}%"></div>
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
        
        // Bind clicks
        container.querySelectorAll('[data-movie-id]').forEach(el => {
            el.addEventListener('click', () => this.playMovie(el.dataset.movieId));
        });
    }
    
    // ==================== CATEGORY FILTER ====================
    filterCategory(cat) {
        this.activeCategory = cat;
        
        document.querySelectorAll('.category-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.cat === cat);
        });
        
        this.renderMovies();
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
            m.category?.toLowerCase().includes(query)
        );
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 animate-fade-in">
                    <i class="fas fa-search text-4xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400">No results for "${query}"</p>
                </div>`;
        } else {
            container.innerHTML = `<div class="col-span-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-fade-in">${filtered.map(m => this.createCard(m)).join('')}</div>`;
            
            // Bind clicks
            container.querySelectorAll('.movie-card').forEach(card => {
                card.addEventListener('click', () => this.playMovie(card.dataset.movieId));
            });
        }
    }
    
    // ==================== VIDEO PLAYER (FIXED) ====================
    async playMovie(movieId) {
        console.log('Playing movie:', movieId);
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
        } catch (e) {}
        
        // Setup player
        const isDM = movie.videoUrl?.includes('dailymotion.com') || movie.videoType === 'dailymotion';
        
        if (isDM) {
            this.setupDailymotionPlayer(movie);
        } else {
            this.setupNativePlayer(movie);
        }
        
        // Show AI button if subtitles available
        const aiBtn = document.getElementById('btn-ai-sub');
        if (aiBtn) aiBtn.style.display = movie.subtitleUrl ? 'flex' : 'none';
        
        // Resume progress
        const progress = this.continueWatching.find(item => item.movieId === movieId);
        if (progress && progress.currentTime > 10) {
            setTimeout(() => {
                const video = document.getElementById('video-element');
                if (video && !isDM) {
                    video.currentTime = progress.currentTime;
                }
                this.showToast(`Resumed from ${this.formatTime(progress.currentTime)}`, 'info');
            }, 1000);
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
        
        // Extract video ID
        let videoId = '';
        const match = movie.videoUrl.match(/video\/([a-zA-Z0-9]+)/);
        if (match) videoId = match[1];
        
        if (!videoId) {
            this.showToast('Invalid Dailymotion URL', 'error');
            return;
        }
        
        // Clear previous
        dmContainer.innerHTML = '';
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&controls=0&ui-start-screen-info=0`;
        iframe.style.cssText = 'width:100%;height:100%;border:none;';
        iframe.allowFullscreen = true;
        
        dmContainer.appendChild(iframe);
        this.showToast(`Playing: ${movie.title}`, 'success');
        
        // Setup DM tracking simulation
        this.setupDMTracking();
    }
    
    setupDMTracking() {
        // Dailymotion doesn't expose currentTime easily without API
        // So we simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            if (!this.currentMovie || document.getElementById('player-screen').style.display === 'none') {
                clearInterval(interval);
                return;
            }
            progress += 0.5;
            document.getElementById('progress-fill').style.width = Math.min(progress, 100) + '%';
            document.getElementById('time-display').textContent = `${this.formatTime(progress * 0.6)} / Live`;
        }, 1000);
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
        
        // Clear DM
        dmContainer.innerHTML = '';
        
        video.src = movie.videoUrl;
        video.load();
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                this.showToast('Click to play', 'info');
            });
        }
        
        this.setupVideoTracking(video, movie.id);
    }
    
    setupVideoTracking(video, movieId) {
        const progressFill = document.getElementById('progress-fill');
        const timeDisplay = document.getElementById('time-display');
        const playBtn = document.getElementById('btn-play-pause');
        const centerBtn = document.getElementById('center-play-btn');
        const container = document.getElementById('video-container');
        const spinner = document.getElementById('buffering-spinner');
        
        const updatePlayState = () => {
            const isPlaying = !video.paused;
            playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play ml-1"></i>';
            centerBtn.innerHTML = isPlaying ? '<i class="fas fa-pause text-2xl"></i>' : '<i class="fas fa-play text-2xl ml-1"></i>';
            container.classList.toggle('paused', !isPlaying);
        };
        
        video.ontimeupdate = () => {
            if (video.duration) {
                const percent = (video.currentTime / video.duration) * 100;
                progressFill.style.width = percent + '%';
                timeDisplay.textContent = `${this.formatTime(video.currentTime)} / ${this.formatTime(video.duration)}`;
                
                if (Math.floor(video.currentTime) % 5 === 0) {
                    this.saveContinueWatching(movieId, video.currentTime, video.duration, percent);
                }
            }
        };
        
        video.onplay = updatePlayState;
        video.onpause = updatePlayState;
        video.onended = () => {
            this.showToast('Video ended', 'info');
            this.continueWatching = this.continueWatching.filter(item => item.movieId !== movieId);
            localStorage.setItem('streamer_continue', JSON.stringify(this.continueWatching));
        };
        
        video.onwaiting = () => spinner.style.display = 'block';
        video.onplaying = () => spinner.style.display = 'none';
        
        updatePlayState();
    }
    
    // ==================== PLAYER CONTROLS ====================
    togglePlay() {
        const video = document.getElementById('video-element');
        const dmContainer = document.getElementById('dailymotion-player');
        
        // If Dailymotion is active, toggle via postMessage
        if (!dmContainer.classList.contains('hidden')) {
            const iframe = dmContainer.querySelector('iframe');
            if (iframe) {
                iframe.contentWindow.postMessage('{"event":"command","func":"togglePlay","args":""}', '*');
            }
            return;
        }
        
        if (video) {
            video.paused ? video.play() : video.pause();
        }
    }
    
    seekVideo(event) {
        const video = document.getElementById('video-element');
        const rect = event.currentTarget.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        
        if (video && video.duration) {
            video.currentTime = percent * video.duration;
        }
    }
    
    skipForward() {
        const video = document.getElementById('video-element');
        if (video) video.currentTime = Math.min(video.currentTime + 10, video.duration);
        this.showToast('+10 seconds', 'info');
    }
    
    skipBackward() {
        const video = document.getElementById('video-element');
        if (video) video.currentTime = Math.max(video.currentTime - 10, 0);
        this.showToast('-10 seconds', 'info');
    }
    
    toggleSubtitle() {
        const display = document.getElementById('subtitle-display');
        const btn = document.getElementById('btn-subtitle');
        
        if (display.classList.contains('show')) {
            display.classList.remove('show');
            btn.classList.remove('text-red-500');
        } else {
            display.classList.add('show');
            btn.classList.add('text-red-500');
            if (this.currentMovie?.subtitleUrl) {
                display.innerHTML = 'Loading subtitles...';
            }
        }
    }
    
    toggleFullscreen() {
        const container = document.getElementById('video-container');
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }
    
    closePlayer() {
        const video = document.getElementById('video-element');
        const dmContainer = document.getElementById('dailymotion-player');
        
        if (video) {
            video.pause();
            video.src = '';
            video.ontimeupdate = null;
            video.onplay = null;
            video.onpause = null;
        }
        
        dmContainer.innerHTML = '';
        dmContainer.classList.add('hidden');
        
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
        const item = { movieId, currentTime, duration, percent: Math.round(percent), timestamp: Date.now() };
        
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
    
    // ==================== ADMIN SAVE ====================
    async saveContent() {
        const title = document.getElementById('admin-title')?.value.trim();
        const category = document.getElementById('admin-category')?.value;
        const year = parseInt(document.getElementById('admin-year')?.value) || new Date().getFullYear();
        const duration = document.getElementById('admin-duration')?.value.trim();
        const rating = parseFloat(document.getElementById('admin-rating')?.value) || 0;
        const description = document.getElementById('admin-description')?.value.trim();
        const videoUrl = document.getElementById('admin-video')?.value.trim();
        const subtitleUrl = document.getElementById('admin-subtitle')?.value.trim();
        const posterUrl = document.getElementById('poster-url')?.value.trim();
        
        let poster = posterUrl;
        const uploadPreview = document.getElementById('upload-preview');
        if (!uploadPreview?.classList.contains('hidden') && uploadPreview?.src) {
            poster = uploadPreview.src;
        }
        
        if (!title || !category || !poster || !videoUrl) {
            this.showToast('Fill all required fields (*)', 'error');
            return;
        }
        
        const movieData = {
            title, category, year, duration, rating, description,
            poster, videoUrl, videoType: this.videoType,
            subtitleUrl: subtitleUrl || null,
            views: 0, timestamp: Date.now()
        };
        
        try {
            this.showToast('Saving...', 'info');
            await addDoc(collection(this.db, "movies"), movieData);
            this.showToast('Content saved!', 'success');
            this.resetAdminForm();
            await this.loadMovies();
        } catch (error) {
            console.error('Save error:', error);
            this.showToast('Error: ' + error.message, 'error');
        }
    }
    
    resetAdminForm() {
        ['admin-title', 'admin-video', 'admin-subtitle', 'poster-url', 'admin-description', 'admin-duration', 'admin-rating'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const preview = document.getElementById('upload-preview');
        if (preview) {
            preview.classList.add('hidden');
            preview.src = '';
        }
    }
    
    // ==================== DEMO CONTENT ====================
    async addDemoContent() {
        const demos = [
            { title: "Attack on Titan", category: "Anime", year: 2013, duration: "24 min", rating: 9.0, description: "Humans fight against man-eating giants.", poster: "https://cdn.myanimelist.net/images/anime/10/47347.jpg", videoUrl: "https://www.dailymotion.com/video/x7yg6mc", videoType: "dailymotion", views: 5000, timestamp: Date.now() },
            { title: "Mo Dao Zu Shi", category: "Donghua", year: 2018, duration: "24 min", rating: 8.5, description: "A cultivator returns to life to solve mysteries.", poster: "https://m.media-amazon.com/images/M/MV5BNzBjZTBiZDgtYjA1OS00MjViLThkYWItMDU3YzcxNmQxNmRhXkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_.jpg", videoUrl: "https://www.dailymotion.com/video/x7yg6mc", videoType: "dailymotion", views: 3200, timestamp: Date.now() - 1000 }
        ];
        
        try {
            this.showToast('Adding demo content...', 'info');
            for (const movie of demos) {
                await addDoc(collection(this.db, "movies"), movie);
            }
            this.showToast('Demo content added!', 'success');
            await this.loadMovies();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    }
    
    // ==================== IMAGE HANDLING ====================
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            this.showToast('Please select an image', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('upload-preview');
            if (preview) {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            }
            this.showToast('Image loaded', 'success');
        };
        reader.readAsDataURL(file);
    }
    
    handleUrlInput(url) {
        if (!url?.startsWith('http')) return;
        const preview = document.getElementById('upload-preview');
        if (!preview) return;
        
        preview.src = url;
        preview.classList.remove('hidden');
        preview.onload = () => this.showToast('Image valid', 'success');
        preview.onerror = () => {
            preview.classList.add('hidden');
            this.showToast('Invalid image URL', 'error');
        };
    }
    
    // ==================== SCREEN NAVIGATION ====================
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
            requestAnimationFrame(() => target.classList.add('active'));
        }
        
        const hideNav = ['welcome-screen', 'player-screen'];
        const nav = document.getElementById('bottom-nav');
        if (nav) {
            nav.classList.toggle('hidden', hideNav.includes(screenId));
            nav.classList.toggle('flex', !hideNav.includes(screenId));
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
        localStorage.setItem('streamer_visited', 'true');
        this.showScreen('main-screen');
        this.loadMovies();
    }
    
    updateStats() {
        document.getElementById('continue-count').textContent = this.continueWatching.length;
        document.getElementById('total-count').textContent = this.movies.length;
        document.getElementById('watch-time').textContent = Math.floor(this.watchTime / 60) + 'h';
    }
    
    clearAllData() {
        if (!confirm('Clear all local data?')) return;
        localStorage.removeItem('streamer_continue');
        localStorage.removeItem('streamer_watchtime');
        localStorage.removeItem('streamer_visited');
        this.continueWatching = [];
        this.watchTime = 0;
        this.updateStats();
        this.renderContinueWatching();
        this.showToast('All data cleared', 'success');
    }
    
    // ==================== TOAST ====================
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        toast.innerHTML = `<i class="fas ${icons[type]}"></i>${message}`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.4s ease reverse';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
    
    // ==================== KEYBOARD ====================
    handleKeydown(e) {
        if (!document.getElementById('player-screen').classList.contains('active')) return;
        
        switch(e.key) {
            case ' ': e.preventDefault(); this.togglePlay(); break;
            case 'ArrowRight': this.skipForward(); break;
            case 'ArrowLeft': this.skipBackward(); break;
            case 'f': this.toggleFullscreen(); break;
            case 'Escape': if (document.fullscreenElement) document.exitFullscreen(); break;
        }
    }
    
    // ==================== AI SUBTITLES (STUB) ====================
    toggleAISubtitles() {
        if (window.aiSubtitles) {
            window.aiSubtitles.showLanguageSelector();
        } else {
            this.showToast('AI Subtitles loading...', 'info');
        }
    }
}

// ==================== INIT ====================
window.app = new StreamerApp();
