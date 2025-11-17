/**
 * Jobsite Form - Main Application Logic
 * Handles form submission, voice input, and mode toggling
 */

// ============================================
// CONFIGURATION
// ============================================

// **IMPORTANT: Replace this with your Apps Script Web App URL**
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyH_68bPbgW1YDQKnPS2QhO-rOq6pWCTpq0LEzYUkQlKxf2fNuk-fWLwu4Uw88Mw5gI-w/exec';

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
// MODE TOGGLE (Indoor/Outdoor)
// ============================================

function initializeModeToggle() {
    const modeToggle = document.getElementById('modeToggle');
    const body = document.body;
    
    // Load saved mode from localStorage
    const savedMode = localStorage.getItem('displayMode') || 'outdoor';
    setMode(savedMode);
    
    modeToggle.addEventListener('click', () => {
        const currentMode = body.getAttribute('data-mode');
        const newMode = currentMode === 'outdoor' ? 'indoor' : 'outdoor';
        setMode(newMode);
        localStorage.setItem('displayMode', newMode);
    });
}

function setMode(mode) {
    const body = document.body;
    const modeToggle = document.getElementById('modeToggle');
    
    body.setAttribute('data-mode', mode);
    
    if (mode === 'outdoor') {
        modeToggle.textContent = '☀️ Outdoor';
    } else {
        modeToggle.textContent = '🌙 Indoor';
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
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    
    showStatus('Submitting your report...', 'loading');
    
    try {
        // Collect form data
        const formData = {
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
            photos: selectedPhotos, // Include photos
            deviceInfo: getDeviceInfo()
        };
        
        // Submit to Apps Script
        // Use text/plain to avoid CORS preflight
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
        showStatus('✓ Report submitted successfully!', 'success', 5000);
        
        // Reset form
        form.reset();
        
        // Clear photos
        selectedPhotos = [];
        updatePhotoPreview();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Form submission error:', error);
        showStatus('✗ Error submitting report. Please try again.', 'error', 5000);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
    }
}

// ============================================
// STATUS MESSAGES
// ============================================

function showStatus(message, type = 'loading', duration = null) {
    const statusDiv = document.getElementById('statusMessage');
    
    statusDiv.textContent = message;
    statusDiv.className = `mb-6 p-4 rounded-lg status-${type}`;
    statusDiv.classList.remove('hidden');
    
    if (duration) {
        setTimeout(() => {
            hideStatus();
        }, duration);
    }
}

function hideStatus() {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.classList.add('hidden');
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
                
                // Calculate new dimensions (max 1200px width)
                let width = img.width;
                let height = img.height;
                const maxWidth = 1200;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 (JPEG, 0.8 quality)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                
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

