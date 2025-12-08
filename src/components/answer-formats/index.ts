/**
 * Answer Format Components - Main Export File
 *
 * Exports all answer format components for use in DynamicAnswerField
 */

// ===== COMPLETED COMPONENTS =====

// Technical Components (Phase 4 - COMPLETE)
export { default as CodeEditor } from './CodeEditor/CodeEditor';
export { default as FileUploader } from './FileUploader/FileUploader';
export { default as AudioRecorder } from './AudioRecorder/AudioRecorder';

// Visual Components (Phase 2 - IN PROGRESS)
export { default as TableCompletion } from './TableInput/TableCompletion';
export { default as DiagramCanvas } from './DiagramCanvas/DiagramCanvas';
export { default as GraphPlotter } from './GraphPlotter/GraphPlotter';
export { default as StructuralDiagram } from './StructuralDiagram/StructuralDiagram';
export { default as TableCreator } from './TableCreator/TableCreator';
export { default as ChemicalStructureEditor } from './ChemicalStructureEditor/ChemicalStructureEditor';

// ===== UTILITY EXPORTS =====
export * from './utils/assetUpload';
export * from './utils/canvasExport';
export * from './utils/dataValidation';

// ===== TYPE EXPORTS =====
export type { UploadedFile } from './FileUploader/FileUploader';
export type { AudioRecording } from './AudioRecorder/AudioRecorder';
export type { TableTemplate, TableCompletionData } from './TableInput/TableCompletion';
export type { DiagramData } from './DiagramCanvas/DiagramCanvas';
export type { GraphData, DataPoint } from './GraphPlotter/GraphPlotter';
export type { StructuralDiagramData, Label } from './StructuralDiagram/StructuralDiagram';
export type { TableCreatorData } from './TableCreator/TableCreator';
export type { ChemicalStructureData } from './ChemicalStructureEditor/ChemicalStructureEditor';

/**
 * IMPLEMENTATION STATUS:
 *
 * ✅ COMPLETED (9/11 components):
 * - CodeEditor (Monaco Editor with syntax highlighting)
 * - FileUploader (Drag-drop with preview)
 * - AudioRecorder (HTML5 MediaRecorder API)
 * - TableCompletion (Handsontable with locked/editable cells)
 * - DiagramCanvas (Fabric.js canvas drawing)
 * - GraphPlotter (Recharts with interactive plotting)
 * - StructuralDiagram (Labeled diagrams) - NEW ✨
 * - TableCreator (Full spreadsheet builder) - NEW ✨
 * - ChemicalStructureEditor (Text-based chemistry) - NEW ✨
 *
 * 📝 OPTIONAL COMPONENTS (2/11 - Not Required for IGCSE):
 * - VideoRecorder (HTML5 video - advanced feature)
 * - MathEquationEditor (LaTeX editor - covered by RichTextEditor)
 *
 * CURRENT PROGRESS: 82% complete (9/11 components)
 * IGCSE COVERAGE: 100% (all required formats supported)
 */
