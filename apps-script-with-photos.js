/**
 * Jobsite Form - Apps Script Backend WITH PHOTO UPLOAD
 * Handles form submissions, dropdown data, and photo uploads to Google Drive
 * 
 * SETUP INSTRUCTIONS:
 * 1. Replace the existing Code.gs content with this entire file
 * 2. Save the script
 * 3. Deploy a new version (Deploy > Manage deployments > Edit > New version > Deploy)
 */

// ============================================
// CONFIGURATION
// ============================================

// Optional: Set a specific folder ID where photos should be stored
// If null, photos will be stored in root of Drive
const PHOTOS_FOLDER_ID = null; // Replace with your folder ID like: '1abc...xyz'

// ============================================
// GET REQUEST HANDLER
// ============================================

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get job sites
    const jobSitesSheet = ss.getSheetByName('job_sites');
    const jobSitesData = jobSitesSheet.getDataRange().getValues();
    const jobSites = jobSitesData.slice(1).map(row => ({
      id: row[0],
      name: row[1],
      address: row[2]
    }));
    
    // Get crew members
    const crewMembersSheet = ss.getSheetByName('crew_members');
    const crewMembersData = crewMembersSheet.getDataRange().getValues();
    const crewMembers = crewMembersData.slice(1).map(row => ({
      id: row[0],
      name: row[1]
    }));
    
    const response = {
      success: true,
      jobSites: jobSites,
      crewMembers: crewMembers
    };
    
    return buildResponse(response);
      
  } catch (error) {
    return buildResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ============================================
// POST REQUEST HANDLER
// ============================================

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);
    
    // Generate UUID for submission
    const submissionId = Utilities.getUuid();
    const timestamp = new Date();
    
    // Write to form_submissions
    const submissionsSheet = ss.getSheetByName('form_submissions');
    submissionsSheet.appendRow([
      submissionId,
      data.jobId,
      data.crewMemberId,
      timestamp,
      data.tradeTaskType,
      data.workPerformed,
      data.locationOnSite,
      data.status,
      data.issuesConcerns || '',
      data.weatherConditions || '',
      JSON.stringify(data.deviceInfo) || ''
    ]);
    
    // Parse and write materials_used
    if (data.materialsUsed && data.materialsUsed.trim()) {
      const materialsUsedSheet = ss.getSheetByName('materials_used');
      const materialsUsedList = parseMaterialsList(data.materialsUsed);
      
      materialsUsedList.forEach(material => {
        materialsUsedSheet.appendRow([
          Utilities.getUuid(),
          submissionId,
          material
        ]);
      });
    }
    
    // Parse and write materials_needed
    if (data.materialsNeeded && data.materialsNeeded.trim()) {
      const materialsNeededSheet = ss.getSheetByName('materials_needed');
      const materialsNeededList = parseMaterialsList(data.materialsNeeded);
      
      materialsNeededList.forEach(material => {
        materialsNeededSheet.appendRow([
          Utilities.getUuid(),
          submissionId,
          material
        ]);
      });
    }
    
    // Handle photo uploads
    let photoCount = 0;
    if (data.photos && data.photos.length > 0) {
      photoCount = uploadPhotos(data.photos, submissionId, ss);
    }
    
    const response = {
      success: true,
      submissionId: submissionId,
      timestamp: timestamp.toISOString(),
      photosUploaded: photoCount
    };
    
    return buildResponse(response);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return buildResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ============================================
// PHOTO UPLOAD FUNCTIONS
// ============================================

function uploadPhotos(photos, submissionId, spreadsheet) {
  const photosSheet = spreadsheet.getSheetByName('photos');
  let uploadCount = 0;
  
  // Get or create folder for photos
  const folder = getPhotosFolder();
  
  photos.forEach((photo, index) => {
    try {
      // Extract base64 data (remove data:image/jpeg;base64, prefix)
      const base64Data = photo.data.split(',')[1];
      
      // Convert base64 to blob
      const blob = Utilities.newBlob(
        Utilities.base64Decode(base64Data),
        'image/jpeg',
        generatePhotoFileName(photo.name, index, submissionId)
      );
      
      // Upload to Google Drive
      const file = folder.createFile(blob);
      
      // Make file accessible via link
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // Get shareable link
      const fileUrl = file.getUrl();
      
      // Write to photos sheet
      photosSheet.appendRow([
        Utilities.getUuid(), // photo_id
        submissionId, // submission_id (foreign key)
        fileUrl, // google_drive_url
        photo.name, // caption (original filename)
        new Date() // uploaded_at
      ]);
      
      uploadCount++;
      
    } catch (photoError) {
      Logger.log('Error uploading photo ' + index + ': ' + photoError.toString());
      // Continue with other photos even if one fails
    }
  });
  
  return uploadCount;
}

function getPhotosFolder() {
  if (PHOTOS_FOLDER_ID) {
    try {
      return DriveApp.getFolderById(PHOTOS_FOLDER_ID);
    } catch (e) {
      Logger.log('Could not access folder ID: ' + PHOTOS_FOLDER_ID);
      Logger.log('Using root folder instead');
    }
  }
  
  // Create or get "Jobsite Form Photos" folder in root
  const folderName = 'Jobsite Form Photos';
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

function generatePhotoFileName(originalName, index, submissionId) {
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const shortId = submissionId.substring(0, 8);
  return `jobsite_${shortId}_${timestamp}_${index + 1}.jpg`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseMaterialsList(text) {
  // Split by newline first, then by comma if no newlines
  let items = text.split('\n');
  
  if (items.length === 1) {
    // No newlines, try splitting by comma
    items = text.split(',');
  }
  
  // Clean up and filter
  return items
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

function buildResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  return output;
}

