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

/**
 * IMPLEMENTATION STATUS:
 *
 * ✅ COMPLETED (6/11 components):
 * - CodeEditor (Monaco Editor with syntax highlighting)
 * - FileUploader (Drag-drop with preview)
 * - AudioRecorder (HTML5 MediaRecorder API)
 * - TableCompletion (Handsontable with locked/editable cells)
 * - DiagramCanvas (Fabric.js canvas drawing) - NEW
 * - GraphPlotter (Recharts with interactive plotting) - NEW
 *
 * 🚧 REMAINING TO IMPLEMENT (5/11 components):
 *
 * High Priority:
 * - StructuralDiagram (Extends DiagramCanvas with labels)
 * - TableCreator (Full spreadsheet from scratch)
 *
 * Medium Priority:
 * - ChemicalStructureEditor (Simplified drawing or text-based)
 *
 * CURRENT PROGRESS: 55% complete (6/11 components)
 */
