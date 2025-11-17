# Photo Upload Setup Guide

## Overview

Photos are now:
- ✅ Captured from device camera
- ✅ Compressed client-side (max 1200px width, 80% JPEG quality)
- ✅ Uploaded to Google Drive via Apps Script
- ✅ URLs stored in `photos` sheet with link to submission

---

## Step 1: Update Your Apps Script

1. **Open your Google Sheet**
2. Click **Extensions** → **Apps Script**
3. **Select all the existing code** in `Code.gs`
4. **Delete it**
5. **Open the file:** `apps-script-with-photos.js` in this project
6. **Copy all the code** from that file
7. **Paste it** into `Code.gs` in Apps Script
8. Click **💾 Save** (or Ctrl+S)

---

## Step 2: Deploy New Version

1. Click **Deploy** → **Manage deployments**
2. Click the **✏️ Edit** icon (pencil) on your existing deployment
3. Under **Version**, select **"New version"**
4. Click **Deploy**
5. **Authorize again if prompted:**
   - Click "Authorize access"
   - Choose your Google account
   - Click "Advanced" → "Go to ... (unsafe)"
   - Click "Allow"

---

## Step 3: Optional - Create Photos Folder

By default, photos go into a folder called "Jobsite Form Photos" in your Drive root.

**To use a specific folder:**

1. Create a folder in Google Drive for photos
2. Open that folder and copy the ID from the URL:
   ```
   https://drive.google.com/drive/folders/1abc...xyz
                                          ^^^^^^^^ This is the folder ID
   ```
3. In the Apps Script, find this line at the top:
   ```javascript
   const PHOTOS_FOLDER_ID = null;
   ```
4. Replace with:
   ```javascript
   const PHOTOS_FOLDER_ID = '1abc...xyz'; // Your folder ID
   ```
5. Save and deploy new version

---

## Step 4: Test Photo Upload

### Local Testing:

1. Make sure your local dev server is running:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. **Test the photo workflow:**
   - Fill out the form
   - Click "Choose Files" in the Photos section
   - Select 1-3 test photos
   - Watch them compress and show previews
   - Submit the form
   - Check your Google Sheet `photos` tab - you should see Drive URLs
   - Click a URL to verify the photo uploaded

### Testing Multiple Photos:

- Try uploading 5-10 photos at once
- Verify compression is working (check browser console for sizes)
- Make sure all photos appear in the `photos` sheet

---

## Step 5: Deploy to Vercel

Once local testing works:

```bash
git add .
git commit -m "Add photo upload functionality"
git push
```

Vercel will auto-deploy. Test on your phone!

---

## How Photo Upload Works

### Client-Side (app.js):
1. User selects photos from camera/gallery
2. JavaScript compresses each image:
   - Resizes to max 1200px width (maintains aspect ratio)
   - Converts to JPEG at 80% quality
   - Converts to base64 string
3. Stores compressed photos in memory
4. Shows preview thumbnails
5. Sends base64 data with form submission

### Server-Side (Apps Script):
1. Receives base64 photo data
2. Converts base64 back to binary blob
3. Creates file in Google Drive folder
4. Sets sharing to "Anyone with link can view"
5. Gets shareable URL
6. Writes URL to `photos` sheet with:
   - `photo_id` (UUID)
   - `submission_id` (links to form submission)
   - `google_drive_url` (shareable link)
   - `caption` (original filename)
   - `uploaded_at` (timestamp)

---

## Google Sheets Data Structure

After submission with photos, you'll see:

**`form_submissions` tab:**
```
submission_id: abc-123-def
job_id: ...
crew_member_id: ...
...
```

**`photos` tab:**
```
photo_id: xyz-789-uvw | submission_id: abc-123-def | google_drive_url: https://drive.google.com/... | caption: IMG_1234.jpg | uploaded_at: 2025-11-17 14:30:00
photo_id: xyz-789-rst | submission_id: abc-123-def | google_drive_url: https://drive.google.com/... | caption: IMG_1235.jpg | uploaded_at: 2025-11-17 14:30:01
```

You can use `=QUERY()` to join them:
```
=QUERY(photos!A:E, "SELECT * WHERE B = 'abc-123-def'")
```

---

## Compression Details

**Original iPhone Photo:**
- Size: ~3-5 MB
- Dimensions: 3024 x 4032 px

**After Compression:**
- Size: ~100-300 KB (90-95% smaller!)
- Dimensions: 1200 x 1600 px (or less)
- Quality: Still very good for documentation

This means:
- ✅ Faster uploads
- ✅ Less Drive storage used
- ✅ Works on slower connections
- ✅ Still high enough quality to see details

---

## Troubleshooting

### Photos not uploading:
- Check Apps Script execution log (View → Executions)
- Make sure you authorized the script to access Drive
- Verify the `photos` sheet exists in your spreadsheet

### "Exceeded maximum execution time":
- Apps Script has a 6-minute timeout for free accounts
- If uploading 10+ large photos, it might timeout
- Solution: Reduce max photos to 5, or upgrade to Google Workspace

### Photos uploaded but links don't work:
- Make sure the script sets file sharing to "Anyone with link"
- Check the file in Drive and manually set sharing

### Photos are too large:
- Adjust compression quality in `app.js`:
  ```javascript
  const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); // Lower = smaller
  ```

---

## Next Steps (Phase 3 Ideas)

- **LLM parsing:** Send photos to Claude API to extract structured data
- **OCR:** Extract text from photos (material labels, serial numbers)
- **Geotag:** Add GPS coordinates to photo metadata
- **Annotations:** Draw on photos before upload
- **Offline queue:** Store photos locally, upload when connection returns

---

Ready to test? Update the Apps Script and try uploading some photos!

