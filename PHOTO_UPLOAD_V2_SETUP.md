# Photo Upload V2 - Separate Upload Architecture

## What Changed

**OLD APPROACH:**
- Photos embedded as base64 in form submission
- Large payload (300-500 KB per photo)
- Failed on mobile with multiple photos

**NEW APPROACH:** ✅
- Photos upload individually during form submission
- Each photo uploads to Drive separately
- Form submission contains only URLs (tiny payload)
- Clear progress indicators
- Production-ready and scalable

---

## Setup Instructions

### Step 1: Update Apps Script

1. Open your Google Sheet
2. Click **Extensions** → **Apps Script**
3. **Delete ALL existing code** in `Code.gs`
4. **Open** `apps-script-v2-separate-upload.js` in this project
5. **Copy ALL the code**
6. **Paste** into `Code.gs`
7. Click **💾 Save**

### Step 2: Deploy New Version

1. Click **Deploy** → **Manage deployments**
2. Click **✏️ Edit** (pencil icon)
3. Under **"Version"**, select **"New version"**
4. Add description: `V2 - Separate photo uploads`
5. Click **"Deploy"**
6. **The URL should stay the same** (no need to update frontend)

### Step 3: Test

1. Wait for Vercel to deploy (~60 seconds)
2. Open form on iPhone
3. Add 1-3 photos
4. Submit
5. Watch progress: "Uploading photo 1 of 3..." → "Uploading photo 2 of 3..." → etc.

---

## How It Works

### User Flow:

1. **Select photos** → Instant local previews (can add/remove)
2. **Click Submit** → Button shows "Uploading photos..."
3. **Photo upload progress** → "Photo 1 of 3", "Photo 2 of 3", etc.
4. **Each photo uploads to Drive** → Gets URL back
5. **Form submits** → With URLs (not images!)
6. **Success!** → Shows "Report submitted with 3 photos!"

### Technical Flow:

```
Submit Button Clicked
  ↓
FOR EACH photo:
  - Show progress (Photo X of Y)
  - POST to Apps Script with action: 'uploadPhoto'
  - Apps Script uploads to Drive
  - Returns Drive URL
  - Add URL to array
  ↓
POST form data with action: 'submitForm'
  - Include array of photo URLs
  - Apps Script writes to sheets
  ↓
Success!
```

---

## Benefits

✅ **Reliable** - Each photo uploads independently  
✅ **Clear progress** - User sees exactly what's happening  
✅ **No payload limits** - Form submission is tiny  
✅ **Can handle 10+ photos** - No problem  
✅ **Production-ready** - Same approach Google Forms uses  

---

## Data Structure

### Photos Sheet After Submission:

```
| photo_id | submission_id | google_drive_url | caption | uploaded_at |
|----------|---------------|------------------|---------|-------------|
| uuid-123 | sub-456       | https://drive... | Photo 1 | 2025-11-18 |
| uuid-124 | sub-456       | https://drive... | Photo 2 | 2025-11-18 |
```

---

## Troubleshooting

### Photos not uploading:
- Check Apps Script Executions log
- Make sure Drive permissions are authorized
- Try with 1 photo first

### Slow uploads:
- Normal! Each photo takes 2-3 seconds
- Progress bar keeps user informed

### "Photo upload failed":
- Check Apps Script execution log for details
- May be Drive permissions or folder issue

---

Ready to update? Follow steps above!

