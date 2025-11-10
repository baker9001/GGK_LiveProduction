# Attachment Mapping Architecture

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    User clicks "Launch snipping tool"
                    for Part (a) of Question 1
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PDF SNIPPING TOOL                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │   PDF displayed, user draws rectangle, clicks "Capture"      │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                        Returns: { imageDataUrl, fileName }
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    handleSnippingComplete()                          │
│                                                                      │
│  1. Extract context: questionId="Q1", partIndex=0                   │
│  2. Generate key: generateAttachmentKey("Q1", 0) → "Q1_p0"         │
│  3. Create attachment object with file_url = imageDataUrl           │
│  4. Store: attachments["Q1_p0"] = [attachment]                      │
│                                                                      │
│  Console: 📎 Adding attachment to part 0                            │
│  Console: ✅ Attachment stored with key: Q1_p0                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                        Attachment stored in state
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ATTACHMENTS STATE                                │
│                                                                      │
│  {                                                                   │
│    "Q1": [...]           // Question-level attachments              │
│    "Q1_p0": [            // Part 0 attachments  ⬅️ NEW!            │
│      {                                                               │
│        id: "att_123",                                                │
│        file_url: "data:image/png;base64...",                        │
│        file_name: "Figure_Q1_p0.png"                                │
│      }                                                               │
│    ],                                                                │
│    "Q1_p0_s1": [...]     // Part 0, Subpart 1 attachments          │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    Data needs to be displayed
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│            QuestionImportReviewWorkflow Props Mapping                │
│                                                                      │
│  BEFORE (❌ BROKEN):                                                │
│  ────────────────────                                               │
│  questions: questions.map(q => ({                                   │
│    ...                                                               │
│    attachments: attachments[q.id],  ✅ Works for question level    │
│    parts: q.parts                   ❌ Parts have no attachments!   │
│  }))                                                                 │
│                                                                      │
│  AFTER (✅ FIXED):                                                  │
│  ───────────────                                                    │
│  questions: questions.map(q => ({                                   │
│    ...                                                               │
│    attachments: attachments[q.id],  ✅ Works for question level    │
│    parts: mapPartsWithAttachments(  ✅ Now maps attachments!       │
│      q.parts,                                                        │
│      q.id,                                                           │
│      attachments                                                     │
│    )                                                                 │
│  }))                                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                        Calls helper function
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  mapPartsWithAttachments()                           │
│                                                                      │
│  For each part at index i:                                          │
│    1. Generate key: generateAttachmentKey(questionId, i)            │
│       → "Q1_p0"                                                      │
│    2. Retrieve: attachments["Q1_p0"]                                │
│       → [{ id: "att_123", file_url: "data:...", ... }]             │
│    3. Attach to part: part.attachments = [...]                      │
│                                                                      │
│    For each subpart at index j:                                     │
│      1. Generate key: generateAttachmentKey(questionId, i, j)       │
│         → "Q1_p0_s1"                                                │
│      2. Retrieve: attachments["Q1_p0_s1"]                           │
│      3. Attach to subpart: subpart.attachments = [...]              │
│                                                                      │
│  Console: 🔗 Mapping 1 attachment(s) to part 0 of question Q1      │
│                                                                      │
│  Return: Enriched parts array with populated attachments            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    Parts now have attachments property
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              QuestionImportReviewWorkflow Component                  │
│                                                                      │
│  question.parts.map(part => {                                       │
│    const partHasAttachments = part.attachments.some(...)           │
│                                ▲                                     │
│                                │                                     │
│                    Now populated with actual data!                  │
│                                                                      │
│    if (partHasAttachments) {                                        │
│      Show: ✅ "Figure attached" (green badge)                       │
│    } else {                                                          │
│      Show: ⚠️ "This part requires a supporting figure" (yellow)     │
│    }                                                                 │
│                                                                      │
│    renderInlineAttachments(part.attachments, "Part (a)")            │
│                            ▲                                         │
│                            │                                         │
│                  Displays the snipped images!                       │
│  })                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                        Renders to screen
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          USER SEES                                   │
│                                                                      │
│  Part (a) - Question Text                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ✅ Figure attached                        [Launch snipping]   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  📎 Attached Figure for Part (a)                                    │
│  ┌──────────────┐                                                   │
│  │   [IMAGE]    │  Figure_Q1_p0.png                                │
│  │   Preview    │  🔍 Zoom | 🗑️ Delete                             │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Generation Examples

```typescript
// Question level
generateAttachmentKey("Q1")
// → "Q1"

// Part level
generateAttachmentKey("Q1", 0)
// → "Q1_p0"

generateAttachmentKey("Q1", 1)
// → "Q1_p1"

// Subpart level
generateAttachmentKey("Q1", 0, 0)
// → "Q1_p0_s0"

generateAttachmentKey("Q1", 0, 1)
// → "Q1_p0_s1"

generateAttachmentKey("Q1", 1, 2)
// → "Q1_p1_s2"
```

## Before vs After Comparison

### BEFORE: Broken State

```
Attachments State:
{
  "Q1": [attachment1],
  "Q1_p0": [attachment2],  ← Stored but never retrieved!
  "Q1_p0_s1": [attachment3] ← Stored but never retrieved!
}

Question Object Passed to Review:
{
  id: "Q1",
  attachments: [attachment1],  ✅ Retrieved
  parts: [
    {
      part: "a",
      attachments: undefined  ❌ Never populated!
      subparts: [
        {
          subpart: "i",
          attachments: undefined  ❌ Never populated!
        }
      ]
    }
  ]
}

Result:
❌ part.attachments is empty
❌ partHasAttachments = false
❌ Shows yellow "requires figure" banner
❌ No inline attachment preview
```

### AFTER: Fixed State

```
Attachments State:
{
  "Q1": [attachment1],
  "Q1_p0": [attachment2],
  "Q1_p0_s1": [attachment3]
}

Question Object Passed to Review:
{
  id: "Q1",
  attachments: [attachment1],  ✅ Retrieved
  parts: [
    {
      part: "a",
      attachments: [attachment2]  ✅ Retrieved via mapping!
      subparts: [
        {
          subpart: "i",
          attachments: [attachment3]  ✅ Retrieved via mapping!
        }
      ]
    }
  ]
}

Result:
✅ part.attachments is populated
✅ partHasAttachments = true
✅ Shows green "Figure attached" badge
✅ Displays inline attachment preview with image
```

## Attachment Object Structure

```typescript
{
  id: "att_1699999999999",           // Unique ID
  type: "image",                      // Type indicator
  data: "data:image/png;base64...",   // Data URL
  dataUrl: "data:image/png;base64...",// Alternative property
  file_url: "data:image/png;base64...",// Primary URL property
  name: "Figure_Q1_p0.png",           // Display name
  fileName: "Figure_Q1_p0.png",       // Alternative property
  file_name: "Figure_Q1_p0.png",      // Primary name property
  file_type: "image/png",             // MIME type
  created_at: "2025-11-10T...",       // Timestamp
  canDelete: true,                    // Permission flag
  attachmentKey: "Q1_p0",             // Reference key
  originalId: "att_1699999999999"     // Original ID reference
}
```

## State Update Flow

```
User Action
    │
    ▼
handleSnippingComplete
    │
    ├─→ setAttachments(prev => ({...prev, [key]: [...attachments]}))
    │   └─→ React state updates
    │       └─→ Component re-renders
    │           └─→ mapPartsWithAttachments called during render
    │               └─→ Retrieves attachments with same key
    │                   └─→ Returns enriched parts
    │                       └─→ Review component receives data
    │                           └─→ Displays attachments
    │
    └─→ toast.success("Attachment added")
```

## Console Log Sequence

When working correctly, you'll see this sequence:

```
1. User snips attachment:
   📎 Adding attachment to part 0: {
     attachmentKey: "Q1_p0",
     questionId: "Q1",
     partIndex: 0,
     subpartIndex: undefined
   }

2. Attachment stored:
   ✅ Attachment stored with key: Q1_p0 {
     totalAttachmentsForKey: 1,
     allKeys: ["Q1", "Q1_p0"]
   }

3. Component re-renders, mapping called:
   🔗 Mapping 1 attachment(s) to part 0 of question Q1

4. Status updates visible in UI:
   - Banner changes from yellow to green
   - Image appears in inline preview
   - Attachment count updates
```

---

**Diagram Version**: 1.0
**Last Updated**: 2025-11-10
**Purpose**: Visual reference for understanding the attachment mapping fix
