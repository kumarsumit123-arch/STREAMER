// ============================================
// ADMIN SECURITY
// ============================================

// Check admin login on load
function checkAdmin() {
    const isAdmin = sessionStorage.getItem('adminLoggedIn');
    if (!isAdmin) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Logout
function adminLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}

// ============================================
// NAVIGATION
// ============================================

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.remove('active');
    });
    
    // Show target section
    document.getElementById(sectionId).classList.add('active');
    
    // Update nav active state
    document.querySelectorAll('.admin-nav a').forEach(a => {
        a.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load section data
    if (sectionId === 'dashboard') updateDashboard();
    if (sectionId === 'anime') renderAdminAnimeList();
    if (sectionId === 'subtitles') renderSubtitleList();
}

// ============================================
// DASHBOARD STATS
// ============================================

function updateDashboard() {
    const animeList = getAllAnime();
    
    // Total anime
    document.getElementById('totalAnime').textContent = animeList.length;
    
    // Total views (parse "1.2M" etc)
    let totalViews = 0;
    animeList.forEach(a => {
        const views = a.views || '0';
        if (views.includes('M')) {
            totalViews += parseFloat(views) * 1000000;
        } else if (views.includes('K')) {
            totalViews += parseFloat(views) * 1000;
        } else {
            totalViews += parseInt(views) || 0;
        }
    });
    document.getElementById('totalViews').textContent = formatNumber(totalViews);
    
    // Total subtitles
    let totalSubs = 0;
    animeList.forEach(a => {
        totalSubs += a.subtitles ? a.subtitles.length : 0;
    });
    document.getElementById('totalSubtitles').textContent = totalSubs;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// ============================================
// IMAGE UPLOAD (DIRECT FILE - NO URL)
// ============================================

let uploadedThumbnail = null;

function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate image
    if (!file.type.startsWith('image/')) {
        alert('❌ Sirf image file upload karo! (JPG, PNG, GIF)');
        input.value = '';
        return;
    }
    
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ Image 5MB se choti honi chahiye!');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedThumbnail = e.target.result; // Base64 data URL
        
        // Show preview
        const preview = document.getElementById('thumbnailPreview');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        
        // Change upload area style
        const uploadArea = document.getElementById('thumbnailUpload');
        if (uploadArea) {
            uploadArea.style.borderColor = '#4caf50';
            uploadArea.innerHTML = `
                <img src="${e.target.result}" style="max-width:200px; max-height:150px; border-radius:8px;">
                <p style="color:#4caf50; margin-top:8px;">✅ Image uploaded!</p>
                <button type="button" onclick="resetImageUpload()" style="margin-top:8px; padding:6px 12px; background:#ff0000; border:none; color:white; border-radius:4px; cursor:pointer;">Change</button>
            `;
        }
    };
    reader.readAsDataURL(file);
}

function resetImageUpload() {
    uploadedThumbnail = null;
    const uploadArea = document.getElementById('thumbnailUpload');
    uploadArea.innerHTML = `
        <input type="file" id="thumbnailFile" accept="image/*" onchange="handleImageUpload(this)">
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Click to upload or drag & drop</p>
        <img id="thumbnailPreview" style="display:none; max-width:200px; margin-top:10px;">
    `;
}

// ============================================
// SUBTITLE SYSTEM (DUAL OPTION)
// ============================================

let uploadedSubtitle = null;

// Toggle between file upload and manual input
function toggleSubtitleInput() {
    const type = document.querySelector('input[name="subtitleType"]:checked').value;
    
    const fileDiv = document.getElementById('subtitleFileInput');
    const manualDiv = document.getElementById('subtitleManualInput');
    
    if (type === 'file') {
        fileDiv.style.display = 'block';
        manualDiv.style.display = 'none';
    } else {
        fileDiv.style.display = 'none';
        manualDiv.style.display = 'block';
    }
}

// Handle VTT/SRT file upload
function handleSubtitleUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['.vtt', '.srt', '.txt'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(ext)) {
        alert('❌ Sirf .vtt, .srt ya .txt file upload karo!');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        let content = e.target.result;
        
        // Convert SRT to VTT if needed
        if (ext === '.srt') {
            content = srtToVtt(content);
        }
        
        uploadedSubtitle = {
            language: 'English',
            content: content,
            filename: file.name,
            type: 'file'
        };
        
        alert('✅ Subtitle file loaded: ' + file.name);
    };
    reader.readAsText(file);
}

// Convert SRT to VTT format
function srtToVtt(srtContent) {
    let vtt = 'WEBVTT\n\n';
    
    // Replace SRT timestamps with VTT format
    vtt += srtContent
        .replace(/\r\n/g, '\n')
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    
    return vtt;
}

// Auto-sync manual text to VTT with timestamps
function autoSyncSubtitles() {
    const text = document.getElementById('subtitleText').value.trim();
    
    if (!text) {
        alert('❌ Pehle subtitle text daalo!');
        return;
    }
    
    // Split by lines and filter empty
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length === 0) {
        alert('❌ Kuch text toh daalo!');
        return;
    }
    
    // Calculate duration per line (total 2 min default, or based on lines)
    const secondsPerLine = Math.max(3, 120 / lines.length); // Min 3 sec per line
    
    let vtt = 'WEBVTT\n\n';
    let currentTime = 1; // Start at 1 second
    
    lines.forEach((line, index) => {
        const startTime = formatVTTTime(currentTime);
        const endTime = formatVTTTime(currentTime + secondsPerLine);
        
        vtt += `${startTime} --> ${endTime}\n`;
        vtt += `${line}\n\n`;
        
        currentTime += secondsPerLine;
    });
    
    uploadedSubtitle = {
        language: 'English',
        content: vtt,
        type: 'manual',
        autoSync: true
    };
    
    // Show preview
    const previewDiv = document.createElement('div');
    previewDiv.style.cssText = 'margin-top:12px; padding:12px; background:#1a1a1a; border-radius:8px; max-height:200px; overflow-y:auto;';
    previewDiv.innerHTML = `<pre style="color:#4caf50; font-size:12px; white-space:pre-wrap;">${vtt.substring(0, 500)}...</pre>`;
    
    const manualDiv = document.getElementById('subtitleManualInput');
    const existingPreview = manualDiv.querySelector('.subtitle-preview');
    if (existingPreview) existingPreview.remove();
    
    previewDiv.className = 'subtitle-preview';
    manualDiv.appendChild(previewDiv);
    
    alert('✅ Auto-sync complete! ' + lines.length + ' lines synced.');
}

function formatVTTTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    const ms = '000';
    return `${hrs}:${mins}:${secs}.${ms}`;
}

// ============================================
// ADD ANIME
// ============================================

function handleAddAnime(e) {
    e.preventDefault();
    
    // Get form values
    const title = document.getElementById('animeTitle').value.trim();
    const channel = document.getElementById('animeChannel').value.trim();
    const videoUrl = document.getElementById('animeVideoUrl').value.trim();
    const duration = document.getElementById('animeDuration').value.trim() || '0:00';
    
    // Validation
    if (!title) {
        alert('❌ Title dalna zaroori hai!');
        return;
    }
    if (!channel) {
        alert('❌ Channel name dalna zaroori hai!');
        return;
    }
    if (!videoUrl) {
        alert('❌ Video URL dalna zaroori hai!');
        return;
    }
    
    // Validate URL format (M3U8, MP4, WebM)
    const validExtensions = /\.(m3u8|mp4|webm|mkv)(\?.*)?$/i;
    const isValidUrl = validExtensions.test(videoUrl) || videoUrl.includes('.m3u8');
    
    if (!isValidUrl) {
        alert('❌ Valid video URL dalna chahiye!\n\nSupported: .m3u8, .mp4, .webm\n\nExample: https://example.com/video.m3u8');
        return;
    }
    
    // Check thumbnail
    if (!uploadedThumbnail) {
        alert('❌ Thumbnail image upload karna zaroori hai!');
        return;
    }
    
    // Prepare subtitles
    const subtitles = [];
    if (uploadedSubtitle && uploadedSubtitle.content) {
        subtitles.push({
            language: uploadedSubtitle.language || 'English',
            content: uploadedSubtitle.content,
            type: uploadedSubtitle.type || 'file'
        });
    }
    
    // Create anime object
    const newAnime = {
        id: Date.now(),
        title: title,
        channel: channel,
        thumbnail: uploadedThumbnail,
        videoUrl: videoUrl,
        duration: duration,
        subtitles: subtitles,
        views: '0',
        likes: 0,
        uploaded: 'Just now'
    };
    
    // Save to database
    addAnime(newAnime);
    
    // Success
    alert('✅ Anime successfully added!\n\nTitle: ' + title);
    
    // Reset form
    document.getElementById('addAnimeForm').reset();
    resetImageUpload();
    uploadedSubtitle = null;
    
    // Reset subtitle UI
    const manualDiv = document.getElementById('subtitleManualInput');
    const preview = manualDiv.querySelector('.subtitle-preview');
    if (preview) preview.remove();
    
    // Switch to anime list
    showSection('anime');
}

// ============================================
// MANAGE ANIME (LIST / EDIT / DELETE)
// ============================================

function renderAdminAnimeList() {
    const container = document.getElementById('adminAnimeList');
    const animeList = getAllAnime();
    
    if (animeList.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#666;">
                <i class="fas fa-video-slash" style="font-size:48px; margin-bottom:16px;"></i>
                <p>No anime added yet!</p>
                <button onclick="showSection('add')" class="btn-primary" style="margin-top:16px;">
                    <i class="fas fa-plus"></i> Add First Anime
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = animeList.map(anime => `
        <div class="anime-item" data-id="${anime.id}">
            <img src="${anime.thumbnail}" alt="${anime.title}" 
                 onerror="this.src='https://via.placeholder.com/120x68?text=No+Image'">
            <div class="anime-item-info">
                <h4>${escapeHtml(anime.title)}</h4>
                <p>${escapeHtml(anime.channel)} • ${anime.duration} • ${anime.views} views</p>
                <p style="color:#4caf50; font-size:12px;">
                    <i class="fas fa-closed-captioning"></i> 
                    ${anime.subtitles ? anime.subtitles.length : 0} subtitles
                </p>
            </div>
            <div class="anime-actions">
                <button onclick="editAnime(${anime.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="previewAnime(${anime.id})" title="Preview">
                    <i class="fas fa-play"></i>
                </button>
                <button onclick="deleteAnimeConfirm(${anime.id})" title="Delete" style="background:#ff0000;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Edit Anime
let editingId = null;

function editAnime(id) {
    const anime = getAnime(id);
    if (!anime) return;
    
    editingId = id;
    
    document.getElementById('editId').value = id;
    document.getElementById('editTitle').value = anime.title;
    document.getElementById('editVideoUrl').value = anime.videoUrl;
    
    document.getElementById('editModal').classList.add('active');
}

function handleEditAnime(e) {
    e.preventDefault();
    
    if (!editingId) return;
    
    const updates = {
        title: document.getElementById('editTitle').value.trim(),
        videoUrl: document.getElementById('editVideoUrl').value.trim()
    };
    
    updateAnime(editingId, updates);
    
    alert('✅ Anime updated successfully!');
    closeEditModal();
    renderAdminAnimeList();
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    editingId = null;
}

// Preview Anime
function previewAnime(id) {
    // Open in new tab with player
    const anime = getAnime(id);
    if (!anime) return;
    
    // Store current anime in session for preview
    sessionStorage.setItem('previewAnime', JSON.stringify(anime));
    window.open('index.html?preview=' + id, '_blank');
}

// Delete Anime
function deleteAnimeConfirm(id) {
    const anime = getAnime(id);
    if (!anime) return;
    
    if (confirm(`⚠️ Delete karne wale ho?\n\n"${anime.title}"\n\nYe permanently delete hoga!`)) {
        deleteAnime(id);
        renderAdminAnimeList();
        updateDashboard();
        alert('✅ Anime deleted!');
    }
}

// ============================================
// SUBTITLE MANAGEMENT
// ============================================

function renderSubtitleList() {
    const container = document.getElementById('subtitleList');
    const animeList = getAllAnime();
    
    let html = '';
    
    animeList.forEach(anime => {
        if (anime.subtitles && anime.subtitles.length > 0) {
            anime.subtitles.forEach((sub, index) => {
                html += `
                    <div class="anime-item">
                        <div class="anime-item-info" style="flex:1;">
                            <h4>${escapeHtml(anime.title)}</h4>
                            <p>
                                <i class="fas fa-closed-captioning"></i> 
                                ${sub.language} • ${sub.type || 'file'}
                                ${sub.autoSync ? ' (Auto-synced)' : ''}
                            </p>
                            <p style="font-size:12px; color:#666; margin-top:4px;">
                                ${sub.content ? sub.content.substring(0, 100) + '...' : 'No content'}
                            </p>
                        </div>
                        <div class="anime-actions">
                            <button onclick="downloadSubtitle(${anime.id}, ${index})" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                            <button onclick="deleteSubtitle(${anime.id}, ${index})" title="Delete" style="background:#ff0000;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
    });
    
    if (!html) {
        html = `
            <div style="text-align:center; padding:40px; color:#666;">
                <i class="fas fa-closed-captioning" style="font-size:48px; margin-bottom:16px;"></i>
                <p>No subtitles found!</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function downloadSubtitle(animeId, subIndex) {
    const anime = getAnime(animeId);
    if (!anime || !anime.subtitles[subIndex]) return;
    
    const sub = anime.subtitles[subIndex];
    const blob = new Blob([sub.content], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${anime.title.replace(/[^a-z0-9]/gi, '_')}_${sub.language}.vtt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function deleteSubtitle(animeId, subIndex) {
    const anime = getAnime(animeId);
    if (!anime) return;
    
    if (confirm('Delete this subtitle?')) {
        anime.subtitles.splice(subIndex, 1);
        updateAnime(animeId, { subtitles: anime.subtitles });
        renderSubtitleList();
        alert('✅ Subtitle deleted!');
    }
}

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAdmin()) return;
    
    // Load dashboard by default
    updateDashboard();
    
    // Setup form handlers
    const addForm = document.getElementById('addAnimeForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddAnime);
    }
    
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditAnime);
    }
    
    // Drag and drop for thumbnail
    const uploadArea = document.getElementById('thumbnailUpload');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ff0000';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#444';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#444';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const input = document.getElementById('thumbnailFile');
                const dt = new DataTransfer();
                dt.items.add(files[0]);
                input.files = dt.files;
                handleImageUpload(input);
            }
        });
        
        uploadArea.addEventListener('click', () => {
            document.getElementById('thumbnailFile').click();
        });
    }
});
