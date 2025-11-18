/**
 * Jobsite Form - Apps Script Backend V2
 * Handles form submissions with SEPARATE photo uploads
 * Photos upload individually, form submission contains URLs only
 * 
 * SETUP INSTRUCTIONS:
 * 1. Replace Code.gs with this entire file
 * 2. Save the script
 * 3. Deploy new version (Deploy > Manage deployments > Edit > New version > Deploy)
 */

// ============================================
// CONFIGURATION
// ============================================

const PHOTOS_FOLDER_ID = null; // Optional: Set specific folder ID

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
    
    return buildResponse({
      success: true,
      jobSites: jobSites,
      crewMembers: crewMembers
    });
      
  } catch (error) {
    return buildResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ============================================
// POST REQUEST HANDLER (Router)
// ============================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Route based on action type
    if (data.action === 'uploadPhoto') {
      return handlePhotoUpload(data);
    } else if (data.action === 'submitForm') {
      return handleFormSubmission(data);
    } else {
      throw new Error('Unknown action: ' + data.action);
    }
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return buildResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ============================================
// PHOTO UPLOAD HANDLER
// ============================================

function handlePhotoUpload(data) {
  try {
    Logger.log('Starting photo upload...');
    
    // Extract photo data
    const photoData = data.photo.data; // base64 string
    const photoName = data.photo.name;
    const timestamp = data.photo.timestamp;
    
    Logger.log('Photo name: ' + photoName);
    Logger.log('Photo data length: ' + photoData.length);
    
    // Get folder
    Logger.log('Getting photos folder...');
    const folder = getPhotosFolder();
    Logger.log('Folder obtained: ' + folder.getName());
    
    // Extract base64 data (remove data:image/jpeg;base64, prefix)
    const base64Data = photoData.split(',')[1];
    Logger.log('Base64 data length: ' + base64Data.length);
    
    // Convert base64 to blob
    Logger.log('Converting to blob...');
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/jpeg',
      generatePhotoFileName(photoName, timestamp)
    );
    Logger.log('Blob created, size: ' + blob.getBytes().length);
    
    // Upload to Google Drive
    Logger.log('Uploading to Drive...');
    const file = folder.createFile(blob);
    Logger.log('File created: ' + file.getName());
    
    // Make file accessible via link
    Logger.log('Setting sharing permissions...');
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Get shareable URL
    const fileUrl = file.getUrl();
    const fileId = file.getId();
    
    Logger.log('Upload complete! File ID: ' + fileId);
    
    return buildResponse({
      success: true,
      driveUrl: fileUrl,
      fileId: fileId,
      fileName: file.getName()
    });
    
  } catch (error) {
    Logger.log('ERROR in handlePhotoUpload: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);
    return buildResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ============================================
// FORM SUBMISSION HANDLER
// ============================================

function handleFormSubmission(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
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
    
    // Write photo URLs to photos sheet
    if (data.photoUrls && data.photoUrls.length > 0) {
      const photosSheet = ss.getSheetByName('photos');
      
      data.photoUrls.forEach((photoData, index) => {
        photosSheet.appendRow([
          Utilities.getUuid(), // photo_id
          submissionId, // submission_id (foreign key)
          photoData.url, // google_drive_url
          photoData.name || `Photo ${index + 1}`, // caption
          new Date() // uploaded_at
        ]);
      });
    }
    
    return buildResponse({
      success: true,
      submissionId: submissionId,
      timestamp: timestamp.toISOString(),
      photosRecorded: data.photoUrls ? data.photoUrls.length : 0
    });
    
  } catch (error) {
    Logger.log('Error in form submission: ' + error.toString());
    return buildResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseMaterialsList(text) {
  // Split by newline first, then by comma if no newlines
  let items = text.split('\n');
  
  if (items.length === 1) {
    items = text.split(',');
  }
  
  return items
    .map(item => item.trim())
    .filter(item => item.length > 0);
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

function generatePhotoFileName(originalName, timestamp) {
  const date = new Date(timestamp);
  const formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const randomId = Utilities.getUuid().substring(0, 8);
  return `jobsite_${formattedDate}_${randomId}.jpg`;
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

