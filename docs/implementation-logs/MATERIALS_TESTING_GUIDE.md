# Learning Materials Management - Testing Guide

## Quick Testing Checklist

### 1. Test File Upload with Preview

**Location:** System Admin → Learning → Materials Management

#### Test Steps:
1. Click "Add Material" button
2. Fill in required fields:
   - Title: "Test Document"
   - Description: "Testing file preview"
   - Select data structure
   - Choose material type: "ebook"
3. Click file upload button
4. Select a Word document (DOCX)
5. **Verify Preview Modal Shows:**
   - ✅ File name displayed
   - ✅ File size shown
   - ✅ File type/MIME type visible
   - ✅ Validation checkmarks (green)
   - ✅ Preview of document (if supported)
6. Click "Confirm & Upload"
7. Complete form and click "Save"
8. **Verify:** Material appears in list

---

### 2. Test Word Document Viewer

**Files to Test:** DOCX, DOC, ODT

#### Test Steps:
1. Upload a Word document (see Test 1)
2. In materials list, click eye icon to preview
3. **Verify Word Viewer Shows:**
   - ✅ Document renders with formatting
   - ✅ Headings are styled correctly
   - ✅ Images appear embedded
   - ✅ Tables display properly
   - ✅ Lists are formatted
   - ✅ Scrollable content
4. Close preview
5. **If native viewer fails:**
   - ✅ Yellow warning banner appears
   - ✅ Office Online fallback viewer loads

---

### 3. Test Enhanced Audio Player

**Files to Test:** MP3, WAV, M4A

#### Test Steps:
1. Upload an audio file (type: "audio")
2. Click eye icon to preview
3. **Verify Audio Player Shows:**
   - ✅ Gradient purple/pink design
   - ✅ Animated music icon
   - ✅ Play/pause button works
   - ✅ Seek slider functional
   - ✅ Time display (current/total)
   - ✅ Volume controls work
   - ✅ Mute button toggles
   - ✅ Speed controls (0.5x to 2x)
   - ✅ Skip backward/forward buttons
4. Test all controls
5. **Verify:** No download option available

---

### 4. Test File Preview Modal

**Files to Test:** Various types

#### Test Cases:

**Image File (PNG, JPG):**
- ✅ Image preview displays
- ✅ Full resolution shown
- ✅ File size validation works
- ✅ Confirm button enabled

**PDF File:**
- ✅ PDF preview in iframe
- ✅ First page visible
- ✅ File info correct

**Video File (MP4):**
- ✅ Video preview plays
- ✅ Controls available
- ✅ Size validation (max 500MB)

**Text File (TXT, JSON):**
- ✅ Text content preview
- ✅ Syntax highlighting for code
- ✅ Truncated if >5000 chars

**Large File (>500MB):**
- ✅ Size validation fails
- ✅ Red X icon shows
- ✅ Error message displayed
- ✅ Confirm button disabled

**Unsupported Format (ZIP):**
- ✅ Generic file icon
- ✅ "Preview not available" message
- ✅ Can still confirm upload

---

### 5. Test PDF Viewer

**Files to Test:** PDF documents

#### Test Steps:
1. Upload a multi-page PDF
2. Click eye icon to preview
3. **Verify PDF Viewer Shows:**
   - ✅ PDF renders correctly
   - ✅ Page navigation controls
   - ✅ Current page / total pages
   - ✅ Zoom in/out buttons
   - ✅ Rotate button
   - ✅ Page number input
4. Navigate to page 2
5. Zoom in and out
6. Rotate document
7. **Verify:** All controls responsive

---

### 6. Test Image Viewer

**Files to Test:** JPG, PNG, GIF

#### Test Steps:
1. Upload an image
2. Click eye icon to preview
3. **Verify Image Viewer Shows:**
   - ✅ Image displays centered
   - ✅ Zoom controls visible
   - ✅ Zoom percentage shown
   - ✅ Rotate button works
   - ✅ Reset button available
4. Zoom to 200%
5. Rotate 90 degrees
6. Click reset
7. **Verify:** Image returns to original

---

### 7. Test Video Player (Security)

**Files to Test:** MP4, WebM

#### Test Steps:
1. Upload a video file
2. Click eye icon to preview
3. **Verify Protected Player Shows:**
   - ✅ "Protected Content" badge
   - ✅ User email watermark
   - ✅ Video plays
   - ✅ Controls available
   - ✅ No download button
   - ✅ Right-click disabled
   - ✅ "Stream only" notice
4. Try right-clicking video
5. **Verify:** Context menu blocked

---

### 8. Test Excel/PowerPoint Files

**Files to Test:** XLSX, PPTX, ODS, ODP

#### Test Steps:
1. Upload Excel or PowerPoint file
2. Click eye icon to preview
3. **Verify Office Viewer Shows:**
   - ✅ Blue info banner appears
   - ✅ "Microsoft Office Online" message
   - ✅ Office iframe loads
   - ✅ Document renders
   - ✅ Sheets/slides navigable
4. Navigate through content
5. **Verify:** Interactive viewer works

---

### 9. Test File Type Detection

**Test Various Extensions:**

| Extension | Expected Category | Expected Viewer |
|-----------|------------------|-----------------|
| .docx | document | word |
| .xlsx | document | excel |
| .pptx | document | powerpoint |
| .pdf | document | pdf |
| .mp4 | video | video |
| .mp3 | audio | audio |
| .jpg | image | image |
| .txt | text | text |
| .json | text | code |
| .zip | archive | generic |

#### Test Steps:
1. Upload each file type
2. Check database:
   ```sql
   SELECT
     title,
     mime_type,
     file_category,
     viewer_type,
     file_extension
   FROM materials
   ORDER BY created_at DESC
   LIMIT 10;
   ```
3. **Verify:** All fields populated correctly

---

### 10. Test Database Metadata

**Check Automatic Metadata Population**

#### Test Steps:
1. Upload any material
2. Query database:
   ```sql
   SELECT
     id,
     title,
     file_category,
     viewer_type,
     file_extension,
     document_metadata
   FROM materials
   WHERE id = 'your-material-id';
   ```
3. **Verify:**
   - ✅ file_category populated
   - ✅ viewer_type populated
   - ✅ file_extension extracted
   - ✅ document_metadata column exists

---

### 11. Test Error Handling

**Test Edge Cases:**

#### Invalid File Size:
1. Try uploading 600MB video
2. **Verify:** Error toast appears
3. **Verify:** Preview modal shows error

#### Missing File:
1. Open add material form
2. Try saving without file
3. **Verify:** Validation error shows

#### Network Error:
1. Disable internet
2. Try previewing material
3. **Verify:** Error message shown
4. **Verify:** Retry button available

#### Corrupted File:
1. Upload corrupted Word doc
2. **Verify:** Fallback to Office viewer
3. **Verify:** Yellow warning shown

---

### 12. Test Filtering and Search

**Test Material Filtering:**

#### Test Steps:
1. Upload materials of different types
2. Use filter card:
   - Filter by type: "video"
   - **Verify:** Only videos shown
3. Clear filters
4. Search by title: "Test"
5. **Verify:** Search results correct
6. Filter by data structure
7. **Verify:** Filtering works

---

### 13. Test Update Material

**Test Editing Existing Material:**

#### Test Steps:
1. Click edit on existing material
2. Change file (upload new)
3. **Verify:** Preview modal shows
4. Confirm new file
5. Update title and description
6. Save changes
7. **Verify:**
   - ✅ Old file deleted from storage
   - ✅ New file uploaded
   - ✅ Metadata updated
   - ✅ Material displays with new file

---

### 14. Test Delete Material

**Test Material Deletion:**

#### Test Steps:
1. Select material to delete
2. Click delete button
3. **Verify:** Confirmation dialog appears
4. Confirm deletion
5. **Verify:**
   - ✅ Material removed from list
   - ✅ File deleted from storage
   - ✅ Database record deleted
   - ✅ Success toast shown

---

### 15. Performance Testing

**Test Load Times:**

#### Small Files (<1MB):
- Upload time: <3 seconds
- Preview load: <1 second
- Viewer load: <1 second

#### Medium Files (1-10MB):
- Upload time: 3-10 seconds
- Preview load: 1-3 seconds
- Viewer load: 2-5 seconds

#### Large Files (10-100MB):
- Upload time: 10-30 seconds
- Preview load: 3-8 seconds
- Viewer load: 5-15 seconds

**Verify:** All within acceptable ranges

---

## Common Issues and Solutions

### Issue: Word Document Won't Load
**Solution:**
- Check file is valid DOCX/DOC
- Fallback to Office viewer should trigger
- Verify network connection

### Issue: Audio Player Not Showing
**Solution:**
- Verify file type is audio/*
- Check MIME type detection
- Browser may not support format

### Issue: Preview Modal Doesn't Open
**Solution:**
- Check console for errors
- Verify file selected
- Try different file type

### Issue: Video Won't Play
**Solution:**
- Verify signed URL generation
- Check material ID is valid
- Ensure user authenticated

### Issue: PDF Pages Not Rendering
**Solution:**
- Check PDF.js worker loaded
- Verify PDF not corrupted
- Try Google Docs fallback

---

## Browser Testing Matrix

Test on multiple browsers:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| File Upload | ✓ | ✓ | ✓ | ✓ |
| Preview Modal | ✓ | ✓ | ✓ | ✓ |
| Word Viewer | ✓ | ✓ | ✓ | ✓ |
| PDF Viewer | ✓ | ✓ | ✓ | ✓ |
| Audio Player | ✓ | ✓ | ✓ | ✓ |
| Video Player | ✓ | ✓ | ✓ | ✓ |
| Image Viewer | ✓ | ✓ | ✓ | ✓ |

---

## Acceptance Criteria

### All Tests Must Pass ✅

- [ ] File upload with preview works
- [ ] All viewer types functional
- [ ] File type detection accurate
- [ ] Database metadata populated
- [ ] Error handling graceful
- [ ] Performance acceptable
- [ ] Security maintained
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Cross-browser compatible

### Ready for Production When:
- All checkboxes above marked ✅
- No critical bugs
- User acceptance testing passed
- Documentation complete
- Build successful

---

## Test Data Files

**Recommended Test Files:**

1. **Word Document**: 5-page DOCX with images and tables
2. **PDF**: Multi-page PDF with text and images
3. **Excel**: XLSX with multiple sheets
4. **PowerPoint**: PPTX with 10+ slides
5. **Video**: 30-second MP4 (1080p)
6. **Audio**: 3-minute MP3
7. **Image**: High-res JPG (2000x2000)
8. **Text**: JSON file with code
9. **Large File**: 100MB video (for size testing)
10. **Corrupted**: Invalid file (for error testing)

---

## Automated Testing (Future)

**Consider adding:**
- Unit tests for fileTypeDetector
- Integration tests for viewers
- E2E tests for upload flow
- Performance benchmarks
- Visual regression tests

---

## Support Contact

For issues or questions:
- Check console errors first
- Review this testing guide
- Check MATERIALS_MANAGEMENT_ENHANCEMENT_SUMMARY.md
- Verify database migration applied

---

**Testing Status:** Ready for QA
**Last Updated:** December 10, 2025
**Version:** 1.0.0
