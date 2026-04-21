// ==================== AI SUBTITLE ENGINE (FIXED) ====================
class AISubtitleEngine {
    constructor() {
        this.isActive = false;
        this.currentLanguage = 'en';
        this.simulationInterval = null;
        this.hideTimeout = null;
        this.recognition = null;
        this.isListening = false;
        
        // 25 Languages supported
        this.supportedLanguages = {
            'en': { name: 'English', code: 'en-US', sample: "I will become the strongest!" },
            'ja': { name: 'Japanese', code: 'ja-JP', sample: "俺は最強になる！" },
            'zh': { name: 'Chinese', code: 'zh-CN', sample: "我会成为最强者！" },
            'ko': { name: 'Korean', code: 'ko-KR', sample: "나는 최강이 될 거야!" },
            'es': { name: 'Spanish', code: 'es-ES', sample: "¡Me convertiré en el más fuerte!" },
            'fr': { name: 'French', code: 'fr-FR', sample: "Je deviendrai le plus fort !" },
            'de': { name: 'German', code: 'de-DE', sample: "Ich werde der Stärkste werden!" },
            'it': { name: 'Italian', code: 'it-IT', sample: "Diventerò il più forte!" },
            'pt': { name: 'Portuguese', code: 'pt-BR', sample: "Vou me tornar o mais forte!" },
            'ru': { name: 'Russian', code: 'ru-RU', sample: "Я стану сильнейшим!" },
            'ar': { name: 'Arabic', code: 'ar-SA', sample: "سأصبح الأقوى!" },
            'hi': { name: 'Hindi', code: 'hi-IN', sample: "मैं सबसे मजबूत बनूंगा!" },
            'tr': { name: 'Turkish', code: 'tr-TR', sample: "En güçlü ben olacağım!" },
            'pl': { name: 'Polish', code: 'pl-PL', sample: "Stanę się najsilniejszy!" },
            'nl': { name: 'Dutch', code: 'nl-NL', sample: "Ik word de sterkste!" },
            'vi': { name: 'Vietnamese', code: 'vi-VN', sample: "Tôi sẽ trở nên mạnh nhất!" },
            'th': { name: 'Thai', code: 'th-TH', sample: "ฉันจะกลายเป็นผู้แข็งแกร่งที่สุด!" },
            'id': { name: 'Indonesian', code: 'id-ID', sample: "Saya akan menjadi yang terkuat!" },
            'ms': { name: 'Malay', code: 'ms-MY', sample: "Saya akan menjadi yang terkuat!" },
            'tl': { name: 'Filipino', code: 'tl-PH', sample: "Magiging pinakamalakas ako!" },
            'uk': { name: 'Ukrainian', code: 'uk-UA', sample: "Я стану найсильнішим!" },
            'ro': { name: 'Romanian', code: 'ro-RO', sample: "Voi deveni cel mai puternic!" },
            'cs': { name: 'Czech', code: 'cs-CZ', sample: "Stanu se nejsilnějším!" },
            'el': { name: 'Greek', code: 'el-GR', sample: "Θα γίνω ο πιο δυνατός!" },
            'he': { name: 'Hebrew', code: 'he-IL', sample: "אני אהפוך לחזק ביותר!" }
        };
    }

    // FIXED: Use window.app.showToast instead of this.showToast
    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // ==================== REAL SPEECH RECOGNITION ====================
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.log('Web Speech API not supported');
            return false;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.supportedLanguages[this.currentLanguage]?.code || 'en-US';

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                }
            }

            if (finalTranscript) {
                this.displaySubtitle(finalTranscript, true);
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'no-speech') return;
            console.log('Speech error:', event.error);
            this.restartRecognition();
        };

        this.recognition.onend = () => {
            if (this.isListening) this.restartRecognition();
        };

        return true;
    }

    restartRecognition() {
        setTimeout(() => {
            if (this.isListening && this.recognition) {
                try {
                    this.recognition.start();
                } catch (e) {}
            }
        }, 1000);
    }

    // ==================== DISPLAY SUBTITLE ====================
    displaySubtitle(text, isFinal) {
        const display = document.getElementById('subtitle-display');
        if (!display) return;

        const langInfo = this.supportedLanguages[this.currentLanguage];
        
        display.innerHTML = `
            <span class="ai-indicator">
                <i class="fas fa-robot"></i> AI • ${langInfo?.name || 'Auto'}
            </span>
            <span class="subtitle-text ${this.getScriptClass(text)}">${text}</span>
        `;
        
        display.classList.add('show');

        if (isFinal) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = setTimeout(() => {
                if (!this.isListening) display.classList.remove('show');
            }, 5000);
        }
    }

    getScriptClass(text) {
        if (/[\u4e00-\u9fff]/.test(text)) return 'chinese-script';
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'japanese-script';
        if (/[\uac00-\ud7af]/.test(text)) return 'korean-script';
        if (/[\u0600-\u06ff]/.test(text)) return 'arabic-script';
        if (/[\u0400-\u04ff]/.test(text)) return 'cyrillic-script';
        return '';
    }

    // ==================== START AI SUBTITLES ====================
    start(language = 'en') {
        this.currentLanguage = language;
        this.isActive = true;
        this.isListening = true;

        const display = document.getElementById('subtitle-display');
        if (display) {
            display.innerHTML = `
                <span class="ai-indicator">
                    <i class="fas fa-circle-notch fa-spin"></i> AI Initializing...
                </span>
            `;
            display.classList.add('show');
        }

        // Try real speech recognition
        const hasRealRecognition = this.initSpeechRecognition();
        
        if (hasRealRecognition && this.recognition) {
            try {
                this.recognition.start();
                this.showToast(`AI Listening: ${this.supportedLanguages[language]?.name}`, 'success');
            } catch (e) {
                this.fallbackToSimulation();
            }
        } else {
            this.fallbackToSimulation();
        }
    }

    stop() {
        this.isActive = false;
        this.isListening = false;
        
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) {}
        }
        
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        const display = document.getElementById('subtitle-display');
        if (display) display.classList.remove('show');
        
        clearTimeout(this.hideTimeout);
    }

    // ==================== FALLBACK SIMULATION ====================
    fallbackToSimulation() {
        console.log('Using AI simulation mode');
        this.showToast('AI Mode: Demo (Real needs Chrome + Mic)', 'info');
        
        const langInfo = this.supportedLanguages[this.currentLanguage];
        const samples = [
            langInfo?.sample || "I will become the strongest!",
            "This power... it's incredible!",
            "I won't give up!",
            "Everyone, lend me your strength!",
            "This is my final attack!"
        ];

        let index = 0;
        this.simulationInterval = setInterval(() => {
            if (!this.isActive) {
                clearInterval(this.simulationInterval);
                return;
            }
            this.displaySubtitle(samples[index % samples.length], true);
            index++;
        }, 4000);
    }

    // ==================== LANGUAGE SELECTOR ====================
    showLanguageSelector() {
        const existing = document.querySelector('.language-selector-overlay');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.className = 'language-selector-overlay';
        container.innerHTML = `
            <div class="language-modal glass-card animate-fade-up">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold gradient-text">AI Subtitle Language</h3>
                    <button onclick="this.closest('.language-selector-overlay').remove()" 
                            class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto hide-scrollbar">
                    ${Object.entries(this.supportedLanguages).map(([code, lang]) => `
                        <button onclick="window.aiSubtitles.changeLanguage('${code}'); this.closest('.language-selector-overlay').remove()" 
                                class="p-3 rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-purple-500/20 border border-white/5 hover:border-red-500/30 transition text-left group ${this.currentLanguage === code ? 'border-red-500 bg-red-500/10' : ''}">
                            <div class="font-semibold text-sm group-hover:text-white transition">${lang.name}</div>
                            <div class="text-xs text-gray-500 group-hover:text-gray-300 transition">${lang.code}</div>
                        </button>
                    `).join('')}
                </div>
                <div class="mt-4 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                    <p class="text-xs text-yellow-400">
                        <i class="fas fa-microphone mr-1"></i>
                        Real-time: Chrome/Edge only | Others: Demo mode
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        
        container.addEventListener('click', (e) => {
            if (e.target === container) container.remove();
        });
    }

    changeLanguage(langCode) {
        this.stop();
        this.currentLanguage = langCode;
        
        setTimeout(() => {
            this.start(langCode);
        }, 500);
        
        this.showToast(`AI Language: ${this.supportedLanguages[langCode]?.name}`, 'success');
    }
}

// ==================== ENHANCED PLAYER (FIXED) ====================
class EnhancedPlayer {
    constructor() {
        this.gestureState = {
            startX: 0,
            startY: 0,
            startTime: 0,
            isDragging: false,
            lastTapTime: 0
        };
        this.seekAmount = 0;
        this.gestureTimeout = null;
    }

    setupTouchGestures() {
        const container = document.getElementById('video-container');
        if (!container) return;

        // Remove old listeners to prevent duplicates
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);
        
        // Re-attach to new container
        this.attachGestureListeners(newContainer);
    }

    attachGestureListeners(container) {
        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let isDragging = false;

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            touchStartTime = Date.now();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isDragging = false;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (e.touches.length !== 1) return;
            
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;
            const elapsed = Date.now() - touchStartTime;

            if (elapsed > 150 && Math.abs(deltaX) > 10) {
                isDragging = true;
                this.handleSeekGesture(deltaX);
            }
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            const elapsed = Date.now() - touchStartTime;
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            const screenWidth = window.innerWidth;

            // Double tap detection
            if (elapsed < 300 && Math.abs(deltaX) < 30) {
                const currentTime = Date.now();
                if (currentTime - this.gestureState.lastTapTime < 400) {
                    // Double tap
                    const tapX = e.changedTouches[0].clientX;
                    if (tapX < screenWidth / 3) {
                        window.app?.skipBackward();
                        this.showGestureFeedback('backward', '-10s');
                    } else if (tapX > (screenWidth * 2) / 3) {
                        window.app?.skipForward();
                        this.showGestureFeedback('forward', '+10s');
                    } else {
                        window.app?.togglePlay();
                    }
                }
                this.gestureState.lastTapTime = currentTime;
            }

            // Apply seek if was dragging
            if (isDragging && Math.abs(deltaX) > 50) {
                this.applySeekGesture();
            }

            this.hideGestureFeedback();
        });
    }

    handleSeekGesture(deltaX) {
        const sensitivity = 0.3;
        this.seekAmount = Math.round(deltaX * sensitivity);
        const direction = this.seekAmount > 0 ? 'forward' : 'backward';
        this.showGestureFeedback(direction, `${this.seekAmount > 0 ? '+' : ''}${this.seekAmount}s`);
    }

    applySeekGesture() {
        const video = document.getElementById('video-element');
        if (video && video.duration && !isNaN(video.duration)) {
            const newTime = Math.max(0, Math.min(video.duration, video.currentTime + this.seekAmount));
            video.currentTime = newTime;
        }
        this.seekAmount = 0;
    }

    showGestureFeedback(type, text) {
        let feedback = document.getElementById('gesture-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'gesture-feedback';
            feedback.className = 'gesture-feedback';
            document.getElementById('video-container')?.appendChild(feedback);
        }

        const icons = {
            forward: 'fa-redo',
            backward: 'fa-undo',
            volume: 'fa-volume-up',
            brightness: 'fa-sun',
            play: 'fa-play',
            pause: 'fa-pause'
        };

        if (feedback) {
            feedback.innerHTML = `
                <div class="gesture-icon"><i class="fas ${icons[type] || 'fa-circle'}"></i></div>
                <div class="gesture-text">${text}</div>
            `;
            feedback.classList.add('show');
        }

        clearTimeout(this.gestureTimeout);
        this.gestureTimeout = setTimeout(() => this.hideGestureFeedback(), 800);
    }

    hideGestureFeedback() {
        const feedback = document.getElementById('gesture-feedback');
        if (feedback) feedback.classList.remove('show');
    }

    togglePictureInPicture() {
        const video = document.getElementById('video-element');
        if (!video) return;

        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else if (video.requestPictureInPicture) {
            video.requestPictureInPicture().catch(() => {
                window.app?.showToast('PIP not supported', 'error');
            });
        }
    }
}

// ==================== SAFE INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AI Subtitle Engine globally
    window.aiSubtitles = new AISubtitleEngine();
    
    // Initialize Enhanced Player globally
    window.enhancedPlayer = new EnhancedPlayer();
    
    // Wait for app to be ready then setup gestures
    const checkApp = setInterval(() => {
        if (window.app) {
            clearInterval(checkApp);
            window.enhancedPlayer.setupTouchGestures();
        }
    }, 100);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .gesture-feedback {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: rgba(0,0,0,0.9);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 24px 36px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 60;
            pointer-events: none;
            border: 1px solid rgba(239, 68, 68, 0.3);
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        
        .gesture-feedback.show {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        
        .gesture-icon {
            font-size: 2.5rem;
            background: linear-gradient(135deg, #ef4444, #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .gesture-text {
            font-size: 1.5rem;
            font-weight: 800;
            color: white;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }
        
        .language-selector-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(20px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        
        .language-modal {
            width: 100%;
            max-width: 420px;
            max-height: 85vh;
            overflow: hidden;
            padding: 24px;
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .chinese-script { font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; }
        .japanese-script { font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic Pro', sans-serif; }
        .korean-script { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; }
        .arabic-script { font-family: 'Noto Sans Arabic', 'Arial', sans-serif; direction: rtl; }
        .cyrillic-script { font-family: 'Noto Sans', 'Arial', sans-serif; }
        
        .subtitle-text {
            display: block;
            margin-top: 8px;
            font-size: 1.1rem;
            line-height: 1.6;
        }
    `;
    document.head.appendChild(style);
});

// ==================== SAFE APP INTEGRATION ====================
// Only override if app exists
if (typeof StreamerApp !== 'undefined') {
    
    // FIXED: Safe method addition
    StreamerApp.prototype.toggleAISubtitles = function() {
        if (!window.aiSubtitles) {
            console.error('AI Subtitles not initialized');
            return;
        }
        
        if (window.aiSubtitles.isActive) {
            window.aiSubtitles.stop();
            this.showToast('AI Subtitles stopped', 'info');
        } else {
            window.aiSubtitles.showLanguageSelector();
        }
    };

    // FIXED: Safe playMovie override
    const originalPlayMovie = StreamerApp.prototype.playMovie;
    
    StreamerApp.prototype.playMovie = async function(movieId) {
        // Call original
        await originalPlayMovie.call(this, movieId);
        
        // Setup enhanced features
        setTimeout(() => {
            if (window.enhancedPlayer) {
                window.enhancedPlayer.setupTouchGestures();
            }
        }, 500);
    };
}
