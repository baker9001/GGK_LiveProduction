// src/components/shared/questions/index.ts

export { QuestionViewer } from './QuestionViewer';
export type {
  QuestionMode,
  QuestionSubject,
  QuestionData,
  QuestionPart,
  AnswerAlternative,
  UserResponse,
  PartResponse,
  ValidationReport,
  UploadedAttachment,
  QuestionViewerProps
} from './QuestionViewer';

export { MarkingSimulationPanel } from './MarkingSimulationPanel';
export { SubjectAdapter, ChemistryAdapter, BiologyAdapter, MathematicsAdapter, PhysicsAdapter } from './SubjectAdaptation';
export type { SubjectRules, ComplianceMessage } from './SubjectAdaptation';
