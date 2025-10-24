// src/app/system-admin/learning/practice-management/papers-setup/tabs/MetadataTab.tsx

/**
 * MetadataTab Component - PRODUCTION VERSION
 * 
 * Critical fixes applied:
 * 1. Entity IDs (program_id, provider_id, subject_id) properly extracted and saved
 * 2. Multi-source entity ID resolution with fallbacks
 * 3. Comprehensive validation before paper creation
 * 4. Enhanced error handling and logging
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, Save, ChevronRight, ChevronLeft, Loader2, 
  AlertCircle, CheckCircle, Info, Calendar, Clock, Hash,
  Book, Award, Building, MapPin, Search, Sparkles, Plus,
  Check, X, HelpCircle, Database
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { toast } from '../../../../../../components/shared/Toast';
import { Select } from '../../../../../../components/shared/Select';
import { CollapsibleSection } from '../../../../../../components/shared/CollapsibleSection';
import { supabase } from '../../../../../../lib/supabase';
import { cn } from '../../../../../../lib/utils';

interface MetadataTabProps {
  importSession: any;
  parsedData: any;
  onSave: (paperId: string, paperDetails: any) => void;
  onPrevious: () => void;
}

interface ExtractedMetadata {
  examBoard: string;
  qualification: string;
  subject: string;
  paperCode: string;
  paperName: string;
  examYear: number;
  examSession: string;
  paperDuration: string;
  totalMarks: number;
  subjectCode: string;
  paperNumber: string;
  variantNumber: string;
  paperType: string;
  provider: string;
  program: string;
  title: string;
  region?: string;
}

interface MatchingResult {
  dataStructureId: string | null;
  regionId: string | null;
  confidence: number;
  matchedOn: string[];
  suggestions: string[];
}

interface EntityIds {
  program_id?: string;
  provider_id?: string;
  subject_id?: string;
  region_id?: string;
  data_structure_id?: string;
}

// Provider mapping with variations
const PROVIDER_MAPPINGS: Record<string, string> = {
  'cambridge': 'Cambridge International (CIE)',
  'cie': 'Cambridge International (CIE)',
  'cambridge international': 'Cambridge International (CIE)',
  'cambridge assessment': 'Cambridge International (CIE)',
  'edexcel': 'Pearson Edexcel',
  'pearson': 'Pearson Edexcel',
  'pearson edexcel': 'Pearson Edexcel',
  'aqa': 'AQA',
  'ocr': 'OCR',
  'wjec': 'WJEC'
};

// Program mapping with variations
const PROGRAM_MAPPINGS: Record<string, string> = {
  'igcse': 'IGCSE',
  'international gcse': 'International GCSE',
  'gcse': 'GCSE',
  'a level': 'A Level',
  'a-level': 'A Level',
  'as level': 'AS Level',
  'as-level': 'AS Level',
  'ib': 'IB',
  'ap': 'AP'
};

// Session mapping
const SESSION_MAPPINGS: Record<string, string> = {
  'february/march': 'F/M',
  'feb/mar': 'F/M',
  'f/m': 'F/M',
  'may/june': 'M/J',
  'may/jun': 'M/J',
  'm/j': 'M/J',
  'october/november': 'O/N',
  'oct/nov': 'O/N',
  'o/n': 'O/N'
};

// Paper type detection keywords
const PAPER_TYPE_KEYWORDS = {
  'Multiple Choice': ['multiple choice', 'mcq', 'mc'],
  'Theory': ['theory', 'structured questions'],
  'Practical': ['practical', 'experimental'],
  'Alternative to Practical': ['alternative to practical', 'alternative practical', 'atp']
};

export function MetadataTab({ 
  importSession, 
  parsedData, 
  onSave, 
  onPrevious 
}: MetadataTabProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null);
  const [dataStructureId, setDataStructureId] = useState<string>('');
  const [regionId, setRegionId] = useState<string>('');
  const [status, setStatus] = useState<'draft' | 'active' | 'inactive'>('draft');
  const [notes, setNotes] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [dataStructures, setDataStructures] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [sessionEntityIds, setSessionEntityIds] = useState<EntityIds | null>(null);
  const [entityIdsStatus, setEntityIdsStatus] = useState<'loading' | 'found' | 'missing' | 'error'>('loading');

  useEffect(() => {
    if (parsedData) {
      extractMetadata();
      loadDataStructures();
      loadRegions();
    }
  }, [parsedData]);

  // Load entity IDs from import session
  useEffect(() => {
    if (importSession?.metadata?.entity_ids) {
      console.log('Found entity IDs in import session:', importSession.metadata.entity_ids);
      setSessionEntityIds(importSession.metadata.entity_ids);
      setEntityIdsStatus('found');
      
      if (importSession.metadata.entity_ids.data_structure_id) {
        setDataStructureId(importSession.metadata.entity_ids.data_structure_id);
        setRegionId(importSession.metadata.entity_ids.region_id || '');
      }
    } else if (importSession?.metadata?.academic_structure) {
      // Try to extract from academic structure
      const academicStructure = importSession.metadata.academic_structure;
      if (academicStructure?.entity_ids) {
        console.log('Found entity IDs in academic structure:', academicStructure.entity_ids);
        setSessionEntityIds(academicStructure.entity_ids);
        setEntityIdsStatus('found');
      } else {
        console.warn('No entity IDs found in import session');
        setEntityIdsStatus('missing');
      }
    } else {
      console.warn('No entity IDs found in import session');
      setEntityIdsStatus('missing');
    }
  }, [importSession]);

  // Normalize string for comparison
  const normalizeString = (str: string): string => {
    return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  };

  // Calculate similarity between two strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    const norm1 = normalizeString(str1);
    const norm2 = normalizeString(str2);
    
    if (norm1 === norm2) return 1;
    
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
    
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    const editDistance = getEditDistance(shorter, longer);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance for fuzzy matching
  const getEditDistance = (str1: string, str2: string): number => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  const extractMetadata = useCallback(() => {
    const errors: string[] = [];
    
    try {
      const extracted: ExtractedMetadata = {
        examBoard: parsedData.exam_board || '',
        qualification: parsedData.qualification || '',
        subject: parsedData.subject || '',
        paperCode: parsedData.paper_code || '',
        paperName: parsedData.paper_name || '',
        examYear: parseInt(parsedData.exam_year) || new Date().getFullYear(),
        examSession: parsedData.exam_session || '',
        paperDuration: parsedData.paper_duration || parsedData.duration || '',
        totalMarks: parseInt(parsedData.total_marks) || 0,
        subjectCode: '',
        paperNumber: '',
        variantNumber: '',
        paperType: '',
        provider: '',
        program: '',
        title: '',
        region: parsedData.region || parsedData.exam_region || ''
      };

      // Extract subject code from subject field
      const subjectMatch = extracted.subject.match(/(.+?)\s*[-–]\s*(\d+)$/);
      if (subjectMatch) {
        extracted.subject = subjectMatch[1].trim();
        extracted.subjectCode = subjectMatch[2];
      } else if (extracted.subject.match(/\((\d+)\)$/)) {
        const codeMatch = extracted.subject.match(/(.+?)\s*\((\d+)\)$/);
        if (codeMatch) {
          extracted.subject = codeMatch[1].trim();
          extracted.subjectCode = codeMatch[2];
        }
      }

      // Extract paper details from paper code
      const paperCodeParts = extracted.paperCode.split('/');
      if (paperCodeParts.length >= 2) {
        if (!extracted.subjectCode && paperCodeParts[0].match(/^\d+$/)) {
          extracted.subjectCode = paperCodeParts[0];
        }
        
        extracted.paperNumber = paperCodeParts[1];
        
        if (extracted.paperNumber.length >= 2) {
          extracted.variantNumber = extracted.paperNumber.slice(-1);
        }
      }

      // Determine paper type from paper name
      if (extracted.paperName) {
        const lowerPaperName = extracted.paperName.toLowerCase();
        let foundType = false;
        
        for (const [type, keywords] of Object.entries(PAPER_TYPE_KEYWORDS)) {
          if (keywords.some(keyword => lowerPaperName.includes(keyword))) {
            extracted.paperType = type;
            foundType = true;
            break;
          }
        }
        
        if (!foundType) {
          extracted.paperType = extracted.paperName;
        }
      }

      // Map exam board to provider with fuzzy matching
      const lowerBoard = extracted.examBoard.toLowerCase();
      let bestProviderMatch = '';
      let bestProviderScore = 0;
      
      for (const [key, value] of Object.entries(PROVIDER_MAPPINGS)) {
        const similarity = calculateSimilarity(lowerBoard, key);
        if (similarity > bestProviderScore) {
          bestProviderScore = similarity;
          bestProviderMatch = value;
        }
      }
      
      extracted.provider = bestProviderScore > 0.6 ? bestProviderMatch : extracted.examBoard;

      // Map qualification to program with fuzzy matching
      const lowerQual = extracted.qualification.toLowerCase();
      let bestProgramMatch = '';
      let bestProgramScore = 0;
      
      for (const [key, value] of Object.entries(PROGRAM_MAPPINGS)) {
        const similarity = calculateSimilarity(lowerQual, key);
        if (similarity > bestProgramScore) {
          bestProgramScore = similarity;
          bestProgramMatch = value;
        }
      }
      
      extracted.program = bestProgramScore > 0.6 ? bestProgramMatch : extracted.qualification;

      // Map session
      const lowerSession = extracted.examSession.toLowerCase();
      extracted.examSession = SESSION_MAPPINGS[lowerSession] || 
                              Object.entries(SESSION_MAPPINGS).find(([key]) => 
                                lowerSession.includes(key))?.[1] || 
                              extracted.examSession;

      // Generate title
      extracted.title = `${extracted.subject} - ${extracted.paperCode}/${extracted.examSession}/${extracted.examYear}`;

      // Validate required fields
      if (!extracted.examBoard) errors.push('Missing exam board');
      if (!extracted.qualification) errors.push('Missing qualification');
      if (!extracted.subject) errors.push('Missing subject');
      if (!extracted.paperCode) errors.push('Missing paper code');
      if (!extracted.examYear) errors.push('Missing exam year');
      if (!extracted.examSession) errors.push('Missing exam session');
      if (!extracted.totalMarks) errors.push('Missing total marks');

      setMetadata(extracted);
      setValidationErrors(errors);
    } catch (error) {
      console.error('Error extracting metadata:', error);
      errors.push('Failed to extract metadata from JSON');
      setValidationErrors(errors);
    }
  }, [parsedData]);

  const loadDataStructures = async () => {
    try {
      const { data, error } = await supabase
        .from('data_structures')
        .select(`
          id,
          status,
          program_id,
          provider_id,
          subject_id,
          region_id,
          regions!inner(id, name, code),
          programs!inner(id, name, code),
          providers!inner(id, name, code),
          edu_subjects!inner(id, name, code)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Loaded data structures with IDs:', data);
      setDataStructures(data || []);

      if (metadata && data && data.length > 0 && !manualOverride) {
        autoMatchDataStructure(data);
      }
    } catch (error) {
      console.error('Error loading data structures:', error);
      toast.error('Failed to load data structures');
    }
  };

  const loadRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  };

  // Auto-match data structure with fuzzy logic
  const autoMatchDataStructure = useCallback(async (structures: any[]) => {
    if (!metadata || !structures.length) return;
    
    setIsAutoMatching(true);
    
    try {
      let bestMatch: any = null;
      let bestScore = 0;
      const matchedOn: string[] = [];
      const suggestions: string[] = [];

      for (const ds of structures) {
        let score = 0;
        const currentMatchedOn: string[] = [];

        // Match by subject code (highest priority)
        if (metadata.subjectCode && ds.edu_subjects.code === metadata.subjectCode) {
          score += 0.4;
          currentMatchedOn.push(`Subject code: ${metadata.subjectCode}`);
        } else if (metadata.subject) {
          // Fuzzy match subject name
          const subjectSimilarity = calculateSimilarity(metadata.subject, ds.edu_subjects.name);
          if (subjectSimilarity > 0.7) {
            score += 0.3 * subjectSimilarity;
            currentMatchedOn.push(`Subject: ${ds.edu_subjects.name} (${Math.round(subjectSimilarity * 100)}% match)`);
          }
        }

        // Match provider
        const providerSimilarity = calculateSimilarity(metadata.provider, ds.providers.name);
        if (providerSimilarity > 0.8) {
          score += 0.3 * providerSimilarity;
          currentMatchedOn.push(`Provider: ${ds.providers.name}`);
        }

        // Match program
        const programSimilarity = calculateSimilarity(metadata.program, ds.programs.name);
        if (programSimilarity > 0.8) {
          score += 0.3 * programSimilarity;
          currentMatchedOn.push(`Program: ${ds.programs.name}`);
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = ds;
          matchedOn.length = 0;
          matchedOn.push(...currentMatchedOn);
        }
      }

      if (bestMatch && bestScore > 0.5) {
        setDataStructureId(bestMatch.id);
        setRegionId(bestMatch.regions.id);
        
        if (bestScore < 0.9) {
          if (metadata.subjectCode && bestMatch.edu_subjects.code !== metadata.subjectCode) {
            suggestions.push(`Subject code mismatch: expected "${metadata.subjectCode}", found "${bestMatch.edu_subjects.code}"`);
          }
          if (bestScore < 0.7) {
            suggestions.push('Consider creating a new data structure for better accuracy');
          }
        }

        setMatchingResult({
          dataStructureId: bestMatch.id,
          regionId: bestMatch.regions.id,
          confidence: bestScore,
          matchedOn,
          suggestions
        });
      } else {
        setShowCreateNew(true);
        setMatchingResult({
          dataStructureId: null,
          regionId: null,
          confidence: 0,
          matchedOn: [],
          suggestions: ['No matching data structure found. Consider creating a new one.']
        });
      }
    } catch (error) {
      console.error('Error auto-matching:', error);
    } finally {
      setIsAutoMatching(false);
    }
  }, [metadata]);

  // Re-run auto-matching when metadata changes
  useEffect(() => {
    if (metadata && dataStructures.length > 0 && !manualOverride) {
      autoMatchDataStructure(dataStructures);
    }
  }, [metadata, dataStructures, manualOverride, autoMatchDataStructure]);

  const handleDataStructureChange = (value: string) => {
    setDataStructureId(value);
    setManualOverride(true);
    
    const selectedDs = dataStructures.find(ds => ds.id === value);
    if (selectedDs) {
      setRegionId(selectedDs.regions.id);
    }
  };

  const getMatchConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    if (confidence >= 0.5) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMatchConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircle className="h-5 w-5" />;
    if (confidence >= 0.7) return <AlertCircle className="h-5 w-5" />;
    if (confidence >= 0.5) return <HelpCircle className="h-5 w-5" />;
    return <X className="h-5 w-5" />;
  };

  const handleSave = async () => {
    if (!metadata) {
      toast.error('No metadata to save');
      return;
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    if (!dataStructureId) {
      toast.error('Please select a data structure');
      return;
    }

    if (!regionId) {
      toast.error('Please select a region');
      return;
    }

    setSaving(true);
    try {
      // Get entity IDs from the selected data structure
      const selectedDataStructure = dataStructures.find(ds => ds.id === dataStructureId);
      if (!selectedDataStructure) {
        throw new Error('Selected data structure not found');
      }

      // Extract entity IDs with multiple fallback sources
      let program_id = selectedDataStructure.program_id || selectedDataStructure.programs?.id;
      let provider_id = selectedDataStructure.provider_id || selectedDataStructure.providers?.id;
      let subject_id = selectedDataStructure.subject_id || selectedDataStructure.edu_subjects?.id;
      let region_id = selectedDataStructure.region_id || regionId;

      // Fallback to session entity IDs if available
      if (!program_id && sessionEntityIds?.program_id) {
        program_id = sessionEntityIds.program_id;
        console.log('Using program_id from session:', program_id);
      }
      if (!provider_id && sessionEntityIds?.provider_id) {
        provider_id = sessionEntityIds.provider_id;
        console.log('Using provider_id from session:', provider_id);
      }
      if (!subject_id && sessionEntityIds?.subject_id) {
        subject_id = sessionEntityIds.subject_id;
        console.log('Using subject_id from session:', subject_id);
      }

      // Validate all required entity IDs are present
      if (!program_id || !provider_id || !subject_id) {
        const missing = [];
        if (!program_id) missing.push('program_id');
        if (!provider_id) missing.push('provider_id');
        if (!subject_id) missing.push('subject_id');
        
        throw new Error(`Cannot create paper: Missing entity IDs: ${missing.join(', ')}. Please ensure the data structure has all required entities.`);
      }

      console.log('Creating paper with entity IDs:', {
        program_id,
        provider_id,
        subject_id,
        region_id,
        data_structure_id: dataStructureId
      });

      // Create the paper record with all entity IDs
      const paperData = {
        paper_code: metadata.paperCode,
        subject_code: metadata.subjectCode,
        paper_number: metadata.paperNumber,
        variant_number: metadata.variantNumber,
        paper_type: metadata.paperType,
        exam_session: metadata.examSession,
        exam_year: metadata.examYear,
        
        // Entity IDs - Critical for database relationships
        program_id: program_id,
        provider_id: provider_id,
        subject_id: subject_id,
        region_id: region_id,
        data_structure_id: dataStructureId,
        
        // Text fields for display
        program: metadata.program,
        provider: metadata.provider,
        subject: metadata.subject,
        
        // Other fields
        title: metadata.title,
        duration: metadata.paperDuration,
        total_marks: metadata.totalMarks.toString(),
        status: status,
        notes: notes,
        
        // Add import session reference
        import_session_id: importSession?.id || null
      };

      // Check if paper with this code already exists
      const { data: existingPaper, error: checkError } = await supabase
        .from('papers_setup')
        .select('id')
        .eq('paper_code', metadata.paperCode)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let paper;
      let paperError;

      if (existingPaper) {
        // Update existing paper
        const { data: updatedPaper, error: updateError } = await supabase
          .from('papers_setup')
          .update(paperData)
          .eq('id', existingPaper.id)
          .select()
          .single();
        
        paper = updatedPaper;
        paperError = updateError;
        
        if (!paperError) {
          toast.info('Existing paper updated');
        }
      } else {
        // Insert new paper
        const { data: newPaper, error: insertError } = await supabase
          .from('papers_setup')
          .insert(paperData)
          .select()
          .single();
        
        paper = newPaper;
        paperError = insertError;
      }

      if (paperError) {
        console.error('Error saving paper:', paperError);
        
        if (paperError.message?.includes('null value in column')) {
          const details = paperError.details || paperError.message;
          throw new Error(`Database constraint violation: ${details}. Please ensure all required entity IDs are set.`);
        }
        throw paperError;
      }

      // Update import session with paper details and entity IDs
      const { error: sessionError } = await supabase
        .from('past_paper_import_sessions')
        .update({
          metadata: {
            ...importSession?.metadata,
            metadata_complete: true,
            paper_id: paper.id,
            paper_metadata: metadata,
            // Store entity IDs for downstream tabs
            entity_ids: {
              program_id,
              provider_id,
              subject_id,
              region_id,
              data_structure_id: dataStructureId
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', importSession.id);

      if (sessionError) {
        console.error('Error updating session:', sessionError);
        // Don't throw - paper was created successfully
      }

      toast.success('Paper metadata saved successfully');
      onSave(paper.id, paper);
    } catch (error: any) {
      console.error('Error saving metadata:', error);
      toast.error(error.message || 'Failed to save paper metadata');
    } finally {
      setSaving(false);
    }
  };

  if (!metadata) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Paper Metadata Configuration
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Review and configure the extracted paper metadata
        </p>
      </div>

      {/* Entity IDs Status */}
      {entityIdsStatus === 'found' && sessionEntityIds && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Entity IDs Available from Structure Tab
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-green-700 dark:text-green-300">
                {sessionEntityIds.program_id && <div>Program: {sessionEntityIds.program_id.substring(0, 8)}...</div>}
                {sessionEntityIds.provider_id && <div>Provider: {sessionEntityIds.provider_id.substring(0, 8)}...</div>}
                {sessionEntityIds.subject_id && <div>Subject: {sessionEntityIds.subject_id.substring(0, 8)}...</div>}
                {sessionEntityIds.data_structure_id && <div>Structure: {sessionEntityIds.data_structure_id.substring(0, 8)}...</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                Validation Issues
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Metadata Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
          <Info className="h-5 w-5" />
          Extracted Paper Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Award className="h-3 w-3" /> Exam Board
            </p>
            <p className="font-medium text-gray-900 dark:text-white">{metadata.examBoard}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">→ {metadata.provider}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Book className="h-3 w-3" /> Qualification
            </p>
            <p className="font-medium text-gray-900 dark:text-white">{metadata.qualification}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">→ {metadata.program}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Book className="h-3 w-3" /> Subject
            </p>
            <p className="font-medium text-gray-900 dark:text-white">{metadata.subject}</p>
            {metadata.subjectCode && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Code: {metadata.subjectCode}</p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Hash className="h-3 w-3" /> Paper Code
            </p>
            <p className="font-medium text-gray-900 dark:text-white">{metadata.paperCode}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Session/Year
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              {metadata.examSession} {metadata.examYear}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Duration
            </p>
            <p className="font-medium text-gray-900 dark:text-white">{metadata.paperDuration}</p>
          </div>
        </div>
      </div>

      {/* Auto-matching Status */}
      {matchingResult && (
        <div className={cn(
          "rounded-lg p-4 border",
          matchingResult.confidence >= 0.7 
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : matchingResult.confidence >= 0.5
            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
            : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
        )}>
          <div className="flex items-start gap-3">
            <div className={getMatchConfidenceColor(matchingResult.confidence)}>
              {getMatchConfidenceIcon(matchingResult.confidence)}
            </div>
            <div className="flex-1">
              <h4 className={cn(
                "text-sm font-medium mb-1",
                getMatchConfidenceColor(matchingResult.confidence)
              )}>
                {matchingResult.confidence >= 0.7 
                  ? 'Data Structure Matched' 
                  : matchingResult.confidence >= 0.5
                  ? 'Partial Match Found'
                  : 'No Match Found'}
                {matchingResult.confidence > 0 && (
                  <span className="ml-2 text-xs">
                    ({Math.round(matchingResult.confidence * 100)}% confidence)
                  </span>
                )}
              </h4>
              
              {matchingResult.matchedOn.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Matched on:</p>
                  <ul className="list-disc list-inside text-xs text-gray-700 dark:text-gray-300">
                    {matchingResult.matchedOn.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {matchingResult.suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Suggestions:</p>
                  <ul className="list-disc list-inside text-xs text-gray-700 dark:text-gray-300">
                    {matchingResult.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Fields */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Configuration Settings
        </h3>

        {/* Data Structure Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data Structure <span className="text-red-500">*</span>
          </label>
          <Select
            value={dataStructureId}
            onChange={handleDataStructureChange}
            placeholder="Select a data structure"
            options={dataStructures.map(ds => ({
              value: ds.id,
              label: `${ds.programs.name} - ${ds.providers.name} - ${ds.edu_subjects.name}`
            }))}
          />
          {!dataStructureId && showCreateNew && (
            <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              No matching data structure found. Please select one manually or create a new one.
            </p>
          )}
        </div>

        {/* Region Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Region <span className="text-red-500">*</span>
          </label>
          <Select
            value={regionId}
            onChange={setRegionId}
            placeholder="Select a region"
            options={regions.map(r => ({
              value: r.id,
              label: `${r.name} (${r.code})`
            }))}
          />
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <Select
            value={status}
            onChange={(value) => setStatus(value as 'draft' | 'active' | 'inactive')}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            placeholder="Add any additional notes about this paper..."
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={saving}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || validationErrors.length > 0 || !dataStructureId || !regionId}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}