class StreamerApp {
    constructor() {
        this.movies = [];
        this.continueWatching = JSON.parse(localStorage.getItem('streamer_continue') || '[]');
        this.watchTime = parseInt(localStorage.getItem('streamer_watchtime') || '0');
        this.currentMovie = null;
        this.isAdmin = false;
        this.activeCategory = 'All';
        this.isLoading = false;
        this.heroSlideIndex = 0;
        this.heroSlideInterval = null;
        this.searchFilter = 'all';
        this.firebaseReady = false;
        this.init();
    }
      
    init() {
        this.setupEventListeners();
        this.checkFirstTime();
        this.checkAdminMode();
        this.waitForFirebase();
    }
    
    waitForFirebase() {
        const check = setInterval(() => {
            if (window.FirebaseAPI) {
                this.firebaseReady = true;
                clearInterval(check);
                console.log('Firebase ready');
                if (document.getElementById('main-screen').classList.contains('active')) {
                    this.loadMovies();
                }
            }
        }, 100);
        setTimeout(() => {
            if (!this.firebaseReady) {
                clearInterval(check);
                console.log('Firebase timeout, using localStorage');
                this.firebaseReady = false;
                if (document.getElementById('main-screen').classList.contains('active')) {
                    this.loadMovies();
                }
            }
        }, 5000);
    }
    
    checkFirstTime() {
        const hasVisited = localStorage.getItem('streamer_visited');
        if (hasVisited) {
            this.showScreen('main-screen');
        }
    }
      
    checkAdminMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const adminParam = urlParams.get('admin');
        const savedAdmin = sessionStorage.getItem('streamer_admin');
        
        if (adminParam === 'sumit81' || savedAdmin === 'true') {
            this.isAdmin = true;
            sessionStorage.setItem('streamer_admin', 'true');
            this.showAdminPanel();
        }
    }
    
    showAdminPanel() {
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) {
            adminPanel.classList.remove('hidden');
            adminPanel.style.display = 'block';
            adminPanel.style.visibility = 'visible';
            adminPanel.style.opacity = '1';
        }
    }
    
    hideAdminPanel() {
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) {
            adminPanel.classList.add('hidden');
            adminPanel.style.display = 'none';
        }
    }
      
    showAdminLogin() {
        const password = prompt('Enter admin password:');
        if (password === 'Sumit.streamer@81#live.ott') {
            this.isAdmin = true;
            sessionStorage.setItem('streamer_admin', 'true');
            this.showAdminPanel();
            this.showToast('🔥 Admin Mode Activated', 'success');
            
            const url = new URL(window.location);
            url.searchParams.set('admin', 'sumit81');
            window.history.pushState({}, '', url);
            
            // Load movies if on main screen
            if (document.getElementById('main-screen').classList.contains('active')) {
                this.loadMovies();
            } else {
                this.showScreen('main-screen');
                setTimeout(() => this.loadMovies(), 300);
            }
        } else {
            this.showToast('Invalid password', 'error');
        }
    }
      
    toggleVideoInput() {
        const type = document.getElementById('video-type').value;
        const hint = document.getElementById('video-hint');
        const input = document.getElementById('admin-video');
        switch(type) {
            case 'dailymotion':
                hint.textContent = 'Dailymotion video URL paste karein';
                input.placeholder = 'https://www.dailymotion.com/video/xxxxx';
                break;
            case 'hls':
                hint.textContent = 'HLS stream URL (.m3u8 format)';
                input.placeholder = 'https://cdn.example.com/video.m3u8';
                break;
            case 'mp4':
                hint.textContent = 'Direct MP4 video URL';
                input.placeholder = 'https://example.com/video.mp4';
                break;
        }
    }
      
    async loadMovies() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            let movies = [];
            
            if (this.firebaseReady && window.FirebaseAPI) {
                try {
                    movies = await window.FirebaseAPI.getMovies();
                    console.log('Loaded from Firebase:', movies.length);
                } catch (firebaseError) {
                    console.log('Firebase error, falling back:', firebaseError);
                }
            }
            
            if (!movies || movies.length === 0) {
                const stored = localStorage.getItem('streamer_movies');
                if (stored) {
                    movies = JSON.parse(stored);
                } else {
                    movies = this.getDemoMovies();
                    localStorage.setItem('streamer_movies', JSON.stringify(movies));
                }
            }
            
            this.movies = movies;
            
            if (this.movies.length === 0) {
                this.renderEmptyState();
            } else {
                this.renderMovies();
                this.startHeroSlider();
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
    
    getDemoMovies() {
        return [
            { id: 'demo-1', title: "Demon Slayer", category: "Anime", year: 2019, duration: "24 min", rating: 8.7, description: "A family is attacked by demons and only two members survive.", poster: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg", videoUrl: "x8z1a2b", videoType: "dailymotion", views: 1250, timestamp: Date.now() },
            { id: 'demo-2', title: "Soul Land", category: "Donghua", year: 2018, duration: "20 min", rating: 8.2, description: "Tang San embarks on a journey to become a Spirit Master.", poster: "https://m.media-amazon.com/images/M/MV5BNzBjZTBiZDgtYjA1OS00MjViLThkYWItMDU3YzcxNmQxNmRhXkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_.jpg", videoUrl: "x6z2a3c", videoType: "dailymotion", views: 980, timestamp: Date.now() - 1000 },
            { id: 'demo-3', title: "Squid Game", category: "K-Drama", year: 2021, duration: "60 min", rating: 8.0, description: "Hundreds of players accept a strange invitation to compete.", poster: "https://m.media-amazon.com/images/M/MV5BYWE3MDVkN2EtNjQ5MS00ZDQ4LTllNzQtM2I1N2JkZDZlNTkwXkEyXkFqcGdeQXVyMTEzMTI1Mjk3._V1_.jpg", videoUrl: "x8y3b4d", videoType: "dailymotion", views: 2100, timestamp: Date.now() - 2000 },
            { id: 'demo-4', title: "The Batman", category: "Movies", year: 2022, duration: "176 min", rating: 7.9, description: "Batman is forced to investigate a sadistic serial killer.", poster: "https://m.media-amazon.com/images/M/MV5BMDdmMTBiNTYtMDIzNi00NGVlLWIzMDYtZTk3MTQ3NGQxZGEwXkEyXkFqcGdeQXVyMzMwOTU5MDk@._V1_.jpg", videoUrl: "x8x4c5e", videoType: "dailymotion", views: 1500, timestamp: Date.now() - 3000 },
            { id: 'demo-5', title: "Money Heist", category: "Web Series", year: 2017, duration: "50 min", rating: 8.2, description: "A criminal mastermind plans the biggest heist in history.", poster: "https://m.media-amazon.com/images/M/MV5BNDJkYzY3MzMtMGFhYi00MmQ4LWJkNTgtZGNiZGZmNTMxYmUwXkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_.jpg", videoUrl: "x7w5d6f", videoType: "dailymotion", views: 1800, timestamp: Date.now() - 4000 }
        ];
    }
      
    renderEmptyState() {
        const emptyHTML = `<div class="text-center py-12"><i class="fas fa-film text-5xl text-gray-700 mb-4"></i><p class="text-gray-500 mb-2">No content available</p>${this.isAdmin ? '<p class="text-xs text-gray-600">Add content using Admin Panel above</p>' : '<p class="text-xs text-gray-600">Check back later</p>'}</div>`;
        document.getElementById('hero-slides').innerHTML = emptyHTML;
        document.getElementById('trending-container').innerHTML = emptyHTML;
        document.getElementById('foryou-container').innerHTML = emptyHTML;
        document.getElementById('new-container').innerHTML = emptyHTML;
    }
      
    renderMovies() {
        const movies = this.activeCategory === 'All' ? this.movies : this.movies.filter(m => m.category === this.activeCategory);
        this.renderHeroSlides(movies.slice(0, 5));
        this.renderContinueWatching();
        const trending = [...movies].sort((a, b) => (b.views || 0) - (a.views || 0));
        this.renderSection('trending-container', trending.slice(0, 10));
        const forYou = [...movies].sort(() => Math.random() - 0.5);
        this.renderSection('foryou-container', forYou.slice(0, 10));
        const newReleases = [...movies].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        this.renderSection('new-container', newReleases.slice(0, 10));
    }
    
    renderHeroSlides(movies) {
        const container = document.getElementById('hero-slides');
        const indicators = document.getElementById('slider-indicators');
        if (!movies.length) {
            container.innerHTML = `<div class="w-full h-full flex items-center justify-center"><div class="text-center"><div class="skeleton w-64 h-96 mx-auto mb-4 rounded-xl"></div><p class="text-gray-500 animate-pulse">Loading...</p></div></div>`;
            return;
        }
        container.innerHTML = movies.map((movie, index) => `
            <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                <img src="${movie.poster}" onerror="this.src='https://via.placeholder.com/800x600/1a1a1a/666?text=NO+IMAGE'">
                <div class="hero-content">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="px-3 py-1 bg-red-600 rounded-full text-xs font-bold">FEATURED</span>
                        <span class="px-2 py-1 bg-white/10 rounded text-xs backdrop-blur-md">${movie.category}</span>
                    </div>
                    <h2 class="text-3xl md:text-5xl font-black mb-3 line-clamp-2 leading-tight">${movie.title}</h2>
                    <p class="text-gray-300 text-sm md:text-base mb-4 line-clamp-2 max-w-xl">${movie.description || ''}</p>
                    <div class="flex items-center gap-4 mb-6 text-sm">
                        <span class="text-yellow-400 font-bold"><i class="fas fa-star mr-1"></i>${movie.rating || 'N/A'}</span>
                        <span class="text-gray-400">${movie.year || ''}</span>
                        <span class="text-gray-400">${movie.duration || ''}</span>
                    </div>
                    <button onclick="app.playMovie('${movie.id}')" class="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold flex items-center gap-2 transition transform hover:scale-105">
                        <i class="fas fa-play"></i> Play Now
                    </button>
                </div>
            </div>
        `).join('');
        indicators.innerHTML = movies.map((_, index) => `<div class="slider-dot ${index === 0 ? 'active' : ''}" onclick="app.goToSlide(${index})"></div>`).join('');
    }
    
    startHeroSlider() {
        if (this.heroSlideInterval) clearInterval(this.heroSlideInterval);
        this.heroSlideInterval = setInterval(() => {
            const slides = document.querySelectorAll('.hero-slide');
            if (!slides.length) return;
            slides[this.heroSlideIndex].classList.remove('active');
            document.querySelectorAll('.slider-dot')[this.heroSlideIndex]?.classList.remove('active');
            this.heroSlideIndex = (this.heroSlideIndex + 1) % slides.length;
            slides[this.heroSlideIndex].classList.add('active');
            document.querySelectorAll('.slider-dot')[this.heroSlideIndex]?.classList.add('active');
        }, 4000);
    }
    
    goToSlide(index) {
        const slides = document.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('.slider-dot');
        slides[this.heroSlideIndex].classList.remove('active');
        dots[this.heroSlideIndex]?.classList.remove('active');
        this.heroSlideIndex = index;
        slides[this.heroSlideIndex].classList.add('active');
        dots[this.heroSlideIndex]?.classList.add('active');
        clearInterval(this.heroSlideInterval);
        this.startHeroSlider();
    }
      
    renderSection(containerId, movies) {
        const container = document.getElementById(containerId);
        if (!movies.length) {
            container.innerHTML = `<div class="text-center py-8 text-gray-500 w-full">No content</div>`;
            return;
        }
        container.innerHTML = movies.map(m => this.createCard(m)).join('');
    }
      
    createCard(movie) {
        const hasContent = movie.videoUrl && movie.videoUrl.length > 0;
        return `
            <div class="flex-shrink-0 w-36 md:w-44 movie-card" onclick="${hasContent ? `app.playMovie('${movie.id}')` : ''}">
                <div class="relative rounded-xl overflow-hidden mb-2 shadow-lg aspect-[2/3] bg-gray-800">
                    <img src="${movie.poster}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/1a1a1a/666?text=NO+IMAGE'">
                    <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold">
                        <i class="fas fa-star text-yellow-400 mr-1"></i>${movie.rating || '-'}
                    </div>
                    ${!hasContent ? '<div class="coming-soon">Coming Soon</div>' : ''}
                    <div class="play-overlay">
                        <div class="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:scale-110 transition shadow-lg">
                            <i class="fas fa-play text-white ml-1"></i>
                        </div>
                    </div>
                </div>
                <p class="text-sm font-semibold truncate mb-1">${movie.title}</p>
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
        if (!this.continueWatching.length) {
            section.classList.add('hidden');
            return;
        }
        section.classList.remove('hidden');
        container.innerHTML = this.continueWatching.slice(0, 6).map(item => {
            const movie = this.movies.find(m => m.id === item.movieId);
            if (!movie) return '';
            return `
                <div onclick="app.playMovie('${movie.id}')" class="flex-shrink-0 w-40 cursor-pointer group">
                    <div class="relative rounded-xl overflow-hidden mb-2 aspect-[2/3]">
                        <img src="${movie.poster}" class="w-full h-full object-cover group-hover:scale-105 transition" onerror="this.src='https://via.placeholder.com/300x450/1a1a1a/666?text=NO+IMAGE'">
                        <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                            <div class="h-full bg-red-600" style="width: ${item.percent || 0}%"></div>
                        </div>
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                            <div class="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <i class="fas fa-play text-white text-xs ml-0.5"></i>
                            </div>
                        </div>
                    </div>
                    <p class="text-sm font-medium truncate">${movie.title}</p>
                    <p class="text-xs text-gray-500">${item.percent || 0}% watched</p>
                </div>`;
        }).join('');
    }
      
    filterCategory(cat) {
        this.activeCategory = cat;
        document.querySelectorAll('.category-pill').forEach(p => {
            const span = p.querySelector('span').textContent.trim();
            const isActive = span === cat || (cat === 'K-Drama' && span === 'K-Drama') || (cat === 'All' && span === 'All');
            p.classList.toggle('active', isActive);
        });
        this.renderMovies();
    }
      
    searchMovies() {
        const query = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
        const container = document.getElementById('search-container');
        if (!query) {
            container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500"><i class="fas fa-search text-4xl mb-4 opacity-50"></i><p>Type to search content...</p></div>`;
            return;
        }
        let filtered = this.movies.filter(m => 
            m.title?.toLowerCase().includes(query) ||
            m.category?.toLowerCase().includes(query) ||
            m.description?.toLowerCase().includes(query)
        );
        if (this.searchFilter !== 'all') {
            filtered = filtered.filter(m => m.category === this.searchFilter);
        }
        if (filtered.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-12"><i class="fas fa-search text-4xl text-gray-600 mb-4"></i><p class="text-gray-400">No results for "${query}"</p></div>`;
        } else {
            container.innerHTML = `<div class="col-span-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">${filtered.map(m => this.createCard(m)).join('')}</div>`;
        }
    }
    
    setSearchFilter(filter) {
        this.searchFilter = filter;
        document.querySelectorAll('.search-filter').forEach(btn => {
            const isActive = btn.textContent === (filter === 'all' ? 'All' : filter);
            btn.classList.toggle('active', isActive);
            if (isActive) {
                btn.classList.remove('bg-gray-800', 'text-gray-400');
                btn.classList.add('bg-red-600', 'text-white');
            } else {
                btn.classList.remove('bg-red-600', 'text-white');
                btn.classList.add('bg-gray-800', 'text-gray-400');
            }
        });
        this.searchMovies();
    }
      
    playMovie(movieId) {
        const movie = this.movies.find(m => m.id === movieId);
        if (!movie) {
            this.showToast('Content not found', 'error');
            return;
        }
        this.currentMovie = movie;
        player.loadMovie(movie);
        this.showScreen('player-screen');
        
        if (this.firebaseReady && window.FirebaseAPI) {
            window.FirebaseAPI.updateViews(movieId).catch(() => {});
        }
        movie.views = (movie.views || 0) + 1;
        localStorage.setItem('streamer_movies', JSON.stringify(this.movies));
    }
      
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
      
    async saveContent() {
        const title = document.getElementById('admin-title').value.trim();
        const category = document.getElementById('admin-category').value;
        const year = parseInt(document.getElementById('admin-year').value) || new Date().getFullYear();
        const duration = document.getElementById('admin-duration').value.trim();
        const rating = parseFloat(document.getElementById('admin-rating').value) || 0;
        const description = document.getElementById('admin-description').value.trim();
        const videoType = document.getElementById('video-type').value;
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
            title, category, year, duration, rating, description,
            poster, videoUrl, videoType, subtitleUrl: subtitleUrl || null,
            views: 0, timestamp: Date.now()
        };
        
        try {
            let savedId;
            
            if (this.firebaseReady && window.FirebaseAPI) {
                try {
                    const result = await window.FirebaseAPI.saveMovie(movieData);
                    savedId = result.id;
                    this.showToast('✅ Saved to Firebase!', 'success');
                } catch (firebaseError) {
                    console.log('Firebase save failed:', firebaseError);
                    savedId = 'local-' + Date.now();
                    this.showToast('Saved locally (Firebase offline)', 'info');
                }
            } else {
                savedId = 'local-' + Date.now();
                this.showToast('Saved locally', 'info');
            }
            
            movieData.id = savedId;
            this.movies.unshift(movieData);
            localStorage.setItem('streamer_movies', JSON.stringify(this.movies));
            
            this.resetAdminForm();
            this.renderMovies();
            
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
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
          
    async addDemoContent() {
        const demoMovies = [
            { title: "Attack on Titan", category: "Anime", year: 2013, duration: "24 min", rating: 9.0, description: "Humans battle giant humanoid Titans.", poster: "https://cdn.myanimelist.net/images/anime/10/47347.jpg", videoUrl: "x8z1a2b", videoType: "dailymotion", views: 0, timestamp: Date.now() },
            { title: "Mo Dao Zu Shi", category: "Donghua", year: 2018, duration: "24 min", rating: 8.5, description: "A cultivator returns to life 13 years later.", poster: "https://cdn.myanimelist.net/images/anime/1258/93893.jpg", videoUrl: "x6z2a3c", videoType: "dailymotion", views: 0, timestamp: Date.now() - 1000 }
        ];
        
        try {
            for (const movie of demoMovies) {
                movie.id = 'demo-' + Date.now() + Math.random();
                
                if (this.firebaseReady && window.FirebaseAPI) {
                    try {
                        await window.FirebaseAPI.saveMovie(movie);
                    } catch (e) {
                        console.log('Firebase demo save failed');
                    }
                }
                this.movies.push(movie);
            }
            
            localStorage.setItem('streamer_movies', JSON.stringify(this.movies));
            this.showToast('✅ Demo content added!', 'success');
            this.renderMovies();
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    }
          
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
      
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            target.style.display = 'block';
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
        window.scrollTo(0, 0);
    }
      
    guestLogin() {
        localStorage.setItem('streamer_visited', 'true');
        this.showScreen('main-screen');
    }
      
    updateStats() {
        document.getElementById('continue-count').textContent = this.continueWatching.length;
        document.getElementById('total-count').textContent = this.movies.length;
        document.getElementById('watch-time').textContent = Math.floor(this.watchTime / 60) + 'h';
    }
      
    clearAllData() {
        if (confirm('Clear all local data?')) {
            localStorage.removeItem('streamer_continue');
            localStorage.removeItem('streamer_watchtime');
            localStorage.removeItem('streamer_movies');
            localStorage.removeItem('streamer_visited');
            this.continueWatching = [];
            this.watchTime = 0;
            this.movies = [];
            this.updateStats();
            this.renderContinueWatching();
            this.showToast('All data cleared', 'success');
            this.renderEmptyState();
        }
    }
    
    shareContent() {
        if (!this.currentMovie) return;
        const shareData = {
            title: this.currentMovie.title,
            text: `Watch ${this.currentMovie.title} on STREAMER`,
            url: window.location.href
        };
        if (navigator.share) {
            navigator.share(shareData).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            this.showToast('Link copied to clipboard!', 'success');
        }
    }
      
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
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
      
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.quality-menu') && !e.target.closest('#quality-btn')) {
                document.getElementById('quality-menu')?.classList.remove('show');
            }
        });
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('player-screen').classList.contains('active')) return;
            switch(e.key) {
                case ' ': e.preventDefault(); player.togglePlay(); break;
                case 'ArrowRight': player.skipForward(); break;
                case 'ArrowLeft': player.skipBackward(); break;
                case 'f': player.toggleFullscreen(); break;
                case 'Escape': if (document.fullscreenElement) document.exitFullscreen(); break;
            }
        });
    }
}

const app = new StreamerApp();
