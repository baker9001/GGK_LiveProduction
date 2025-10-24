# Question Card Tags Enhancement

## Summary

Added unit, topic, and subtopic tags to collapsed question cards in the "Questions Review" stage of the paper setup workflow. These tags now appear alongside the existing MCQ, marks, and other metadata tags for easier viewing and identification.

---

## Changes Made

### File Modified
- **`src/app/system-admin/learning/practice-management/papers-setup/tabs/components/QuestionCard.tsx`**

### What Changed

1. **Tag Container Update** (Line 124)
   - Changed gap from `gap-3` to `gap-2` for tighter spacing
   - Added `flex-wrap` to allow tags to wrap to multiple lines

2. **Academic Mapping Tags Section** (Lines 175-228)
   - Added new conditional section that displays when card is collapsed (`!isExpanded`)
   - Shows unit/chapter, topics, and subtopics as colored tags
   - Limits display to first 2 items of topics/subtopics with "+N more" indicator

---

## Tag Display Logic

### When Tags Appear
- **Only when the question card is collapsed** (`!isExpanded`)
- **Only when mapping data exists** (`mapping` object is available)

### Tag Types and Colors

1. **Unit/Chapter Tag**
   - Color: Emerald green (`bg-emerald-100`, `text-emerald-700`)
   - Shows: Unit/chapter name from `mapping.chapter_id`
   - Example: "Characteristics and Classification of Living Organisms"

2. **Topic Tags**
   - Color: Amber/orange (`bg-amber-100`, `text-amber-700`)
   - Shows: First 2 topics from `mapping.topic_ids`
   - Example: "0. Characteristics of Living Organisms"
   - Shows "+N more" indicator if more than 2 topics

3. **Subtopic Tags**
   - Color: Teal (`bg-teal-100`, `text-teal-700`)
   - Shows: First 2 subtopics from `mapping.subtopic_ids`
   - Example: "MRS C GREN"
   - Shows "+N more" indicator if more than 2 subtopics

---

## Visual Hierarchy

The tag color scheme creates a clear visual hierarchy:

- **Blue** (MCQ) - Question type
- **Gray** (Marks) - Question metadata
- **Purple** (Parts) - Question structure
- **Emerald** (Unit) - Top-level academic mapping
- **Amber** (Topics) - Mid-level academic mapping
- **Teal** (Subtopics) - Detailed academic mapping

---

## Benefits

### For Users
- ✅ **Faster scanning** - See academic mappings without expanding cards
- ✅ **Better context** - Understand question content at a glance
- ✅ **Improved workflow** - Less clicking and scrolling during review
- ✅ **Visual clarity** - Color-coded tags make information easy to parse

### Technical
- ✅ **Non-breaking** - Only shows when mapping data exists
- ✅ **Responsive** - Tags wrap properly on smaller screens
- ✅ **Performant** - Uses efficient filtering and slicing
- ✅ **Accessible** - Maintains proper contrast ratios

---

## Example Display

### Before (Collapsed Card)
```
Question 1  ⦿ 1 marks  MCQ
The sundew is a carnivorous plant that can trap small insects...
```

### After (Collapsed Card)
```
Question 1  ⦿ 1 marks  MCQ  Characteristics and Classification
0. Characteristics of Living Organisms  MRS C GREN
The sundew is a carnivorous plant that can trap small insects...
```

---

## Implementation Details

### Logic Flow

1. Check if card is collapsed: `!isExpanded`
2. Check if mapping exists: `mapping`
3. For Unit:
   - Find unit by `mapping.chapter_id`
   - Display unit name if found
4. For Topics:
   - Filter topics by `mapping.topic_ids`
   - Display first 2 topics
   - Show "+N more" if more than 2
5. For Subtopics:
   - Filter subtopics by `mapping.subtopic_ids`
   - Display first 2 subtopics
   - Show "+N more" if more than 2

### Code Structure

```typescript
{!isExpanded && mapping && (
  <>
    {/* Unit Tag */}
    {mapping.chapter_id && (() => {
      const unit = units.find(u => u.id === mapping.chapter_id);
      return unit ? <span>...</span> : null;
    })()}

    {/* Topics Tags (first 2) */}
    {mapping.topic_ids && mapping.topic_ids.length > 0 && (() => {
      const mappedTopics = topics.filter(t => mapping.topic_ids.includes(t.id));
      return mappedTopics.slice(0, 2).map(topic => <span>...</span>);
    })()}

    {/* +N more indicator */}
    {mapping.topic_ids && mapping.topic_ids.length > 2 && (
      <span>+{mapping.topic_ids.length - 2} more</span>
    )}

    {/* Subtopics Tags (first 2) */}
    {/* Similar structure to topics */}
  </>
)}
```

---

## Testing Checklist

- [x] Build completes successfully
- [ ] Tags display correctly on collapsed cards
- [ ] Tags hide when card is expanded
- [ ] Unit tag shows correct name
- [ ] Topic tags show first 2 topics
- [ ] Subtopic tags show first 2 subtopics
- [ ] "+N more" indicators show correct count
- [ ] Tags wrap properly on small screens
- [ ] Dark mode colors display correctly
- [ ] Tags align with existing MCQ/marks tags

---

## Future Enhancements (Optional)

1. **Tooltip on hover** - Show full list of topics/subtopics on hover over "+N more"
2. **Clickable tags** - Allow clicking tags to filter questions
3. **Customizable limit** - Let users choose how many tags to show
4. **Collapse/expand tags** - Allow users to show/hide academic tags

---

## Related Files

- **QuestionCard Component**: Where tags are displayed
- **QuestionMappingControls**: Where mapping is configured
- **QuestionsTab**: Parent component managing question list

---

**Date**: 2025-10-12
**Build Status**: ✅ Successful
**Breaking Changes**: None
