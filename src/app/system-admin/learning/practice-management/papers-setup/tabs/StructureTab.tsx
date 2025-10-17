// src/app/system-admin/learning/practice-management/papers-setup/tabs/StructureTab.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, ChevronRight, Loader2, CheckCircle, AlertCircle, 
  XCircle, Plus, RefreshCw, Shield, Info, BookOpen, Building2,
  Package, FileText, Eye, EyeOff, MapPin
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { toast } from '../../../../../../components/shared/Toast';
import { CollapsibleSection } from '../../../../../../components/shared/CollapsibleSection';
import ImportedStructureReview from '../../../../../../components/shared/ImportedStructureReview';
import { supabase } from '../../../../../../lib/supabase';
import { cn } from '../../../../../../lib/utils';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';

interface StructureTabProps {
  importSession: any;
  parsedData: any;
  onNext: () => void;
  onPrevious: () => void;
}

interface ExtractedStructure {
  program: string;
  provider: string;
  subject: string;
  subjectCode?: string;
  qualification: string;
  examBoard: string;
  hasUnits: boolean;
  hasTopics: boolean;
  hasSubtopics: boolean;
  questionsCount: number;
  uniqueUnits: Set<string>;
  uniqueTopics: Set<string>;
  uniqueSubtopics: Set<string>;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

interface StructureMetadata {
  dataStructureId?: string;
  program?: string;
  provider?: string;
  subject?: string;
  region?: string;
  programId?: string;
  providerId?: string;
  subjectId?: string;
  regionId?: string;
}

export default function StructureTab({ 
  importSession, 
  parsedData, 
  onNext, 
  onPrevious 
}: StructureTabProps) {
  const [loading, setLoading] = useState(false);
  const [structureComplete, setStructureComplete] = useState(false);
  const [structureData, setStructureData] = useState<any>(null);
  const [extractedStructure, setExtractedStructure] = useState<ExtractedStructure | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [structureCreated, setStructureCreated] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [structureMetadata, setStructureMetadata] = useState<StructureMetadata | null>(null);
  const [processingStats, setProcessingStats] = useState({
    totalQuestions: 0,
    questionsWithTopics: 0,
    questionsWithSubtopics: 0,
    questionsWithUnits: 0
  });

  // Check if we already have entity IDs from a previous run
  useEffect(() => {
    if (importSession?.metadata?.entity_ids) {
      console.log('[GGK] Found existing entity IDs in session:', importSession.metadata.entity_ids);
      setStructureMetadata({
        dataStructureId: importSession.metadata.entity_ids.data_structure_id,
        programId: importSession.metadata.entity_ids.program_id,
        providerId: importSession.metadata.entity_ids.provider_id,
        subjectId: importSession.metadata.entity_ids.subject_id,
        regionId: importSession.metadata.entity_ids.region_id,
      });
      setStructureComplete(true);
      setStructureCreated(true);
    }
  }, [importSession]);

  useEffect(() => {
    if (parsedData) {
      extractStructureFromJSON();
    }
  }, [parsedData]);

  const extractStructureFromJSON = useCallback(() => {
    if (!parsedData) return;

    const issues: ValidationIssue[] = [];
    
    try {
      // Extract structure from the new JSON format
      const structure: ExtractedStructure = {
        examBoard: parsedData.exam_board || '',
        qualification: parsedData.qualification || '',
        subject: parsedData.subject || '',
        subjectCode: undefined,
        program: '',
        provider: '',
        hasUnits: false,
        hasTopics: false,
        hasSubtopics: false,
        questionsCount: parsedData.questions?.length || 0,
        uniqueUnits: new Set(),
        uniqueTopics: new Set(),
        uniqueSubtopics: new Set()
      };

      // Extract subject code if present in subject field
      if (structure.subject) {
        // Handle "Physics - 0625" format
        const subjectMatch = structure.subject.match(/^(.+?)\s*-\s*(\d+)$/);
        if (subjectMatch) {
          structure.subject = subjectMatch[1].trim();
          structure.subjectCode = subjectMatch[2];
        }
        // Handle "Physics (0625)" format
        const parenMatch = structure.subject.match(/^(.+?)\s*\((\d+)\)$/);
        if (parenMatch) {
          structure.subject = parenMatch[1].trim();
          structure.subjectCode = parenMatch[2];
        }
      }

      // Map exam board to provider (standardized)
      if (structure.examBoard) {
        const examBoardLower = structure.examBoard.toLowerCase();
        switch (examBoardLower) {
          case 'cambridge':
          case 'cambridge international':
          case 'cambridge international (cie)':
          case 'cie':
            structure.provider = 'Cambridge International (CIE)';
            break;
          case 'edexcel':
          case 'pearson edexcel':
            structure.provider = 'Edexcel';
            break;
          case 'aqa':
            structure.provider = 'AQA';
            break;
          case 'ocr':
            structure.provider = 'OCR';
            break;
          default:
            structure.provider = structure.examBoard;
        }
      } else {
        issues.push({
          type: 'error',
          message: 'Missing exam board information',
          field: 'exam_board'
        });
      }

      // Map qualification to program (standardized)
      if (structure.qualification) {
        const qualLower = structure.qualification.toLowerCase();
        switch (qualLower) {
          case 'igcse':
          case 'international gcse':
            structure.program = 'IGCSE';
            break;
          case 'gcse':
            structure.program = 'GCSE';
            break;
          case 'a level':
          case 'a-level':
            structure.program = 'A Level';
            break;
          case 'as level':
          case 'as-level':
            structure.program = 'AS Level';
            break;
          case 'ib':
          case 'international baccalaureate':
            structure.program = 'IB';
            break;
          default:
            structure.program = structure.qualification;
        }
      } else {
        issues.push({
          type: 'error',
          message: 'Missing qualification information',
          field: 'qualification'
        });
      }

      // Validate subject
      if (!structure.subject) {
        issues.push({
          type: 'error',
          message: 'Missing subject information',
          field: 'subject'
        });
      }

      // Process questions to extract academic structure
      let questionsWithUnits = 0;
      let questionsWithTopics = 0;
      let questionsWithSubtopics = 0;

      if (parsedData.questions && Array.isArray(parsedData.questions)) {
        parsedData.questions.forEach((question: any, index: number) => {
          // Extract units - check multiple possible fields
          const unit = question.unit || question.chapter || question.section || 'General Topics';
          if (unit !== 'General Topics') {
            structure.uniqueUnits.add(unit);
            structure.hasUnits = true;
            questionsWithUnits++;
          }

          // Extract topics
          if (question.topic) {
            structure.uniqueTopics.add(question.topic);
            structure.hasTopics = true;
            questionsWithTopics++;
          } else {
            issues.push({
              type: 'warning',
              message: `Question ${question.question_number || index + 1} is missing topic information`,
              field: `questions[${index}].topic`
            });
          }

          // Extract subtopics
          if (question.subtopic) {
            structure.uniqueSubtopics.add(question.subtopic);
            structure.hasSubtopics = true;
            questionsWithSubtopics++;
          }
        });

        // Update processing stats
        setProcessingStats({
          totalQuestions: parsedData.questions.length,
          questionsWithTopics,
          questionsWithSubtopics,
          questionsWithUnits
        });

        // Add info about coverage
        if (questionsWithTopics < parsedData.questions.length) {
          issues.push({
            type: 'info',
            message: `${parsedData.questions.length - questionsWithTopics} questions don't have topics assigned`
          });
        }

        if (questionsWithUnits === 0 || !structure.hasUnits) {
          issues.push({
            type: 'info',
            message: 'No unit information found in questions. Using "General Topics" as default unit.',
          });
          // Add default unit if none found
          structure.uniqueUnits.add('General Topics');
          structure.hasUnits = true;
        }
      } else {
        issues.push({
          type: 'error',
          message: 'No questions found in the imported data',
          field: 'questions'
        });
      }

      setExtractedStructure(structure);
      setValidationIssues(issues);

      // Transform for ImportedStructureReview component
      // Keep the full subject string including code for the component to handle
      const transformedData = {
        exam_board: parsedData.exam_board,
        qualification: parsedData.qualification,
        subject: parsedData.subject, // Keep original with code
        questions: parsedData.questions || []
      };

      setStructureData(transformedData);
    } catch (error) {
      console.error('Error extracting metadata:', error);
      issues.push({
        type: 'error',
        message: 'Failed to extract metadata from JSON',
        field: 'general'
      });
      setValidationIssues(issues);
    }
  }, [parsedData]);

  const handleStructureComplete = useCallback(() => {
    console.log('[GGK] Structure marked as complete');
    setStructureComplete(true);
    setStructureCreated(true);
  }, []);

  const handleStructureChange = useCallback((metadata: StructureMetadata) => {
    console.log('[StructureTab] Structure metadata received:', metadata);
    console.log('[StructureTab] Metadata contains:', {
      hasDataStructureId: !!metadata.dataStructureId,
      hasProgramId: !!metadata.programId,
      hasProviderId: !!metadata.providerId,
      hasSubjectId: !!metadata.subjectId,
      hasRegionId: !!metadata.regionId
    });

    setStructureMetadata(metadata);

    // Also mark as complete when we get the metadata with data structure ID
    if (metadata.dataStructureId) {
      console.log('[StructureTab] Data structure ID received, marking as complete');
      setStructureComplete(true);
      setStructureCreated(true);
    } else {
      console.warn('[StructureTab] No data structure ID in metadata - structure not complete');
    }
  }, []);

  const fetchEntityIds = async (dataStructureId: string) => {
    console.log('[GGK] Fetching entity IDs for data structure:', dataStructureId);
    
    try {
      // Fetch the data structure with all related entities
      const { data: dataStructure, error: fetchError } = await supabase
        .from('data_structures')
        .select(`
          id,
          program_id,
          provider_id,
          subject_id,
          region_id,
          programs!data_structures_program_id_fkey (
            id,
            name,
            code
          ),
          providers!data_structures_provider_id_fkey (
            id,
            name,
            code
          ),
          edu_subjects!data_structures_subject_id_fkey (
            id,
            name,
            code
          ),
          regions!data_structures_region_id_fkey (
            id,
            name
          )
        `)
        .eq('id', dataStructureId)
        .single();

      if (fetchError) {
        console.error('[GGK] Error fetching data structure:', fetchError);
        throw fetchError;
      }

      if (!dataStructure) {
        throw new Error('Data structure not found');
      }

      console.log('[GGK] Fetched data structure with entities:', dataStructure);

      return {
        program_id: dataStructure.program_id,
        provider_id: dataStructure.provider_id,
        subject_id: dataStructure.subject_id,
        region_id: dataStructure.region_id,
        program_name: dataStructure.programs?.name,
        provider_name: dataStructure.providers?.name,
        subject_name: dataStructure.edu_subjects?.name,
        subject_code: dataStructure.edu_subjects?.code,
        region_name: dataStructure.regions?.name
      };
    } catch (error) {
      console.error('[GGK] Error in fetchEntityIds:', error);
      throw error;
    }
  };

  const handleNext = useCallback(async () => {
    if (!structureComplete) {
      toast.error('Please complete the academic structure review first');
      return;
    }

    if (!structureMetadata?.dataStructureId) {
      toast.error('Data structure was not created successfully. Please check the error messages and try refreshing the structure.');
      return;
    }

    setLoading(true);

    try {
      let entityIds: any = {};

      // Check if we have all the entity IDs we need
      if (structureMetadata?.programId && structureMetadata?.providerId && structureMetadata?.subjectId) {
        // Use existing IDs from structureMetadata (fast path)
        console.log('[GGK] Using existing entity IDs from metadata');
        entityIds = {
          program_id: structureMetadata.programId,
          provider_id: structureMetadata.providerId,
          subject_id: structureMetadata.subjectId,
          region_id: structureMetadata.regionId,
          data_structure_id: structureMetadata.dataStructureId
        };
      } else if (structureMetadata?.dataStructureId) {
        // Fetch entity IDs from the data structure (slow path - only as fallback)
        console.log('[GGK] Fetching entity IDs from data structure...');
        const fetchedIds = await fetchEntityIds(structureMetadata.dataStructureId);

        entityIds = {
          program_id: fetchedIds.program_id,
          provider_id: fetchedIds.provider_id,
          subject_id: fetchedIds.subject_id,
          region_id: fetchedIds.region_id,
          data_structure_id: structureMetadata.dataStructureId
        };

        // Update local state with fetched IDs
        setStructureMetadata(prev => ({
          ...prev,
          programId: fetchedIds.program_id,
          providerId: fetchedIds.provider_id,
          subjectId: fetchedIds.subject_id,
          regionId: fetchedIds.region_id,
          program: fetchedIds.program_name,
          provider: fetchedIds.provider_name,
          subject: fetchedIds.subject_name,
          region: fetchedIds.region_name
        }));
      } else {
        // No data structure ID - this shouldn't happen
        throw new Error('No data structure ID available. Please complete the structure setup.');
      }

      // Validate that we have all required IDs
      if (!entityIds.program_id || !entityIds.provider_id || !entityIds.subject_id) {
        throw new Error('Missing required entity IDs. Please ensure all entities are created.');
      }

      // Update import session with entity IDs
      await updateImportSession(entityIds);

    } catch (error: any) {
      console.error('[GGK] Error in handleNext:', error);
      toast.error(error.message || 'Failed to proceed to next step');
    } finally {
      setLoading(false);
    }
  }, [structureComplete, structureMetadata, extractedStructure, importSession, onNext]);

  const updateImportSession = async (entityIds: any) => {
    try {
      console.log('[StructureTab] Starting import session update with entity IDs:', entityIds);

      // Validate entity IDs before saving
      if (!entityIds.program_id) {
        throw new Error('Missing program_id - cannot proceed');
      }
      if (!entityIds.provider_id) {
        throw new Error('Missing provider_id - cannot proceed');
      }
      if (!entityIds.subject_id) {
        throw new Error('Missing subject_id - cannot proceed');
      }
      if (!entityIds.data_structure_id) {
        throw new Error('Missing data_structure_id - cannot proceed');
      }

      // Use existing metadata from importSession prop instead of fetching
      const existingMetadata = importSession?.metadata || {};

      // Merge with existing metadata and ensure entity_ids are stored
      const updatedMetadata = {
        ...existingMetadata,
        structure_complete: true,
        academic_structure: {
          ...extractedStructure,
          uniqueUnits: Array.from(extractedStructure?.uniqueUnits || []),
          uniqueTopics: Array.from(extractedStructure?.uniqueTopics || []),
          uniqueSubtopics: Array.from(extractedStructure?.uniqueSubtopics || [])
        },
        // Store the entity IDs for use in subsequent tabs - THIS IS CRITICAL
        entity_ids: {
          program_id: entityIds.program_id,
          provider_id: entityIds.provider_id,
          subject_id: entityIds.subject_id,
          region_id: entityIds.region_id,
          data_structure_id: entityIds.data_structure_id,
          // Store names for debugging
          program_name: structureMetadata?.program,
          provider_name: structureMetadata?.provider,
          subject_name: structureMetadata?.subject,
          region_name: structureMetadata?.region
        }
      };

      console.log('[StructureTab] Updated metadata to save:', JSON.stringify(updatedMetadata, null, 2));

      // Update the import session with structure completion in metadata
      const { data: updatedSession, error } = await supabase
        .from('past_paper_import_sessions')
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', importSession.id)
        .select();

      if (error) {
        console.error('[StructureTab] Supabase error updating session:', error);
        throw error;
      }

      if (!updatedSession || updatedSession.length === 0) {
        throw new Error('Import session update returned no data - session may not exist');
      }

      console.log('[StructureTab] Successfully updated import session:', updatedSession[0]?.id);
      console.log('[StructureTab] Saved entity_ids:', updatedSession[0]?.metadata?.entity_ids);

      toast.success('Academic structure configured successfully');

      // Small delay to ensure database write completes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigate to metadata tab
      console.log('[StructureTab] Proceeding to next step');
      onNext();
    } catch (error: any) {
      console.error('[StructureTab] Error updating import session:', error);
      toast.error(error.message || 'Failed to save structure configuration');
      throw error;
    }
  };

  const refreshStructure = () => {
    setStructureComplete(false);
    setStructureCreated(false);
    setStructureMetadata(null);
    extractStructureFromJSON();
  };

  const getIssueIcon = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const hasErrors = validationIssues.some(issue => issue.type === 'error');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Academic Structure Configuration
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Review and configure the academic hierarchy for this paper
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawData(!showRawData)}
            >
              {showRawData ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showRawData ? 'Hide' : 'Show'} Raw Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStructure}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Extracted Structure Summary */}
      {extractedStructure && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Extracted Structure Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Exam Board (Provider)</p>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{extractedStructure.provider}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Original: {extractedStructure.examBoard}</p>
              {structureMetadata?.providerId && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">ID: {structureMetadata.providerId}</p>
              )}
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Qualification (Program)</p>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{extractedStructure.program}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Original: {extractedStructure.qualification}</p>
              {structureMetadata?.programId && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">ID: {structureMetadata.programId}</p>
              )}
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</p>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {extractedStructure.subject.replace(/\s*-\s*\d+$/, '').replace(/\s*\(\d+\)$/, '')}
              </p>
              {extractedStructure.subjectCode && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Code: {extractedStructure.subjectCode}</p>
              )}
              {structureMetadata?.subjectId && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">ID: {structureMetadata.subjectId}</p>
              )}
            </div>
          </div>

          {/* Region Info if available */}
          {structureMetadata?.regionId && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Region</p>
                <p className="text-sm text-gray-900 dark:text-white ml-2">{structureMetadata.region || 'Selected'}</p>
                {structureMetadata.regionId && (
                  <p className="text-xs text-green-600 dark:text-green-400 ml-2">(ID: {structureMetadata.regionId})</p>
                )}
              </div>
            </div>
          )}

          {/* Processing Statistics */}
          <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-700">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">Processing Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{processingStats.totalQuestions}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Total Questions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{extractedStructure.uniqueUnits.size}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Unique Units</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{extractedStructure.uniqueTopics.size}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Unique Topics</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{extractedStructure.uniqueSubtopics.size}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Unique Subtopics</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div className="space-y-2">
          {validationIssues.map((issue, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border",
                issue.type === 'error' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                issue.type === 'warning' && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
                issue.type === 'info' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              )}
            >
              {getIssueIcon(issue.type)}
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  issue.type === 'error' && "text-red-900 dark:text-red-100",
                  issue.type === 'warning' && "text-yellow-900 dark:text-yellow-100",
                  issue.type === 'info' && "text-blue-900 dark:text-blue-100"
                )}>
                  {issue.message}
                </p>
                {issue.field && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Field: {issue.field}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Structure Review Component */}
      {structureData && !hasErrors && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <ImportedStructureReview
            importedData={structureData}
            onComplete={handleStructureComplete}
            onStructureChange={handleStructureChange}
            className="border-0"
          />
        </div>
      )}

      {/* Raw Data Viewer */}
      {showRawData && (
        <CollapsibleSection
          title="Raw Imported Data"
          isExpanded={showRawData}
          onToggle={() => setShowRawData(!showRawData)}
        >
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
            <pre className="text-xs text-gray-700 dark:text-gray-300">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        </CollapsibleSection>
      )}

      {/* Completion Status */}
      {structureCreated && structureMetadata && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Academic structure configured successfully
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                All required entities have been created or mapped
              </p>
              {structureMetadata.dataStructureId && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Data Structure: {structureMetadata.program || 'Loading...'} → {structureMetadata.provider || 'Loading...'} → {structureMetadata.subject || 'Loading...'}
                  </p>
                  <p className="text-xs text-green-500 dark:text-green-500">
                    IDs: Program({structureMetadata.programId}) | Provider({structureMetadata.providerId}) | Subject({structureMetadata.subjectId})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={loading}
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={loading || !structureComplete || hasErrors}
          className="min-w-[120px]"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}