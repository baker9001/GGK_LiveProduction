# Answer Format Components - Implementation Status

**Date:** November 22, 2025
**Status:** Phase 1 - Foundation Setup In Progress
**Coverage Target:** 18/18 answer formats (100%)

---

## ✅ PHASE 1 COMPLETED TASKS

### 1.1 Package Installation - COMPLETE
Successfully installed all required NPM packages:

**Core Libraries:**
- ✅ `fabric@5.3.0` - Canvas drawing for diagrams
- ✅ `handsontable@14.1.0` + `@handsontable/react@14.1.0` - Table/spreadsheet functionality
- ✅ `recharts@2.10.3` - Graph plotting and charting
- ✅ `react-chartjs-2@5.2.0` + `chart.js@4.4.1` - Advanced charting
- ✅ `@monaco-editor/react@4.6.0` - Code editor (VS Code engine)
- ✅ `react-dropzone@14.2.3` - File upload with drag-drop
- ✅ `file-saver@2.0.5` - File download helper

**TypeScript Types:**
- ✅ `@types/fabric@5.3.10`
- ✅ `@types/file-saver@2.0.7`

All packages installed using `--legacy-peer-deps` for React 18 compatibility.

### 1.2 Component Folder Structure - COMPLETE
Created organized directory structure:

```
src/components/answer-formats/
├── DiagramCanvas/          # General diagram drawing
├── StructuralDiagram/      # Labeled diagrams
├── TableInput/             # Table creator & completion
├── GraphPlotter/           # Graph plotting tool
├── ChemicalStructureEditor/# Chemical structure drawing
├── CodeEditor/             # Code input with syntax highlighting
├── AudioRecorder/          # Audio recording
├── FileUploader/           # File upload handler
└── utils/                  # Shared utilities
```

---

## 📋 PENDING CRITICAL TASKS

### Database Setup (Required before components can save data)

**Create Migration File:** `supabase/migrations/202511221700000_add_answer_format_support_tables.sql`

**Tables to Create:**

#### 1. `student_answer_assets` Table
Stores complex answer data (diagrams, audio, tables, etc.)

**Columns:**
- `id` UUID PRIMARY KEY
- `student_id` UUID → students(id)
- `practice_result_id` UUID → practice_results(id) (optional)
- `test_submission_id` UUID (optional, for future test system)
- `question_id` UUID → questions(id)
- `asset_type` TEXT (diagram, graph, table, audio, file, code, etc.)
- `file_url` TEXT (Supabase Storage URL)
- `file_name` TEXT
- `file_size` BIGINT
- `mime_type` TEXT
- `structured_data` JSONB (for tables, graphs)
- `canvas_data` TEXT (for drawings - Fabric.js JSON)
- `created_at`, `updated_at` TIMESTAMPTZ

**RLS Policies:**
- Students: INSERT, SELECT, UPDATE, DELETE own answers
- Teachers: SELECT student answers from their school
- Admins: Full access

#### 2. `answer_format_templates` Table
Teacher-created reusable templates

**Columns:**
- `id` UUID PRIMARY KEY
- `teacher_id` UUID → teachers(id)
- `company_id` UUID → companies(id)
- `template_name` TEXT
- `template_description` TEXT
- `answer_format` TEXT (table, diagram, graph, etc.)
- `template_data` JSONB (structure definition)
- `is_public` BOOLEAN
- `shared_with_school` BOOLEAN
- `usage_count` INTEGER
- `created_at`, `updated_at` TIMESTAMPTZ

**RLS Policies:**
- Teachers: Full access to own templates
- All authenticated: SELECT public templates
- Teachers: SELECT school-shared templates from same company
- Admins: Full access

### Supabase Storage Bucket Setup

**Bucket:** `student-answer-assets`

**Configuration:**
- Private bucket (not public)
- File size limit: 50MB per file
- Allowed MIME types:
  - Images: `image/png`, `image/jpeg`, `image/svg+xml`
  - Audio: `audio/mpeg`, `audio/wav`, `audio/ogg`
  - Documents: `application/pdf`, `application/zip`
  - Text: `text/plain`, `application/json`

**Storage Policies:**
- Students: INSERT/SELECT/DELETE files in own folder (`{user_id}/...`)
- Teachers: SELECT student files from their school
- Admins: Full access

**Manual Setup Required:**
1. Go to Supabase Dashboard → Storage
2. Create bucket `student-answer-assets`
3. Configure bucket settings (private, 50MB limit)
4. Set up RLS policies per above specifications

---

## 🚀 IMPLEMENTATION ROADMAP

### PHASE 2: Core Visual Tools (Weeks 2-5)

#### Week 2: Table Completion Component
**File:** `src/components/answer-formats/TableInput/TableCompletion.tsx`

**Priority:** CRITICAL - Most common in IGCSE practicals

**Features:**
- Pre-rendered table from teacher template
- Locked cells (gray background, non-editable)
- Editable cells (white/blue, clickable)
- Auto-save on cell blur
- Cell-by-cell validation
- Support numeric, text, formula cells
- Export to JSON

**Technology:** `react-data-grid` or `handsontable`

**Data Structure:**
```typescript
{
  templateId: string;
  studentAnswers: {
    "row-col": "value" // e.g., "2-3": "Mitochondria"
  };
  completedCells: number;
  requiredCells: number;
}
```

#### Week 3: Diagram Canvas Component
**File:** `src/components/answer-formats/DiagramCanvas/DiagramCanvas.tsx`

**Priority:** HIGH - Common across all sciences

**Features:**
- Freehand drawing (pencil tool)
- Basic shapes (line, arrow, circle, rectangle, triangle)
- Text labels
- Color picker
- Line thickness adjuster
- Eraser tool
- Undo/Redo (50 steps)
- Clear canvas
- Export as PNG/SVG
- Touch support for tablets

**Technology:** `fabric.js`

**Toolbar Components:**
```
[Pencil] [Line] [Arrow] [Circle] [Rectangle] [Text] [Eraser]
[Color] [Thickness] [Undo] [Redo] [Clear] [Save]
```

**Data Storage:**
- Edit mode: Fabric.js JSON in `canvas_data`
- Display mode: PNG export in Storage bucket

#### Week 4: Graph Plotter Component
**File:** `src/components/answer-formats/GraphPlotter/GraphPlotter.tsx`

**Priority:** HIGH - Common in sciences and geography

**Features:**
- Interactive grid canvas
- Axis configuration (labels, min/max, units)
- Point plotting tool (click to add)
- Line drawing (freehand or point-to-point)
- Multiple data series
- Best fit line (optional)
- Grid toggle
- Title and axis labels
- Export as image

**Technology:** `recharts` with custom drawing overlay

**Data Structure:**
```typescript
{
  title: string;
  xAxis: { min: number; max: number; label: string; unit: string };
  yAxis: { min: number; max: number; label: string; unit: string };
  dataPoints: { x: number; y: number; label?: string }[];
  lines: { points: [number, number][] }[];
}
```

#### Week 5: Structural Diagram Component
**File:** `src/components/answer-formats/StructuralDiagram/StructuralDiagram.tsx`

**Priority:** HIGH - Biology and Chemistry practicals

**Features:**
- Extends DiagramCanvas with labeling tools
- Template overlay (teacher provides base diagram)
- Label placement with leader lines
- Label numbering/lettering (1), (2) or (a), (b)
- Snap-to-grid for neat placement
- Label validation (fuzzy match against expected)
- Arrow/line tools for connecting labels

**Use Cases:**
- Biology: Label cell parts
- Chemistry: Label apparatus
- Physics: Label circuit components
- Geography: Label features

### PHASE 3: Subject-Specific Tools (Weeks 6-8)

#### Week 6: Chemical Structure Editor
**File:** `src/components/answer-formats/ChemicalStructureEditor/ChemicalStructureEditor.tsx`

**Priority:** HIGH - Essential for Chemistry IGCSE

**Features:**
- Atom palette (C, H, O, N, S, P, halogens)
- Bond tools (single, double, triple, aromatic)
- Wedge/dash bonds (stereochemistry)
- Ring templates (benzene, cyclohexane)
- Functional group templates
- Clean-up tool (auto-align)
- SMILES string export

**Technology:** Consider `ketcher-react` (open-source) or build custom with Canvas

**Note:** Ketcher has complex setup. May need to explore alternatives or build simplified version.

#### Week 7: Table Creator
**File:** `src/components/answer-formats/TableInput/TableCreator.tsx`

**Priority:** MEDIUM-HIGH

**Features:**
- Create table from scratch
- Dynamic add/remove rows/columns
- Cell merging
- Header designation
- Data type per column
- Basic formatting (bold, alignment)
- Export CSV/JSON

**Technology:** `handsontable` (full spreadsheet functionality)

### PHASE 4: Technical Tools (Weeks 8-10)

#### Week 8: Code Editor
**File:** `src/components/answer-formats/CodeEditor/CodeEditor.tsx`

**Priority:** MEDIUM - Computer Science/ICT only

**Features:**
- Syntax highlighting
- Line numbers
- Auto-indentation
- Bracket matching
- Language support (Python, JavaScript, HTML, CSS, Pseudocode)
- Theme selector (light/dark)

**Technology:** `@monaco-editor/react` (VS Code engine) - ALREADY INSTALLED

**Simple Implementation:**
```typescript
import Editor from '@monaco-editor/react';

<Editor
  height="400px"
  language="python"
  theme="vs-dark"
  value={code}
  onChange={setCode}
/>
```

#### Week 9: File Uploader
**File:** `src/components/answer-formats/FileUploader/FileUploader.tsx`

**Priority:** MEDIUM - Coursework and projects

**Features:**
- Drag-and-drop zone
- Click to browse
- File type validation
- File size validation (max 10MB default)
- File preview (images, PDFs)
- Upload progress indicator
- Remove/replace file
- Multiple files (configurable)

**Technology:** `react-dropzone` - ALREADY INSTALLED

**Simple Implementation:**
```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
  maxFiles: 1,
  maxSize: 10485760, // 10MB
  accept: {
    'application/pdf': ['.pdf'],
    'image/*': ['.png', '.jpg', '.jpeg']
  }
});
```

#### Week 10: Audio Recorder
**File:** `src/components/answer-formats/AudioRecorder/AudioRecorder.tsx`

**Priority:** MEDIUM - Language subjects

**Features:**
- Microphone access request
- Record/Stop/Pause controls
- Playback before submission
- Waveform visualization (optional)
- Timer display
- Time limit enforcement
- Re-record capability
- Audio quality selector

**Technology:** HTML5 MediaRecorder API (native)

**Note:** No additional package needed - use browser native API

**Simple Implementation:**
```typescript
const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

// Request microphone and start recording
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => setAudioBlob(e.data);
  recorder.start();
  setMediaRecorder(recorder);
};
```

### PHASE 5: Integration & Enhancement (Weeks 11-12)

#### Week 11: Update DynamicAnswerField
**File:** `src/components/shared/DynamicAnswerField.tsx`

**Task:** Integrate all new components

**Changes Required:**
1. Import all new format components
2. Add switch cases for each format
3. Pass format-specific props
4. Handle complex data structures (JSONB)
5. Integrate with validation system

**Example Integration:**
```typescript
switch (question.answer_format) {
  case 'table_completion':
    return <TableCompletion {...props} />;
  case 'diagram':
    return <DiagramCanvas {...props} />;
  case 'graph':
    return <GraphPlotter {...props} />;
  case 'chemical_structure':
    return <ChemicalStructureEditor {...props} />;
  case 'code':
    return <CodeEditor {...props} />;
  case 'audio':
    return <AudioRecorder {...props} />;
  case 'file_upload':
    return <FileUploader {...props} />;
  // ... existing formats
}
```

#### Week 12: Auto-Grading Configuration
**File:** `src/components/admin/AutoGradingConfig.tsx`

**Features:**
- Per-format grading mode selector:
  - Fully Automatic
  - Semi-Automatic (system suggests, teacher reviews)
  - Manual Only
- Tolerance settings (case sensitivity, numerical approximation)
- Partial credit configuration

**Database Column Addition:**
```sql
ALTER TABLE questions
ADD COLUMN grading_mode TEXT DEFAULT 'semi_automatic'
  CHECK (grading_mode IN ('automatic', 'semi_automatic', 'manual')),
ADD COLUMN grading_config JSONB DEFAULT '{}'::jsonb;
```

---

## 📊 PROGRESS TRACKING

### Current Status
| Phase | Component | Status | Priority |
|-------|-----------|--------|----------|
| 1 | Package Installation | ✅ Complete | Critical |
| 1 | Folder Structure | ✅ Complete | Critical |
| 1 | Database Migration | ⏳ Pending | Critical |
| 1 | Storage Bucket Setup | ⏳ Pending | Critical |
| 2 | TableCompletion | ⏳ Not Started | Critical |
| 2 | DiagramCanvas | ⏳ Not Started | High |
| 2 | GraphPlotter | ⏳ Not Started | High |
| 2 | StructuralDiagram | ⏳ Not Started | High |
| 3 | ChemicalStructureEditor | ⏳ Not Started | High |
| 3 | TableCreator | ⏳ Not Started | Medium-High |
| 4 | CodeEditor | ⏳ Not Started | Medium |
| 4 | FileUploader | ⏳ Not Started | Medium |
| 4 | AudioRecorder | ⏳ Not Started | Medium |
| 5 | DynamicAnswerField Integration | ⏳ Not Started | Critical |
| 5 | AutoGrading Config | ⏳ Not Started | Medium |

### Coverage Statistics
- **Fully Implemented:** 7/18 formats (39%)
- **In Progress:** 0/18 formats (0%)
- **Not Started:** 11/18 formats (61%)

**Target:** 18/18 formats (100%)

---

## 🎯 IMMEDIATE NEXT STEPS

### For Database Administrator:
1. **Apply Database Migration:**
   - Use Supabase Dashboard or CLI to apply the migration
   - File content provided in this document
   - Test by inserting sample data

2. **Create Storage Bucket:**
   - Navigate to Supabase Dashboard → Storage
   - Create `student-answer-assets` bucket
   - Configure: Private, 50MB limit, allowed MIME types
   - Set up RLS policies

### For Developers:
1. **Start with Easiest Components First:**
   - Week 1: CodeEditor (Monaco already installed)
   - Week 2: FileUploader (react-dropzone already installed)
   - Week 3: AudioRecorder (native browser API)

2. **Then Tackle Core Visual Tools:**
   - TableCompletion (Handsontable)
   - DiagramCanvas (Fabric.js)
   - GraphPlotter (Recharts)

3. **Save Complex Components for Later:**
   - ChemicalStructureEditor (may need custom solution)
   - StructuralDiagram (extends DiagramCanvas)

---

## 📚 REFERENCE DOCUMENTATION

### Installed Package Documentation

**Fabric.js (Canvas Drawing):**
- Docs: http://fabricjs.com/docs/
- Tutorial: http://fabricjs.com/fabric-intro-part-1
- Drawing tutorial: http://fabricjs.com/fabric-intro-part-2

**Handsontable (Spreadsheet):**
- Docs: https://handsontable.com/docs/
- React wrapper: https://handsontable.com/docs/react-hot-table/
- Examples: https://handsontable.com/examples

**Recharts (Graphing):**
- Docs: https://recharts.org/en-US/
- Examples: https://recharts.org/en-US/examples

**Monaco Editor (Code Editor):**
- Docs: https://microsoft.github.io/monaco-editor/
- React wrapper: https://github.com/suren-atoyan/monaco-react

**React Dropzone (File Upload):**
- Docs: https://react-dropzone.js.org/
- Examples: https://react-dropzone.js.org/#src

### Browser API Documentation

**MediaRecorder API (Audio Recording):**
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- Tutorial: https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Using_the_MediaStream_Recording_API

**HTML5 Canvas API:**
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Tutorial: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial

---

## ✅ SUCCESS CRITERIA

### For Each Component:
- [ ] Students can input answers intuitively
- [ ] Answer data saves reliably to database
- [ ] Teachers can view student submissions clearly
- [ ] Correct answers display in review mode
- [ ] Validation works (where applicable)
- [ ] Mobile-responsive (at minimum for viewing)
- [ ] Performance acceptable (no lag)
- [ ] Data storage efficient
- [ ] Meets IGCSE marking scheme requirements

### Overall System:
- [ ] 100% answer format coverage (18/18)
- [ ] < 3 second load time per component
- [ ] 95%+ browser compatibility
- [ ] Touch support on visual tools
- [ ] < 50KB average answer size (excluding files)
- [ ] Auto-grading accuracy > 90% (where applicable)
- [ ] Zero data loss during offline mode
- [ ] WCAG 2.1 AA accessibility compliance

---

## 🔧 TROUBLESHOOTING TIPS

### Package Installation Issues:
- **Peer dependency errors:** Use `--legacy-peer-deps` flag
- **React version conflicts:** Stick with React 18.3.1
- **TypeScript errors:** Ensure @types packages installed

### Component Development Issues:
- **Canvas not rendering:** Check if Fabric.js loaded correctly
- **Monaco not loading:** Use dynamic import for code splitting
- **Audio not recording:** Check browser permissions
- **File upload failing:** Verify Storage bucket exists and RLS policies set

### Database Issues:
- **RLS blocking queries:** Check auth.uid() matches student auth_user_id
- **Foreign key violations:** Ensure referenced tables/rows exist
- **JSONB format errors:** Validate JSON structure before insert

---

## 📝 NOTES

### Chemical Structure Editor Decision:
The original plan suggested `ketcher-react`, but this has a complex setup with multiple dependencies. Consider:
- **Option 1:** Use simplified Canvas-based drawing for basic structures
- **Option 2:** External chemical drawing tool (iframe embed)
- **Option 3:** Text-based SMILES input with preview
- **Recommended:** Start with Option 3 (simplest), upgrade later if needed

### Performance Considerations:
- Lazy load heavy components (Monaco, Canvas libraries)
- Use React.lazy() and Suspense
- Compress images before upload (client-side)
- Debounce auto-save (500ms delay)
- Virtual scrolling for large tables

### Browser Compatibility:
- Chrome/Edge: Full support ✅
- Safari: Full support ✅ (with fallbacks for older versions)
- Firefox: Full support ✅
- IE11: Limited support ⚠️ (provide text-only fallback)

### Mobile/Tablet Support:
- Touch events handled by Fabric.js automatically
- Increase touch target sizes (44x44px minimum)
- Test on actual devices (iPad, Android tablets)
- Optimize canvas size for mobile screens

---

**Last Updated:** November 22, 2025
**Next Review:** After Phase 2 Week 1 completion

---

## QUICK START COMMANDS

```bash
# Verify packages installed
npm list fabric handsontable @monaco-editor/react react-dropzone

# Start development server
npm run dev

# Build for production
npm run build

# Run tests (when implemented)
npm test
```

