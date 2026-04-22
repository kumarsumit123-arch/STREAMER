class VideoPlayer {
    constructor() {
        this.hls = null;
        this.currentMovie = null;
        this.isDailymotion = false;
    }
    
    loadMovie(movie) {
        this.currentMovie = movie;
        this.isDailymotion = movie.videoType === 'dailymotion';
        
        document.getElementById('player-title').textContent = movie.title;
        document.getElementById('player-meta').textContent = `${movie.category} • ${movie.year || ''} • ${movie.duration || ''}`;
        
        const videoEl = document.getElementById('video-element');
        const dmContainer = document.getElementById('dailymotion-container');
        
        this.cleanup();
        
        if (this.isDailymotion) {
            videoEl.classList.add('hidden');
            dmContainer.classList.remove('hidden');
            this.loadDailymotion(movie.videoUrl);
        } else {
            dmContainer.classList.add('hidden');
            videoEl.classList.remove('hidden');
            this.loadNativeVideo(movie);
        }
        
        const track = document.getElementById('subtitle-track');
        const subtitleDisplay = document.getElementById('subtitle-display');
        if (movie.subtitleUrl) {
            track.src = movie.subtitleUrl;
            track.mode = 'hidden';
            subtitleDisplay.classList.add('show');
        } else {
            subtitleDisplay.classList.remove('show');
        }
        
        const progress = app.continueWatching.find(item => item.movieId === movie.id);
        if (progress && progress.currentTime > 10 && !this.isDailymotion) {
            videoEl.currentTime = progress.currentTime;
            app.showToast(`Resumed from ${this.formatTime(progress.currentTime)}`, 'info');
        }
    }
    
    loadDailymotion(videoId) {
        const container = document.getElementById('dailymotion-container');
        const videoIdClean = videoId.replace('https://www.dailymotion.com/video/', '').replace('https://dai.ly/', '');
        container.innerHTML = `<iframe src="https://www.dailymotion.com/embed/video/${videoIdClean}?autoplay=1&queue-autoplay-next=0&ui-start-screen-info=0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
        document.getElementById('buffering-spinner').style.display = 'none';
    }
    
    loadNativeVideo(movie) {
        const video = document.getElementById('video-element');
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('time-display').textContent = '0:00 / 0:00';
        
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        if (movie.videoType === 'hls' && Hls.isSupported()) {
            this.hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 600, enableWorker: true, debug: false });
            this.hls.loadSource(movie.videoUrl);
            this.hls.attachMedia(video);
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play();
                this.setupQualityLevels();
                document.getElementById('buffering-spinner').style.display = 'none';
            });
            this.hls.on(Hls.Events.BUFFERING, () => document.getElementById('buffering-spinner').style.display = 'block');
            this.hls.on(Hls.Events.BUFFERED, () => document.getElementById('buffering-spinner').style.display = 'none');
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    app.showToast('Stream error - recovering...', 'error');
                    this.hls.recoverMediaError();
                }
            });
        } else if (movie.videoType === 'mp4' || video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = movie.videoUrl;
            video.addEventListener('loadedmetadata', () => video.play());
        } else {
            app.showToast('Video format not supported', 'error');
            return;
        }
        
        this.setupVideoTracking(video, movie.id);
    }
    
    setupQualityLevels() {
        const container = document.getElementById('quality-options');
        container.innerHTML = '';
        const autoDiv = document.createElement('div');
        autoDiv.className = 'quality-option active';
        autoDiv.innerHTML = '<span>Auto</span><i class="fas fa-check text-xs"></i>';
        autoDiv.onclick = () => this.changeQuality(-1, autoDiv);
        container.appendChild(autoDiv);
    }
    
    changeQuality(levelIndex, element) {
        if (this.hls) this.hls.currentLevel = levelIndex;
        document.querySelectorAll('.quality-option').forEach(opt => {
            opt.classList.remove('active');
            const check = opt.querySelector('i');
            if (check) check.remove();
        });
        element.classList.add('active');
        const span = element.querySelector('span').textContent;
        element.innerHTML = `<span>${span}</span><i class="fas fa-check text-xs"></i>`;
        document.getElementById('quality-menu').classList.remove('show');
        app.showToast(`Quality: ${span}`, 'info');
    }
    
    setupVideoTracking(video, movieId) {
        const progressFill = document.getElementById('progress-fill');
        const timeDisplay = document.getElementById('time-display');
        const playBtn = document.getElementById('play-pause-btn');
        const centerBtn = document.getElementById('center-play-btn');
        const container = document.getElementById('video-container');
        
        video.addEventListener('timeupdate', () => {
            if (video.duration) {
                const percent = (video.currentTime / video.duration) * 100;
                progressFill.style.width = percent + '%';
                timeDisplay.textContent = `${this.formatTime(video.currentTime)} / ${this.formatTime(video.duration)}`;
                if (Math.floor(video.currentTime) % 5 === 0) {
                    app.saveContinueWatching(movieId, video.currentTime, video.duration, percent);
                }
                app.watchTime++;
                if (app.watchTime % 60 === 0) {
                    localStorage.setItem('streamer_watchtime', app.watchTime);
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
            app.showToast('Video ended', 'info');
            app.continueWatching = app.continueWatching.filter(item => item.movieId !== movieId);
            localStorage.setItem('streamer_continue', JSON.stringify(app.continueWatching));
        });
        
        video.addEventListener('click', () => this.togglePlay());
    }
    
    togglePlay() {
        if (this.isDailymotion) return;
        const video = document.getElementById('video-element');
        video.paused ? video.play() : video.pause();
    }
    
    seekVideo(event) {
        if (this.isDailymotion) return;
        const video = document.getElementById('video-element');
        const rect = event.currentTarget.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        if (video.duration) video.currentTime = percent * video.duration;
    }
    
    skipForward() {
        if (this.isDailymotion) return;
        const video = document.getElementById('video-element');
        video.currentTime = Math.min(video.currentTime + 10, video.duration);
    }
    
    skipBackward() {
        if (this.isDailymotion) return;
        const video = document.getElementById('video-element');
        video.currentTime = Math.max(video.currentTime - 10, 0);
    }
    
    toggleQualityMenu() {
        document.getElementById('quality-menu').classList.toggle('show');
    }
    
    toggleSubtitle() {
        const track = document.getElementById('subtitle-track');
        const display = document.getElementById('subtitle-display');
        if (track.mode === 'showing') {
            track.mode = 'hidden';
            display.classList.remove('show');
            app.showToast('Subtitles off', 'info');
        } else {
            track.mode = 'showing';
            display.classList.add('show');
            app.showToast('Subtitles on', 'success');
        }
    }
    
    toggleFullscreen() {
        const container = document.getElementById('video-container');
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(() => app.showToast('Fullscreen error', 'error'));
        } else {
            document.exitFullscreen();
        }
    }
    
    closePlayer() {
        this.cleanup();
        app.showScreen('main-screen');
    }
    
    cleanup() {
        const video = document.getElementById('video-element');
        const dmContainer = document.getElementById('dailymotion-container');
        
        if (!this.isDailymotion) {
            video.pause();
        }
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        dmContainer.innerHTML = '';
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
}

const player = new VideoPlayer();
                    
