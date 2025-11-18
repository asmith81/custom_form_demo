/**
 * Jobsite Form - Main Application Logic
 * Handles form submission, voice input, and mode toggling
 */

// ============================================
// CONFIGURATION
// ============================================

// **IMPORTANT: Replace this with your Apps Script Web App URL**
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwPR_WBmy3UlckyQxeDta8paG4Oaxre-gV8PmBOmTmVZg3NCF6DPwP6WBEDwQbubYJi/exec';

// ============================================
// STATE MANAGEMENT
// ============================================

let recognition = null;
let currentVoiceTarget = null;
let jobSitesData = [];
let crewMembersData = [];
let selectedPhotos = []; // Array to store compressed photo data

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeModeToggle();
    initializeVoiceRecognition();
    initializeVoiceButtons();
    initializeForm();
    initializePhotoUpload();
    loadDropdownData();
});

// ============================================
// MODE SELECTOR (Indoor/Outdoor)
// ============================================

function initializeModeToggle() {
    const outdoorBtn = document.getElementById('outdoorModeBtn');
    const indoorBtn = document.getElementById('indoorModeBtn');
    const body = document.body;
    
    // Load saved mode from localStorage
    const savedMode = localStorage.getItem('displayMode') || 'outdoor';
    setMode(savedMode);
    
    outdoorBtn.addEventListener('click', () => {
        setMode('outdoor');
        localStorage.setItem('displayMode', 'outdoor');
    });
    
    indoorBtn.addEventListener('click', () => {
        setMode('indoor');
        localStorage.setItem('displayMode', 'indoor');
    });
}

function setMode(mode) {
    const body = document.body;
    const outdoorBtn = document.getElementById('outdoorModeBtn');
    const indoorBtn = document.getElementById('indoorModeBtn');
    
    body.setAttribute('data-mode', mode);
    
    if (mode === 'outdoor') {
        outdoorBtn.classList.add('mode-btn-active');
        indoorBtn.classList.remove('mode-btn-active');
    } else {
        indoorBtn.classList.add('mode-btn-active');
        outdoorBtn.classList.remove('mode-btn-active');
    }
}

// ============================================
// VOICE RECOGNITION (Web Speech API)
// ============================================

function initializeVoiceRecognition() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('Web Speech API not supported in this browser');
        // Hide all voice buttons
        document.querySelectorAll('.voice-btn').forEach(btn => {
            btn.style.display = 'none';
        });
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        showVoiceIndicator();
        if (currentVoiceTarget) {
            const btn = document.querySelector(`[data-target="${currentVoiceTarget}"]`);
            if (btn) btn.classList.add('recording');
        }
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        
        if (currentVoiceTarget) {
            const targetElement = document.getElementById(currentVoiceTarget);
            if (targetElement) {
                // Append to existing content (or replace if empty)
                const currentValue = targetElement.value.trim();
                if (currentValue) {
                    targetElement.value = currentValue + ' ' + transcript;
                } else {
                    targetElement.value = transcript;
                }
            }
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        hideVoiceIndicator();
        if (currentVoiceTarget) {
            const btn = document.querySelector(`[data-target="${currentVoiceTarget}"]`);
            if (btn) btn.classList.remove('recording');
        }
        
        if (event.error === 'no-speech') {
            showStatus('No speech detected. Please try again.', 'error', 3000);
        }
    };
    
    recognition.onend = () => {
        hideVoiceIndicator();
        if (currentVoiceTarget) {
            const btn = document.querySelector(`[data-target="${currentVoiceTarget}"]`);
            if (btn) btn.classList.remove('recording');
        }
        currentVoiceTarget = null;
    };
}

function initializeVoiceButtons() {
    document.querySelectorAll('.voice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            startVoiceInput(targetId);
        });
    });
}

function startVoiceInput(targetId) {
    if (!recognition) {
        showStatus('Voice input not supported in this browser', 'error', 3000);
        return;
    }
    
    // If already recording, stop it
    if (currentVoiceTarget) {
        recognition.stop();
        return;
    }
    
    currentVoiceTarget = targetId;
    
    try {
        recognition.start();
    } catch (error) {
        console.error('Error starting recognition:', error);
        showStatus('Could not start voice input', 'error', 3000);
    }
}

function showVoiceIndicator() {
    const indicator = document.getElementById('voiceIndicator');
    indicator.classList.remove('hidden');
}

function hideVoiceIndicator() {
    const indicator = document.getElementById('voiceIndicator');
    indicator.classList.add('hidden');
}

// ============================================
// DROPDOWN DATA LOADING
// ============================================

async function loadDropdownData() {
    try {
        showStatus('Loading job sites and crew members...', 'loading');
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load data');
        }
        
        jobSitesData = data.jobSites || [];
        crewMembersData = data.crewMembers || [];
        
        populateJobSitesDropdown();
        populateCrewMembersDropdown();
        
        // Hide status immediately after dropdowns are populated
        hideStatus();
        
    } catch (error) {
        console.error('Error loading dropdown data:', error);
        showStatus('Error loading data. Please refresh the page.', 'error');
    }
}

function populateJobSitesDropdown() {
    const select = document.getElementById('jobSite');
    
    jobSitesData.forEach(site => {
        const option = document.createElement('option');
        option.value = site.id;
        option.textContent = `${site.name} - ${site.address}`;
        select.appendChild(option);
    });
}

function populateCrewMembersDropdown() {
    const select = document.getElementById('crewMember');
    
    crewMembersData.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        select.appendChild(option);
    });
}

// ============================================
// FORM SUBMISSION
// ============================================

function initializeForm() {
    const form = document.getElementById('jobsiteForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitForm();
    });
}

async function submitForm() {
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('jobsiteForm');
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    
    try {
        // Step 1: Upload photos if any
        let photoUrls = [];
        
        if (selectedPhotos.length > 0) {
            submitBtn.innerHTML = '<span class="spinner"></span> Uploading photos...';
            
            for (let i = 0; i < selectedPhotos.length; i++) {
                const photo = selectedPhotos[i];
                
                // Update progress
                showStatus(`Uploading photo ${i + 1} of ${selectedPhotos.length}...`, 'loading');
                submitBtn.innerHTML = `<span class="spinner"></span> Photo ${i + 1}/${selectedPhotos.length}`;
                
                // Upload photo
                const photoUrl = await uploadPhotoToDrive(photo);
                photoUrls.push(photoUrl);
            }
        }
        
        // Step 2: Submit form with photo URLs
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
        showStatus('Saving form data...', 'loading');
        
        const formData = {
            action: 'submitForm',
            jobId: document.getElementById('jobSite').value,
            crewMemberId: document.getElementById('crewMember').value,
            tradeTaskType: document.getElementById('tradeType').value,
            workPerformed: document.getElementById('workPerformed').value,
            locationOnSite: document.getElementById('locationOnSite').value,
            status: document.getElementById('status').value,
            issuesConcerns: document.getElementById('issuesConcerns').value,
            materialsUsed: document.getElementById('materialsUsed').value,
            materialsNeeded: document.getElementById('materialsNeeded').value,
            weatherConditions: document.getElementById('weatherConditions').value,
            photoUrls: photoUrls, // Array of {url, name} objects
            deviceInfo: getDeviceInfo()
        };
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Submission failed');
        }
        
        // Success!
        const photoMsg = result.photosRecorded > 0 ? ` with ${result.photosRecorded} photo(s)` : '';
        showStatus(`✓ Report submitted successfully${photoMsg}!`, 'success', 5000);
        
        // Reset form
        form.reset();
        
        // Clear photos
        selectedPhotos = [];
        updatePhotoPreview();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Form submission error:', error);
        const errorMsg = error.message || 'Unknown error';
        showStatus(`✗ Error: ${errorMsg}`, 'error', 8000);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
    }
}

// Upload single photo to Drive
async function uploadPhotoToDrive(photo) {
    const uploadData = {
        action: 'uploadPhoto',
        photo: {
            data: photo.data,
            name: photo.name,
            timestamp: photo.timestamp
        }
    };
    
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(uploadData)
    });
    
    if (!response.ok) {
        throw new Error(`Photo upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Photo upload failed');
    }
    
    return {
        url: result.driveUrl,
        name: result.fileName,
        fileId: result.fileId
    };
}

// ============================================
// STATUS MESSAGES
// ============================================

function showStatus(message, type = 'loading', duration = null) {
    const statusDiv = document.getElementById('statusMessage');
    
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `mb-6 p-4 rounded-lg status-${type}`;
        statusDiv.classList.remove('hidden');
        statusDiv.style.display = 'block'; // Clear any inline display:none
        
        if (duration) {
            setTimeout(() => {
                hideStatus();
            }, duration);
        }
    }
}

function hideStatus() {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.classList.add('hidden');
        statusDiv.style.display = 'none'; // Force hide with inline style as backup
    }
}

// ============================================
// PHOTO UPLOAD HANDLING
// ============================================

function initializePhotoUpload() {
    const photoInput = document.getElementById('photos');
    
    photoInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length > 10) {
            showStatus('Maximum 10 photos allowed', 'error', 3000);
            photoInput.value = '';
            return;
        }
        
        showStatus(`Compressing ${files.length} photo(s)...`, 'loading');
        
        try {
            // Compress and add each photo
            for (const file of files) {
                const compressed = await compressImage(file);
                selectedPhotos.push(compressed);
            }
            
            updatePhotoPreview();
            hideStatus();
            
        } catch (error) {
            console.error('Error processing photos:', error);
            showStatus('Error processing photos. Please try again.', 'error', 3000);
        }
    });
}

async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Create canvas for compression
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions (max 800px width for better mobile performance)
                let width = img.width;
                let height = img.height;
                const maxWidth = 800;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 (JPEG, 0.6 quality for smaller size)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                
                resolve({
                    name: file.name,
                    data: compressedBase64,
                    size: Math.round((compressedBase64.length * 3) / 4), // Approximate size in bytes
                    timestamp: new Date().toISOString()
                });
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function updatePhotoPreview() {
    const previewContainer = document.getElementById('photoPreview');
    const photoCount = document.getElementById('photoCount');
    
    previewContainer.innerHTML = '';
    
    selectedPhotos.forEach((photo, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'photo-preview-item';
        
        const img = document.createElement('img');
        img.src = photo.data;
        img.alt = photo.name;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'photo-preview-remove';
        removeBtn.innerHTML = '×';
        removeBtn.type = 'button';
        removeBtn.onclick = () => removePhoto(index);
        
        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        previewContainer.appendChild(previewItem);
    });
    
    photoCount.textContent = `${selectedPhotos.length} photo(s) selected`;
}

function removePhoto(index) {
    selectedPhotos.splice(index, 1);
    updatePhotoPreview();
    
    // Reset file input if no photos left
    if (selectedPhotos.length === 0) {
        document.getElementById('photos').value = '';
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timestamp: new Date().toISOString()
    };
}

