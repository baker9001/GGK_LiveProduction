// src/app/system-admin/learning/practice-management/papers-setup/page.tsx

/**
 * Past Papers Import Wizard Component
 * 
 * Required Supabase table schema for 'past_paper_import_sessions':
 * - id: uuid (primary key, auto-generated)
 * - json_file_name: text
 * - raw_json: jsonb
 * - status: text (values: 'in_progress', 'completed', 'failed')
 * - created_at: timestamp (auto-generated)
 * - metadata: jsonb (stores structure_complete, academic_structure, etc.)
 * - updated_at: timestamp (nullable)
 * - json_hash: text (for duplicate detection)
 * 
 * Optional columns you can add for enhanced functionality:
 * - created_by: uuid (foreign key to users table)
 * - file_size: bigint
 * - paper_id: uuid (nullable, foreign key to papers_setup)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/shared/Tabs';
import { supabase } from '../../../../../lib/supabase';
import { toast } from '../../../../../components/shared/Toast';
import { useUser } from '../../../../../contexts/UserContext';
import { 
  Loader2, CheckCircle, AlertCircle, FileJson, Database, 
  FileText, ClipboardList, Shield, Settings, Info, ChevronDown
} from 'lucide-react';
import { ScrollNavigator } from '../../../../../components/shared/ScrollNavigator';
import { Button } from '../../../../../components/shared/Button';
import { cn } from '../../../../../lib/utils';

// Import tab components
import { UploadTab } from './tabs/UploadTab';
import StructureTab from './tabs/StructureTab';
import { MetadataTab } from './tabs/MetadataTab';
import { QuestionsTab } from './tabs/QuestionsTab';
import { PreviousSessionsTable } from './components/PreviousSessionsTable';

// Define the tabs for the import workflow
const IMPORT_TABS = [
  { id: 'upload', label: 'Upload JSON', icon: FileJson },
  { id: 'structure', label: 'Academic Structure', icon: Database },
  { id: 'metadata', label: 'Paper Metadata', icon: FileText },
  { id: 'questions', label: 'Questions Review & Import', icon: ClipboardList },
];

// Define the possible tab statuses
type TabStatus = 'pending' | 'completed' | 'error' | 'active';

// Enhanced Extraction rules based on JSON structure
interface ExtractionRules {
  // Core extraction settings
  forwardSlashHandling: boolean;
  lineByLineProcessing: boolean;
  alternativeLinking: boolean;
  contextRequired: boolean;
  figureDetection: boolean;
  
  // Educational content requirements
  educationalContent: {
    hintsRequired: boolean;
    explanationsRequired: boolean;
  };
  
  // Subject-specific handling
  subjectSpecific: {
    physics: boolean;
    chemistry: boolean;
    biology: boolean;
    mathematics: boolean;
  };
  
  // Answer format abbreviations
  abbreviations: {
    ora: boolean; // "or reverse argument"
    owtte: boolean; // "or words to that effect"
    ecf: boolean; // "error carried forward"
    cao: boolean; // "correct answer only"
  };
  
  // Answer structure validation
  answerStructure: {
    validateMarks: boolean;
    requireContext: boolean;
    validateLinking: boolean;
    acceptAlternatives: boolean;
  };
  
  // Mark scheme processing
  markScheme: {
    requiresManualMarking: boolean;
    markingCriteria: boolean;
    componentMarking: boolean;
    levelDescriptors: boolean;
  };
  
  // Exam board specific rules
  examBoard: 'Cambridge' | 'Edexcel' | 'Both';
}

// Extraction Rules Configuration Component
const ExtractionRulesPanel: React.FC<{
  rules: ExtractionRules;
  onChange: (rules: ExtractionRules) => void;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ rules, onChange, isExpanded, onToggle }) => {
  const handleFieldChange = (field: string, value: any) => {
    const fieldParts = field.split('.');
    if (fieldParts.length === 1) {
      onChange({ ...rules, [field]: value });
    } else {
      const newRules = { ...rules };
      let current: any = newRules;
      for (let i = 0; i < fieldParts.length - 1; i++) {
        current = current[fieldParts[i]];
      }
      current[fieldParts[fieldParts.length - 1]] = value;
      onChange(newRules);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Extraction Rules Configuration
          </h3>
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-gray-500 transition-transform",
          isExpanded && "transform rotate-180"
        )} />
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Core Extraction Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Core Extraction Settings
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.forwardSlashHandling}
                  onChange={(e) => handleFieldChange('forwardSlashHandling', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Handle forward slash variations
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.lineByLineProcessing}
                  onChange={(e) => handleFieldChange('lineByLineProcessing', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Process line by line
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.alternativeLinking}
                  onChange={(e) => handleFieldChange('alternativeLinking', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Link answer alternatives
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.contextRequired}
                  onChange={(e) => handleFieldChange('contextRequired', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Require answer context
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.figureDetection}
                  onChange={(e) => handleFieldChange('figureDetection', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Detect figures and attachments
                </span>
              </label>
            </div>
          </div>

          {/* Educational Content */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Educational Content
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.educationalContent.hintsRequired}
                  onChange={(e) => handleFieldChange('educationalContent.hintsRequired', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Extract hints
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.educationalContent.explanationsRequired}
                  onChange={(e) => handleFieldChange('educationalContent.explanationsRequired', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Extract explanations
                </span>
              </label>
            </div>
          </div>

          {/* Subject-Specific Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Subject-Specific Rules
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.subjectSpecific.physics}
                  onChange={(e) => handleFieldChange('subjectSpecific.physics', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Physics</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.subjectSpecific.chemistry}
                  onChange={(e) => handleFieldChange('subjectSpecific.chemistry', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Chemistry</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.subjectSpecific.biology}
                  onChange={(e) => handleFieldChange('subjectSpecific.biology', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Biology</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.subjectSpecific.mathematics}
                  onChange={(e) => handleFieldChange('subjectSpecific.mathematics', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Mathematics</span>
              </label>
            </div>
          </div>

          {/* Answer Format Abbreviations */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Answer Format Abbreviations
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.abbreviations.ora}
                  onChange={(e) => handleFieldChange('abbreviations.ora', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  ORA (or reverse argument)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.abbreviations.owtte}
                  onChange={(e) => handleFieldChange('abbreviations.owtte', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  OWTTE (or words to that effect)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.abbreviations.ecf}
                  onChange={(e) => handleFieldChange('abbreviations.ecf', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  ECF (error carried forward)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.abbreviations.cao}
                  onChange={(e) => handleFieldChange('abbreviations.cao', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  CAO (correct answer only)
                </span>
              </label>
            </div>
          </div>

          {/* Answer Structure Validation */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Answer Structure Validation
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.answerStructure.validateMarks}
                  onChange={(e) => handleFieldChange('answerStructure.validateMarks', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Validate mark allocation
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.answerStructure.requireContext}
                  onChange={(e) => handleFieldChange('answerStructure.requireContext', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Require answer context
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.answerStructure.validateLinking}
                  onChange={(e) => handleFieldChange('answerStructure.validateLinking', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Validate alternative linking
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.answerStructure.acceptAlternatives}
                  onChange={(e) => handleFieldChange('answerStructure.acceptAlternatives', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Accept answer alternatives
                </span>
              </label>
            </div>
          </div>

          {/* Mark Scheme Processing */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Mark Scheme Processing
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.markScheme.requiresManualMarking}
                  onChange={(e) => handleFieldChange('markScheme.requiresManualMarking', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Identify manual marking requirements
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.markScheme.markingCriteria}
                  onChange={(e) => handleFieldChange('markScheme.markingCriteria', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Extract marking criteria
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.markScheme.componentMarking}
                  onChange={(e) => handleFieldChange('markScheme.componentMarking', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable component marking
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rules.markScheme.levelDescriptors}
                  onChange={(e) => handleFieldChange('markScheme.levelDescriptors', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Use level descriptors
                </span>
              </label>
            </div>
          </div>

          {/* Exam Board Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Exam Board
            </h4>
            <select
              value={rules.examBoard}
              onChange={(e) => handleFieldChange('examBoard', e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="Cambridge">Cambridge</option>
              <option value="Edexcel">Edexcel</option>
              <option value="Both">Both Boards</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function to generate a hash for JSON content
const generateJsonHash = async (jsonData: any): Promise<string> => {
  const jsonString = JSON.stringify(jsonData);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export default function PapersSetupPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const displayedSessionIdRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasCheckedForSession = useRef(false);
  
  // Get tab from URL query parameter or default to 'upload'
  const getQueryParam = () => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'upload';
  };
  
  const [activeTab, setActiveTab] = useState(getQueryParam());
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [importSession, setImportSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [structureComplete, setStructureComplete] = useState(false);
  const [structureCompleteCalled, setStructureCompleteCalled] = useState(false);
  const [existingPaperId, setExistingPaperId] = useState<string | null>(null);
  const [savedPaperDetails, setSavedPaperDetails] = useState<any>(null);
  const [stagedAttachments, setStagedAttachments] = useState<Record<string, any[]>>({});
  const [previousSessionsExpanded, setPreviousSessionsExpanded] = useState(false);
  const [extractionRulesExpanded, setExtractionRulesExpanded] = useState(true); // Always expanded by default
  
  // Track the status of each tab
  const [tabStatuses, setTabStatuses] = useState<Record<string, TabStatus>>({
    upload: 'pending',
    structure: 'pending',
    metadata: 'pending',
    questions: 'pending',
  });
  
  // Enhanced extraction rules configuration with defaults based on JSON structure
  const [extractionRules, setExtractionRules] = useState<ExtractionRules>({
    forwardSlashHandling: true,
    lineByLineProcessing: true,
    alternativeLinking: true,
    contextRequired: true,
    figureDetection: true,
    educationalContent: {
      hintsRequired: true,
      explanationsRequired: true,
    },
    subjectSpecific: {
      physics: false,
      chemistry: false,
      biology: false,
      mathematics: false,
    },
    abbreviations: {
      ora: true,
      owtte: true,
      ecf: true,
      cao: true,
    },
    answerStructure: {
      validateMarks: true,
      requireContext: true,
      validateLinking: true,
      acceptAlternatives: true,
    },
    markScheme: {
      requiresManualMarking: true,
      markingCriteria: true,
      componentMarking: true,
      levelDescriptors: true,
    },
    examBoard: 'Cambridge',
  });

  // Check for existing in-progress session on mount
  useEffect(() => {
    if (!hasCheckedForSession.current && user) {
      hasCheckedForSession.current = true;
      checkForExistingSession();
    }
  }, [user]);

  // Check for existing import session
  const checkForExistingSession = async () => {
    setIsLoadingSession(true);
    try {
      // Get the most recent in-progress session
      const { data, error } = await supabase
        .from('past_paper_import_sessions')
        .select('*')
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setImportSession(data);
        if (data.raw_json) {
          setParsedData(data.raw_json);
          // Create a mock file for UI display
          const mockFile = new File(
            [JSON.stringify(data.raw_json)], 
            data.json_file_name || 'previous_import.json',
            { type: 'application/json' }
          );
          setUploadedFile(mockFile);
        }
        
        // Update tab statuses based on session metadata
        const newStatuses = { ...tabStatuses };
        newStatuses.upload = 'completed';
        
        if (data.metadata?.structure_complete) {
          newStatuses.structure = 'completed';
          setStructureComplete(true);
        }
        
        if (data.metadata?.metadata_complete) {
          newStatuses.metadata = 'completed';
          setExistingPaperId(data.metadata?.paper_id);
          setSavedPaperDetails(data.metadata?.paper_details);
        }
        
        if (data.metadata?.questions_imported) {
          newStatuses.questions = 'completed';
        }
        
        setTabStatuses(newStatuses);
        
        // Show notification
        toast.success('Previous import session restored');
        
        // Update subject-specific rules based on parsed data
        if (data.raw_json?.subject) {
          updateSubjectRules(data.raw_json.subject);
        }
      }
    } catch (error) {
      console.error('Error checking for existing session:', error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Update subject-specific rules based on parsed data
  const updateSubjectRules = (subject: string) => {
    const subjectLower = subject.toLowerCase();
    setExtractionRules(prev => ({
      ...prev,
      subjectSpecific: {
        physics: subjectLower.includes('physics'),
        chemistry: subjectLower.includes('chemistry'),
        biology: subjectLower.includes('biology'),
        mathematics: subjectLower.includes('math'),
      },
    }));
  };

  // Update URL with tab changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('tab', activeTab);
    const newUrl = `${location.pathname}?${params.toString()}`;
    if (location.pathname + location.search !== newUrl) {
      navigate(newUrl, { replace: true });
    }
  }, [activeTab, location.pathname, location.search, navigate]);

  // Load session from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session');
    
    if (sessionId && sessionId !== displayedSessionIdRef.current) {
      displayedSessionIdRef.current = sessionId;
      loadImportSession(sessionId);
    }
  }, [location.search]);

  const loadImportSession = async (sessionId: string) => {
    setIsLoadingSession(true);
    try {
      const { data, error } = await supabase
        .from('past_paper_import_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      if (data) {
        setImportSession(data);
        if (data.raw_json) {
          setParsedData(data.raw_json);
          const mockFile = new File(
            [JSON.stringify(data.raw_json)], 
            data.json_file_name || 'imported_data.json',
            { type: 'application/json' }
          );
          setUploadedFile(mockFile);
        }
        
        // Update tab statuses based on session state and metadata
        const newStatuses = { ...tabStatuses };
        newStatuses.upload = 'completed';
        
        // Check metadata for completion states
        if (data.metadata?.structure_complete) {
          newStatuses.structure = 'completed';
          setStructureComplete(true);
        }
        
        if (data.metadata?.metadata_complete) {
          newStatuses.metadata = 'completed';
          setExistingPaperId(data.metadata?.paper_id);
          setSavedPaperDetails(data.metadata?.paper_details);
        }
        
        if (data.metadata?.questions_imported) {
          newStatuses.questions = 'completed';
        }
        
        setTabStatuses(newStatuses);
        
        // Navigate to appropriate tab
        if (data.metadata?.questions_imported) {
          setActiveTab('questions');
        } else if (data.metadata?.metadata_complete) {
          setActiveTab('questions');
        } else if (data.metadata?.structure_complete) {
          setActiveTab('metadata');
        } else {
          setActiveTab('structure');
        }
        
        // Update subject rules if data available
        if (data.raw_json?.subject) {
          updateSubjectRules(data.raw_json.subject);
        }
      }
    } catch (error) {
      console.error('Error loading import session:', error);
      toast.error('Failed to load import session');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    setUploadedFile(file);
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      // Read and parse the file
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      // Validate JSON structure
      if (!jsonData.exam_board || !jsonData.qualification || !jsonData.questions) {
        throw new Error('Invalid JSON structure. Missing required fields: exam_board, qualification, or questions.');
      }
      
      setParsedData(jsonData);
      
      // Generate hash for duplicate detection
      const jsonHash = await generateJsonHash(jsonData);
      
      // Check for exact duplicate (same hash)
      try {
        const { data: exactDuplicate } = await supabase
          .from('past_paper_import_sessions')
          .select('*')
          .eq('json_hash', jsonHash)
          .eq('status', 'in_progress')
          .maybeSingle();
        
        if (exactDuplicate) {
          // Silently use existing session for exact duplicate
          setImportSession(exactDuplicate);
          toast.info('Resuming existing import session with identical content');
          
          // Update URL with session ID
          const params = new URLSearchParams(location.search);
          params.set('session', exactDuplicate.id);
          params.set('tab', 'structure');
          navigate({ search: params.toString() });
          
          clearInterval(progressInterval);
          setUploadProgress(100);
          
          setTabStatuses(prev => ({
            ...prev,
            upload: 'completed',
            structure: 'active',
          }));
          
          handleTabChange('structure');
          return;
        }
      } catch (hashError) {
        // If json_hash column doesn't exist yet, continue without hash checking
        console.log('Hash-based duplicate detection not available yet');
      }
      
      // Check for similar files (same paper code and year but different content)
      const paperCode = jsonData.paper_code || jsonData.paper_metadata?.paper_code;
      const examYear = jsonData.exam_year || jsonData.paper_metadata?.exam_year;
      
      if (paperCode && examYear) {
        const { data: similarSessions } = await supabase
          .from('past_paper_import_sessions')
          .select('*')
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false });
        
        // Check if we have a session with the same paper code and year but different content
        const similarSession = similarSessions?.find(session => {
          const sessionPaperCode = session.raw_json?.paper_code || session.raw_json?.paper_metadata?.paper_code;
          const sessionYear = session.raw_json?.exam_year || session.raw_json?.paper_metadata?.exam_year;
          const isDifferentContent = !session.json_hash || session.json_hash !== jsonHash;
          return sessionPaperCode === paperCode && sessionYear === examYear && isDifferentContent;
        });
        
        if (similarSession) {
          // Ask user about similar but different content
          const createNew = confirm(
            `An import session for ${paperCode} (${examYear}) already exists, but with different content. ` +
            `This might be a corrected version or different variant.\n\n` +
            `Would you like to create a new session for this version?\n\n` +
            `Click OK to create new session, or Cancel to use the existing one.`
          );
          
          if (!createNew) {
            // Use the existing similar session
            setImportSession(similarSession);
            toast.info('Using existing import session for this paper');
            
            // Update URL with session ID
            const params = new URLSearchParams(location.search);
            params.set('session', similarSession.id);
            params.set('tab', 'structure');
            navigate({ search: params.toString() });
            
            clearInterval(progressInterval);
            setUploadProgress(100);
            
            setTabStatuses(prev => ({
              ...prev,
              upload: 'completed',
              structure: 'active',
            }));
            
            handleTabChange('structure');
            return;
          }
          // Continue to create new session if user chose OK
        }
      }
      
      // Create new import session
      const sessionData: any = {
        json_file_name: file.name,
        raw_json: jsonData,
        status: 'in_progress',
        metadata: {
          upload_timestamp: new Date().toISOString(),
          file_size: file.size,
          extraction_rules: extractionRules
        }
      };
      
      // Try to include hash if supported
      try {
        sessionData.json_hash = jsonHash;
      } catch (e) {
        // Column might not exist yet
      }
      
      const { data: session, error: sessionError } = await supabase
        .from('past_paper_import_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (sessionError) throw sessionError;

      setImportSession(session);
      
      // Update URL with session ID
      const params = new URLSearchParams(location.search);
      params.set('session', session.id);
      params.set('tab', 'structure');
      navigate({ search: params.toString() });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTabStatuses(prev => ({
        ...prev,
        upload: 'completed',
        structure: 'active',
      }));
      
      toast.success('File uploaded successfully');
      
      // Auto-navigate to structure tab
      handleTabChange('structure');
      
      // Update subject rules based on parsed data
      if (jsonData.subject) {
        updateSubjectRules(jsonData.subject);
      }
      
      // Update exam board
      if (jsonData.exam_board) {
        setExtractionRules(prev => ({
          ...prev,
          examBoard: jsonData.exam_board.includes('Cambridge') ? 'Cambridge' : 
                     jsonData.exam_board.includes('Edexcel') ? 'Edexcel' : 'Both'
        }));
      }
    } catch (error) {
      console.error('Error processing file:', error);
      let errorMessage = 'Failed to process file';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for Supabase schema errors
        if (error.message.includes('Could not find') && error.message.includes('column')) {
          errorMessage = 'Database schema error: Some required columns are missing. Please ensure the database is properly set up.';
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setTabStatuses(prev => ({
        ...prev,
        upload: 'error',
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectPreviousSession = async (session: any) => {
    const params = new URLSearchParams(location.search);
    params.set('session', session.id);
    params.set('tab', getAppropriateTab(session));
    navigate({ search: params.toString() });
  };

  const getAppropriateTab = (session: any) => {
    if (session.metadata?.questions_imported) return 'questions';
    if (session.metadata?.metadata_complete) return 'questions';
    if (session.metadata?.structure_complete) return 'metadata';
    return 'structure';
  };

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', tabId);
    navigate({ search: params.toString() }, { replace: true });
    setActiveTab(tabId);
  };

  const handleStructureComplete = async () => {
    if (structureCompleteCalled) return;
    setStructureCompleteCalled(true);
    
    setStructureComplete(true);
    setTabStatuses(prev => ({
      ...prev,
      structure: 'completed',
      metadata: 'active',
    }));
    
    // Auto-navigate to metadata tab
    handleTabChange('metadata');
  };

  const handleMetadataSave = async (paperId: string, paperDetails: any) => {
    setExistingPaperId(paperId);
    setSavedPaperDetails(paperDetails);
    
    // Update session metadata
    if (importSession?.id) {
      const { data: existingSession } = await supabase
        .from('past_paper_import_sessions')
        .select('metadata')
        .eq('id', importSession.id)
        .single();

      await supabase
        .from('past_paper_import_sessions')
        .update({
          metadata: {
            ...(existingSession?.metadata || {}),
            metadata_complete: true,
            paper_id: paperId,
            paper_details: paperDetails
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', importSession.id);
    }
    
    setTabStatuses(prev => ({
      ...prev,
      metadata: 'completed',
      questions: 'active',
    }));
    
    // Auto-navigate to questions tab
    handleTabChange('questions');
  };

  const getTabStatus = (tabId: string): TabStatus => {
    if (activeTab === tabId) return 'active';
    return tabStatuses[tabId] || 'pending';
  };

  const isTabDisabled = (tabId: string) => {
    const tabIndex = IMPORT_TABS.findIndex(tab => tab.id === tabId);
    
    if (tabId === 'upload') return false;
    
    // Check if previous tabs are completed
    for (let i = 0; i < tabIndex; i++) {
      if (tabStatuses[IMPORT_TABS[i].id] !== 'completed') {
        return true;
      }
    }
    
    return false;
  };

  // Update staged attachments
  const updateStagedAttachments = (questionId: string, attachments: any[]) => {
    setStagedAttachments(prev => ({
      ...prev,
      [questionId]: attachments
    }));
  };

  // Scroll navigation sections
  const scrollSections = [
    { id: 'workflow', label: 'Import Workflow' },
    { id: 'upload-section', label: 'Upload JSON' },
    { id: 'extraction-rules', label: 'Extraction Rules' },
    { id: 'previous-sessions', label: 'Previous Sessions' },
  ];

  if (isLoadingSession && !uploadedFile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl" ref={contentRef}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Past Papers Import Wizard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Import and configure past exam papers with structured question extraction
        </p>
      </div>

      {/* Scroll Navigator */}
      <ScrollNavigator
        sections={scrollSections}
        containerRef={contentRef}
        offset={100}
      />

      {/* Progress Indicator */}
      <div id="workflow" className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {IMPORT_TABS.map((tab, index) => {
              const status = getTabStatus(tab.id);
              const Icon = tab.icon;
              
              return (
                <div key={tab.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      status === 'completed' && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                      status === 'active' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500",
                      status === 'error' && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                      status === 'pending' && "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                    )}>
                      {status === 'completed' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs mt-1 font-medium",
                      status === 'active' && "text-blue-600 dark:text-blue-400",
                      status === 'completed' && "text-green-600 dark:text-green-400",
                      status === 'pending' && "text-gray-400 dark:text-gray-500"
                    )}>
                      {tab.label}
                    </span>
                  </div>
                  {index < IMPORT_TABS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-2 transition-all",
                      tabStatuses[IMPORT_TABS[index + 1].id] === 'completed' || 
                      tabStatuses[IMPORT_TABS[index + 1].id] === 'active' 
                        ? "bg-green-500 dark:bg-green-400" 
                        : "bg-gray-300 dark:bg-gray-600"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="w-full justify-center">
          {IMPORT_TABS.map((tab) => {
            const Icon = tab.icon;
            const status = getTabStatus(tab.id);
            const isDisabled = isTabDisabled(tab.id);

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={isDisabled}
                tabStatus={status}
              >
                <Icon className="h-4 w-4 mr-2" />
                <span>{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div id="upload-section">
            <UploadTab
              onFileSelected={handleFileSelected}
              uploadedFile={uploadedFile}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={error}
              parsedData={parsedData}
              onSelectPreviousSession={handleSelectPreviousSession}
              importSession={importSession}
            />
          </div>
          
          {/* Extraction Rules - moved here as requested */}
          <div id="extraction-rules" className="mt-6">
            <ExtractionRulesPanel
              rules={extractionRules}
              onChange={setExtractionRules}
              isExpanded={extractionRulesExpanded}
              onToggle={() => setExtractionRulesExpanded(!extractionRulesExpanded)}
            />
          </div>
          
          {/* Previous Sessions */}
          <div id="previous-sessions" className="mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setPreviousSessionsExpanded(!previousSessionsExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Previous Import Sessions
                </h3>
                <ChevronDown className={cn(
                  "h-5 w-5 text-gray-500 transition-transform",
                  previousSessionsExpanded && "transform rotate-180"
                )} />
              </button>
              
              {previousSessionsExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                  <PreviousSessionsTable 
                    onSelectSession={handleSelectPreviousSession}
                    currentSessionId={importSession?.id}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="structure">
          {importSession && parsedData ? (
            <StructureTab
              importSession={importSession}
              parsedData={parsedData}
              onNext={handleStructureComplete}
              onPrevious={() => handleTabChange('upload')}
            />
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Please complete the upload step first
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="metadata">
          {importSession && parsedData ? (
            <MetadataTab
              importSession={importSession}
              parsedData={parsedData}
              onSave={handleMetadataSave}
              onPrevious={() => handleTabChange('structure')}
            />
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Please complete the previous steps first
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions">
          {importSession && parsedData && existingPaperId ? (
            <QuestionsTab
              importSession={importSession}
              parsedData={parsedData}
              existingPaperId={existingPaperId}
              savedPaperDetails={savedPaperDetails}
              onPrevious={() => handleTabChange('metadata')}
              onContinue={() => navigate('/system-admin/learning/practice-management/questions-setup')}
              extractionRules={extractionRules}
              updateStagedAttachments={updateStagedAttachments}
              stagedAttachments={stagedAttachments}
            />
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Please complete the previous steps first
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}