/**
 * useMetadataProcessing Hook
 * Extracted metadata processing logic to reduce MetadataTab.tsx complexity
 * Handles validation, matching, and entity ID resolution
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../../../../lib/supabase';
import { toast } from '../../../../../../components/shared/Toast';

export interface ExtractedMetadata {
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

export interface EntityIds {
  program_id?: string;
  provider_id?: string;
  subject_id?: string;
  region_id?: string;
  data_structure_id?: string;
}

export interface MatchingResult {
  dataStructureId: string | null;
  regionId: string | null;
  confidence: number;
  matchedOn: string[];
  suggestions: string[];
}

export interface UseMetadataProcessingReturn {
  metadata: ExtractedMetadata | null;
  entityIds: EntityIds;
  matchingResult: MatchingResult | null;
  isProcessing: boolean;
  errors: string[];
  extractMetadata: (parsedData: any) => ExtractedMetadata;
  validateMetadata: (metadata: ExtractedMetadata) => string[];
  resolveEntityIds: (metadata: ExtractedMetadata) => Promise<EntityIds>;
  matchDataStructure: (metadata: ExtractedMetadata) => Promise<MatchingResult>;
  setMetadata: (metadata: ExtractedMetadata) => void;
  setEntityIds: (ids: EntityIds) => void;
}

// Provider mapping
const PROVIDER_MAPPINGS: Record<string, string> = {
  cambridge: 'Cambridge International (CIE)',
  cie: 'Cambridge International (CIE)',
  'cambridge international': 'Cambridge International (CIE)',
  edexcel: 'Pearson Edexcel',
  pearson: 'Pearson Edexcel',
  aqa: 'AQA',
  ocr: 'OCR',
  wjec: 'WJEC'
};

// Program mapping
const PROGRAM_MAPPINGS: Record<string, string> = {
  igcse: 'IGCSE',
  'international gcse': 'International GCSE',
  gcse: 'GCSE',
  'a level': 'A Level',
  'a-level': 'A Level',
  'as level': 'AS Level',
  ib: 'IB',
  ap: 'AP'
};

/**
 * Normalize text for comparison
 */
const normalizeText = (text: string): string => {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
};

/**
 * Extract metadata from parsed data
 */
const extractMetadataFromParsedData = (parsedData: any): ExtractedMetadata => {
  const examBoard = parsedData.exam_board || parsedData.examBoard || '';
  const qualification = parsedData.qualification || '';
  const subject = parsedData.subject || '';
  const paperCode = parsedData.paper_code || parsedData.paperCode || '';
  const paperName = parsedData.paper_name || parsedData.paperName || '';
  const examYear = parseInt(parsedData.exam_year || parsedData.examYear || '0');
  const examSession = parsedData.exam_session || parsedData.examSession || '';
  const paperDuration = parsedData.paper_duration || parsedData.paperDuration || '0';
  const totalMarks = parseInt(parsedData.total_marks || parsedData.totalMarks || '0');
  const subjectCode = parsedData.subject_code || parsedData.subjectCode || '';
  const paperNumber = parsedData.paper_number || parsedData.paperNumber || '';
  const variantNumber = parsedData.variant_number || parsedData.variantNumber || '';
  const paperType = parsedData.paper_type || parsedData.paperType || 'theory';
  const region = parsedData.region || '';

  const normalizedBoard = normalizeText(examBoard);
  const provider = PROVIDER_MAPPINGS[normalizedBoard] || examBoard;

  const normalizedQual = normalizeText(qualification);
  const program = PROGRAM_MAPPINGS[normalizedQual] || qualification;

  const title = `${examBoard} ${qualification} ${subject} ${paperCode} - ${examSession} ${examYear}`;

  return {
    examBoard,
    qualification,
    subject,
    paperCode,
    paperName,
    examYear,
    examSession,
    paperDuration,
    totalMarks,
    subjectCode,
    paperNumber,
    variantNumber,
    paperType,
    provider,
    program,
    title,
    region
  };
};

/**
 * Validate metadata completeness
 */
const validateMetadataCompleteness = (metadata: ExtractedMetadata): string[] => {
  const errors: string[] = [];

  if (!metadata.examBoard) errors.push('Exam board is required');
  if (!metadata.qualification) errors.push('Qualification is required');
  if (!metadata.subject) errors.push('Subject is required');
  if (!metadata.paperCode) errors.push('Paper code is required');
  if (!metadata.examYear || metadata.examYear < 1900) errors.push('Valid exam year is required');
  if (!metadata.examSession) errors.push('Exam session is required');
  if (!metadata.totalMarks || metadata.totalMarks <= 0) errors.push('Total marks must be greater than 0');

  return errors;
};

/**
 * Hook for metadata processing
 */
export function useMetadataProcessing(): UseMetadataProcessingReturn {
  const [metadata, setMetadataState] = useState<ExtractedMetadata | null>(null);
  const [entityIds, setEntityIdsState] = useState<EntityIds>({});
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const extractMetadata = useCallback((parsedData: any): ExtractedMetadata => {
    const extracted = extractMetadataFromParsedData(parsedData);
    setMetadataState(extracted);
    return extracted;
  }, []);

  const validateMetadata = useCallback((metadata: ExtractedMetadata): string[] => {
    const validationErrors = validateMetadataCompleteness(metadata);
    setErrors(validationErrors);
    return validationErrors;
  }, []);

  const resolveEntityIds = useCallback(async (metadata: ExtractedMetadata): Promise<EntityIds> => {
    setIsProcessing(true);
    const ids: EntityIds = {};

    try {
      // Resolve provider
      const { data: providers } = await supabase
        .from('edu_providers')
        .select('id, name')
        .ilike('name', `%${metadata.provider}%`)
        .limit(1)
        .single();

      if (providers) {
        ids.provider_id = providers.id;
      }

      // Resolve program
      const { data: programs } = await supabase
        .from('edu_programs')
        .select('id, name')
        .ilike('name', `%${metadata.program}%`)
        .limit(1)
        .single();

      if (programs) {
        ids.program_id = programs.id;
      }

      // Resolve subject
      const { data: subjects } = await supabase
        .from('edu_subjects')
        .select('id, name, code')
        .or(`name.ilike.%${metadata.subject}%,code.ilike.%${metadata.subjectCode}%`)
        .limit(1)
        .single();

      if (subjects) {
        ids.subject_id = subjects.id;
      }

      // Resolve region if provided
      if (metadata.region) {
        const { data: regions } = await supabase
          .from('edu_regions')
          .select('id, name')
          .ilike('name', `%${metadata.region}%`)
          .limit(1)
          .single();

        if (regions) {
          ids.region_id = regions.id;
        }
      }

      setEntityIdsState(ids);
      return ids;
    } catch (error) {
      console.error('Error resolving entity IDs:', error);
      toast.error('Failed to resolve some metadata entities');
      return ids;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const matchDataStructure = useCallback(async (metadata: ExtractedMetadata): Promise<MatchingResult> => {
    setIsProcessing(true);

    try {
      const { data: structures, error } = await supabase
        .from('edu_data_structures')
        .select('*')
        .or(`program_id.eq.${entityIds.program_id},provider_id.eq.${entityIds.provider_id},subject_id.eq.${entityIds.subject_id}`)
        .limit(10);

      if (error) throw error;

      let bestMatch: MatchingResult = {
        dataStructureId: null,
        regionId: null,
        confidence: 0,
        matchedOn: [],
        suggestions: []
      };

      if (structures && structures.length > 0) {
        // Simple matching logic - can be enhanced
        const match = structures[0];
        bestMatch = {
          dataStructureId: match.id,
          regionId: match.region_id || null,
          confidence: 0.8,
          matchedOn: ['program', 'provider', 'subject'],
          suggestions: []
        };
      }

      setMatchingResult(bestMatch);
      return bestMatch;
    } catch (error) {
      console.error('Error matching data structure:', error);
      return {
        dataStructureId: null,
        regionId: null,
        confidence: 0,
        matchedOn: [],
        suggestions: ['Could not find matching data structure']
      };
    } finally {
      setIsProcessing(false);
    }
  }, [entityIds]);

  const setMetadata = useCallback((newMetadata: ExtractedMetadata) => {
    setMetadataState(newMetadata);
  }, []);

  const setEntityIds = useCallback((ids: EntityIds) => {
    setEntityIdsState(ids);
  }, []);

  return {
    metadata,
    entityIds,
    matchingResult,
    isProcessing,
    errors,
    extractMetadata,
    validateMetadata,
    resolveEntityIds,
    matchDataStructure,
    setMetadata,
    setEntityIds
  };
}

export default useMetadataProcessing;
