// src/app/system-admin/learning/practice-management/papers-setup/components/PaperMetadataForm.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2, PlusCircle, AlertCircle, FileText, ChevronDown, ChevronUp, Bug, Info } from 'lucide-react';
import { FormField, Input, Textarea, Select } from '../../../../../../components/shared/FormField';
import { Button } from '../../../../../../components/shared/Button'; 
import { toast } from 'react-hot-toast';
import { DataStructureSelector } from './components/DataStructureSelector';
import { PaperDetailsForm } from './components/PaperDetailsForm';
import { StatusSelector } from './components/StatusSelector';
import { CollapsibleSection } from '../../../../../../components/shared/CollapsibleSection';
import { supabase } from '../../../../../../lib/supabase';
import { cn } from '../../../../../../lib/utils';

// Define the schema for data structure creation
const dataStructureSchema = z.object({
  region_id: z.string().uuid('Please select a region'),
  program_id: z.string().uuid('Please select a program'),
  provider_id: z.string().uuid('Please select a provider'),
  subject_id: z.string().uuid('Please select a subject'),
  status: z.enum(['active', 'inactive'])
});

// Define the form state interface
interface PaperMetadataFormState {
  title: string;
  data_structure_id: string;
  paper_code: string;
  paper_number: string;
  variant_number: string;
  paper_type: string;
  exam_year: string | number;
  exam_session: string;
  subject: string;
  program: string;
  provider: string;
  subject_code: string;
  duration: string;
  total_marks: string | number;
  notes: string;
  status: 'active' | 'inactive' | 'draft';
  // Fields for creating a new data structure
  new_region_id: string;
  new_program_id: string;
  new_provider_id: string;
  new_subject_id: string;
}

// Define the validation schema
const paperMetadataSchema = z.object({
  title: z.string().optional(),
  data_structure_id: z.string().min(1, 'Please select an academic structure'),
  paper_code: z.string().min(1, 'Paper code is required').trim(),
  paper_number: z.string().min(1, 'Paper number is required').trim(),
  variant_number: z.string().optional(),
  exam_session: z.string().min(1, 'Exam session is required').trim(),
  exam_year: z.union([
    z.number().min(2000, 'Year must be 2000 or later').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
    z.string().transform(val => {
      const parsed = parseInt(val);
      if (isNaN(parsed)) throw new Error('Year must be a valid number');
      return parsed;
    }).refine(val => val >= 2000 && val <= new Date().getFullYear() + 1, 'Year must be between 2000 and the current year')
  ]),
  subject: z.string().optional(),
  program: z.string().optional(),
  provider: z.string().optional(),
  subject_code: z.string().optional(),
  duration: z.string().optional(),
  total_marks: z.union([z.number(), z.string().transform(val => val === '' ? undefined : parseInt(val))]).optional(),
  paper_type: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']),
  // Fields for creating a new data structure
  new_region_id: z.string().optional(),
  new_program_id: z.string().optional(),
  new_provider_id: z.string().optional(),
  new_subject_id: z.string().optional(),
});

interface PaperMetadataFormProps {
  dataStructures: any[];
  paperDetails: any;
  importSession?: any;
  parsedData?: any;
  isLoading?: boolean;
  onPaperFound: (paperId: string) => void;
  onPrevious: () => void;
  onContinue: () => void;
}

export function PaperMetadataForm({
  dataStructures,
  paperDetails,
  importSession,
  parsedData,
  isLoading = false,
  onPaperFound,
  onPrevious,
  onContinue
}: PaperMetadataFormProps) {
  const queryClient = useQueryClient();
  const [showDebug, setShowDebug] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    metadata: true,
    structure: true,
    summary: true,
    advanced: false
  });
  
  const [formData, setFormData] = useState<PaperMetadataFormState>({
    title: '',
    data_structure_id: '',
    paper_code: '',
    paper_number: '',
    variant_number: '',
    paper_type: 'Both QP and MS',
    exam_year: '',
    exam_session: '',
    subject: '',
    program: '',
    provider: '',
    subject_code: '',
    duration: '',
    total_marks: '',
    notes: '',
    status: 'draft',
    new_region_id: '',
    new_program_id: '',
    new_provider_id: '',
    new_subject_id: '',
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [matchingDataStructureFound, setMatchingDataStructureFound] = useState<boolean | null>(null);
  const [isCreatingDataStructure, setIsCreatingDataStructure] = useState(false);
  const [showDataStructureForm, setShowDataStructureForm] = useState(false);
  const [findingDataStructure, setFindingDataStructure] = useState(false);
  const [createNewStructureMode, setCreateNewStructureMode] = useState(false);
  const [selectedDataStructure, setSelectedDataStructure] = useState<any>(null);
  
  const [newStructureData, setNewStructureData] = useState<{
    regions: any[];
    programs: any[];
    providers: any[];
    subjects: any[];
  }>({
    regions: [],
    programs: [],
    providers: [],
    subjects: []
  });

  // Define session options for the dropdown
  const sessionOptions = [
    { value: 'February/March', label: 'February/March' },
    { value: 'May/June', label: 'May/June' },
    { value: 'October/November', label: 'October/November' },
  ];

  // State for distinct values from questions
  const [distinctValues, setDistinctValues] = useState<{
    units: string[];
    topics: string[];
    subtopics: string[];
  }>({
    units: [],
    topics: [],
    subtopics: []
  });

  // New state for data structure creation form
  const [newDataStructure, setNewDataStructure] = useState({
    region_id: '',
    program_id: '',
    provider_id: '',
    subject_id: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [newDataStructureErrors, setNewDataStructureErrors] = useState<Record<string, string>>({});

  // Helper function to extract field from parsedData with fallbacks
  const extractField = useCallback((fieldName: string, defaultValue: any = '') => {
    if (!parsedData) return defaultValue;
    
    // First check at root level
    if (parsedData[fieldName] !== undefined && parsedData[fieldName] !== null) {
      return parsedData[fieldName];
    }
    
    // Then check in paper_metadata if it exists
    if (parsedData.paper_metadata && parsedData.paper_metadata[fieldName] !== undefined) {
      return parsedData.paper_metadata[fieldName];
    }
    
    // For subject, program, provider - check in first question
    if (['subject', 'program', 'provider'].includes(fieldName) && 
        parsedData.questions && 
        parsedData.questions.length > 0 && 
        parsedData.questions[0][fieldName] !== undefined) {
      return parsedData.questions[0][fieldName];
    }
    
    // For subject, program, provider - check in question_analysis
    if (['subject', 'program', 'provider'].includes(fieldName) && 
        parsedData?.question_analysis && 
        parsedData.question_analysis.length > 0 && 
        parsedData.question_analysis[0][fieldName] !== undefined) {
      return parsedData.question_analysis[0][fieldName];
    }
    
    return defaultValue;
  }, [parsedData]);

  // Function to map full session name to abbreviated code
  const mapSessionToCode = (sessionName: string): string => {
    const sessionMap: Record<string, string> = {
      'February/March': 'F/M',
      'May/June': 'M/J',
      'October/November': 'O/N',
      'Feb/Mar': 'F/M',
      'May/Jun': 'M/J',
      'Oct/Nov': 'O/N',
      'F/M': 'F/M',
      'M/J': 'M/J',
      'O/N': 'O/N'
    };
    
    if (sessionMap[sessionName]) {
      return sessionMap[sessionName];
    }
    
    for (const [key, value] of Object.entries(sessionMap)) {
      if (sessionName.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return sessionName;
  };

  // Function to extract paper type from paper number
  const extractPaperType = (paperNumber: string): string => {
    if (!paperNumber || paperNumber.length === 0) return '';
    
    const firstDigit = paperNumber.charAt(0);
    switch (firstDigit) {
      case '1': return 'MCQ';
      case '2':
      case '3':
      case '4':
      case '5':
      case '6': return 'Complex';
      default: return 'Unknown';
    }
  };

  // Function to extract variant number from paper number
  const extractVariantNumber = (paperNumber: string): string => {
    if (!paperNumber || paperNumber.length < 2) return '';
    return paperNumber.charAt(1);
  };

  // Fetch regions, programs, providers, and subjects for data structure creation
  const { data: fetchedRegions = [] } = useQuery(
    ['regions'],
    async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000,
    }
  );

  const { data: fetchedPrograms = [] } = useQuery(
    ['programs'],
    async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000,
    }
  );

  const { data: fetchedProviders = [] } = useQuery(
    ['providers'],
    async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000,
    }
  );

  const { data: fetchedSubjects = [] } = useQuery(
    ['edu-subjects'],
    async () => {
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000,
    }
  );

  // Update newStructureData when queries complete
  useEffect(() => {
    if (createNewStructureMode) {
      setNewStructureData({
        regions: fetchedRegions,
        programs: fetchedPrograms,
        providers: fetchedProviders,
        subjects: fetchedSubjects
      });
    }
  }, [createNewStructureMode, fetchedRegions, fetchedPrograms, fetchedProviders, fetchedSubjects]);

  // Format data structures for dropdown
  const dataStructureOptions = useMemo(() => {
    return dataStructures.map(ds => ({
      value: ds.id,
      label: `${ds.edu_subjects?.name || 'Unknown Subject'}`,
      region: ds.regions?.name || 'Unknown Region',
      program: ds.programs?.name || 'Unknown Program',
      provider: ds.providers?.name || 'Unknown Provider',
      subject: ds.edu_subjects?.name || 'Unknown Subject'
    }));
  }, [dataStructures]);

  // Extract metadata from parsed data for data structure creation
  const extractedMetadata = useMemo(() => {
    const metadata = parsedData?.paper_metadata || {};
    const questions = parsedData?.questions || parsedData?.question_analysis || [];
    const paper = paperDetails || {};
    
    // Get unique units, topics, and subtopics from questions
    const units = Array.from(new Set(questions.map((q: any) => q.unit).filter(Boolean)));
    const topics = Array.from(new Set(questions.map((q: any) => q.topic).filter(Boolean)));
    const subtopics = Array.from(new Set(questions.map((q: any) => q.subtopic).filter(Boolean)));
    
    // Extract subject code from paper code
    let subjectCode = metadata.subject_code || paper.subject_code || '';
    if (!subjectCode && metadata.paper_code) {
      const parts = metadata.paper_code.split(/[\/\-]/);
      if (parts.length >= 1) {
        subjectCode = parts[0];
      }
    }
    
    const providerName = metadata.exam_board || metadata.provider || 
                         questions[0]?.provider || paper.provider_name || '';
    const programName = metadata.qualification_type || metadata.program || 
                        questions[0]?.program || metadata.course_level || 'IGCSE';
    const regionName = metadata.region || paper.region_name || 'International';
    const subjectName = metadata.subject || questions[0]?.subject || '';
    
    return {
      subjectCode,
      providerName,
      programName,
      regionName,
      subjectName,
      units,
      topics,
      subtopics
    };
  }, [parsedData, paperDetails]);

  // Extract distinct values from questions
  useEffect(() => {
    if (parsedData) {
      const questions = parsedData?.questions || parsedData?.question_analysis || [];
      
      const units = Array.from(new Set(questions.map((q: any) => q.unit).filter(Boolean)));
      const topics = Array.from(new Set(questions.map((q: any) => q.topic).filter(Boolean)));
      const subtopics = Array.from(new Set(questions.map((q: any) => q.subtopic).filter(Boolean)));
      
      setDistinctValues({
        units,
        topics,
        subtopics
      });
    }
  }, [parsedData]);

  // Pre-fill data structure form based on extracted metadata
  useEffect(() => {
    if (showDataStructureForm && extractedMetadata) {
      const matchingRegion = newStructureData.regions.find(r => 
        r.name.toLowerCase() === extractedMetadata.regionName.toLowerCase()
      );
      
      const matchingProgram = newStructureData.programs.find(p => 
        p.name.toLowerCase() === extractedMetadata.programName.toLowerCase()
      );
      
      const matchingProvider = newStructureData.providers.find(p => 
        p.name.toLowerCase() === extractedMetadata.providerName.toLowerCase()
      );
      
      const matchingSubject = newStructureData.subjects.find(s => 
        s.code === extractedMetadata.subjectCode
      );
      
      setNewDataStructure({
        region_id: matchingRegion?.id || '',
        program_id: matchingProgram?.id || '',
        provider_id: matchingProvider?.id || '',
        subject_id: matchingSubject?.id || '',
        status: 'active'
      });
    }
  }, [showDataStructureForm, extractedMetadata, newStructureData]);

  // Initialize form data from parsed data and paper details
  useEffect(() => {
    const metadata = parsedData?.paper_metadata || {};
    const paper = paperDetails || {};
    const questions = parsedData?.questions || parsedData?.question_analysis || [];
    const currentYear = new Date().getFullYear();

    // Determine paper code components
    let paperCode = paper.paper_code || metadata.paper_code || parsedData?.paper_code || '';
    let paperNumber = paper.paper_number || metadata.paper_number || '';
    let variantNumber = paper.variant_number || metadata.variant_number || '';
    let title = paper.title || metadata.title || metadata.paper_title || '';
    let totalMarks = paper.total_marks || metadata.total_marks || parsedData?.total_marks || '';
    let notes = paper.notes || metadata.notes || metadata.description || '';
    let paperType = paper.paper_type || metadata.paper_type || 'Both QP and MS';
    
    // Extract subject, program, provider from questions or metadata
    let subject = '';
    let program = '';
    let provider = '';
    
    if (questions.length > 0) {
      subject = questions[0].subject || metadata.subject || '';
      program = questions[0].program || metadata.program || metadata.qualification_type || 'IGCSE';
      provider = questions[0].provider || metadata.provider || metadata.exam_board || 'Cambridge International (CIE)';
    } else {
      subject = metadata.subject || '';
      program = metadata.program || metadata.qualification_type || 'IGCSE';
      provider = metadata.provider || metadata.exam_board || 'Cambridge International (CIE)';
    }
    
    // Extract from paper_code if components not set
    if (paperCode && !paperNumber) {
      const parts = paperCode.split('/');
      if (parts.length >= 2) {
        paperNumber = parts[1];
      }
    }
    
    // Extract variant number from paper number
    if (paperNumber && !variantNumber) {
      variantNumber = extractVariantNumber(paperNumber);
    }
    
    // Extract exam session and year
    let examSession = parsedData?.exam_session || metadata.exam_session || paper.exam_session || '';
    let examYear = parsedData?.exam_year || metadata.exam_year || paper.exam_year || '';
    
    // Parse duration
    let duration = parsedData?.duration || parsedData?.paper_duration || metadata.duration || paper.duration || '';
    
    // Format exam year if needed
    if (examYear && String(examYear).length === 2) {
      examYear = `20${examYear}`;
    }
    
    if (!examYear) {
      examYear = currentYear.toString();
    }
    
    // Extract subject code
    let subjectCode = metadata.subject_code || paper.subject_code || '';
    if (!subjectCode && paperCode) {
      const parts = paperCode.split(/[\/\-]/);
      if (parts.length >= 1) {
        subjectCode = parts[0];
      }
    }
    
    // Generate title if not set
    if (!title && subject && paperCode && examSession && examYear) {
      const sessionCode = mapSessionToCode(examSession);
      const basePaperCode = paperCode.split('/').slice(0, 2).join('/');
      title = `${subject} - ${basePaperCode}/${sessionCode}/${examYear}`;
    }
    
    // Determine paper type from paper number
    const extractedPaperType = paperNumber ? extractPaperType(paperNumber) : '';
    
    // Create new form data object with all extracted values
    setFormData(prev => ({
      data_structure_id: paper.data_structure_id || prev.data_structure_id,
      title,
      paper_code: paperCode,
      paper_number: paperNumber,
      variant_number: variantNumber,
      paper_type: extractedPaperType || paperType,
      exam_year: examYear,
      exam_session: examSession,
      subject,
      program,
      provider,
      subject_code: subjectCode,
      duration,
      total_marks: totalMarks,
      notes,
      status: paper.status || 'draft',
      new_region_id: prev.new_region_id,
      new_program_id: prev.new_program_id,
      new_provider_id: prev.new_provider_id,
      new_subject_id: prev.new_subject_id
    }));
  }, [parsedData, paperDetails]);

  // Find matching data structure
  const findMatchingDataStructure = useCallback(async (program: string, provider: string, subject: string) => {
    try {
      console.log('Finding matching data structure for:', { program, provider, subject });
      setFindingDataStructure(true);
      
      // Extract subject code if subject is in format "Name - Code"
      let subjectCode = '';
      let subjectName = subject;
      if (subject.includes(' - ')) {
        const parts = subject.split(' - ');
        subjectName = parts[0].trim();
        subjectCode = parts[1].trim();
      }
      
      // First, find the subject ID
      let subjectId = '';
      if (subjectCode) {
        const { data: subjectByCode, error: codeError } = await supabase
          .from("edu_subjects")
          .select("id")
          .eq('code', subjectCode)
          .single();
        
        if (subjectByCode && !codeError) {
          subjectId = subjectByCode.id;
        }
      }
      
      if (!subjectId) {
        const { data: subjectByName, error: nameError } = await supabase
          .from("edu_subjects")
          .select("id")
          .ilike('name', `%${subjectName}%`)
          .single();
        
        if (subjectByName && !nameError) {
          subjectId = subjectByName.id;
        }
      }
      
      if (!subjectId) {
        console.warn('Subject not found:', { subjectName, subjectCode });
        setMatchingDataStructureFound(false);
        return;
      }
      
      // Now find the matching data structure
      const matchingStructure = dataStructures.find(ds => {
        const programMatch = ds.programs?.name?.toLowerCase() === program.toLowerCase();
        const providerMatch = ds.providers?.name?.toLowerCase().includes(provider.toLowerCase()) || 
                             provider.toLowerCase().includes(ds.providers?.name?.toLowerCase());
        const subjectMatch = ds.edu_subjects?.id === subjectId;
        
        return programMatch && providerMatch && subjectMatch;
      });
      
      if (matchingStructure) {
        console.log('Found matching structure:', matchingStructure);
        setFormData(prev => ({
          ...prev,
          data_structure_id: matchingStructure.id
        }));
        setSelectedDataStructure(matchingStructure);
        setMatchingDataStructureFound(true);
      } else {
        console.log('No matching structure found');
        setMatchingDataStructureFound(false);
      }
      
    } catch (error) {
      console.error('Error finding matching data structure:', error);
      setMatchingDataStructureFound(false);
    } finally {
      setFindingDataStructure(false);
    }
  }, [dataStructures]);

  // Auto-select matching data structure
  useEffect(() => {
    if (parsedData && dataStructures.length > 0 && !formData.data_structure_id) {
      const program = extractField('program', 'IGCSE');
      const provider = extractField('provider', 'Cambridge International (CIE)');
      const subject = extractField('subject', '');
      
      if (program && provider && subject) {
        setTimeout(() => {
          findMatchingDataStructure(program, provider, subject);
        }, 100);
      }
    }
  }, [parsedData, dataStructures.length, formData.data_structure_id, findMatchingDataStructure, extractField]);

  // Handle form field changes with enhanced logic
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      
      // If changing paper_code, update related fields
      if (field === 'paper_code') {
        const parts = value.split('/');
        if (parts.length >= 2) {
          newState.paper_number = parts[1];
          // Extract variant number from paper number
          if (parts[1] && parts[1].length >= 2) {
            newState.variant_number = parts[1].charAt(1);
          }
          newState.paper_type = extractPaperType(parts[1]);
          newState.subject_code = parts[0];
          
          // Update title if we have enough information
          if (newState.subject && newState.exam_session && newState.exam_year) {
            const sessionCode = mapSessionToCode(newState.exam_session);
            newState.title = `${newState.subject} - ${parts[0]}/${parts[1]}/${sessionCode}/${newState.exam_year}`;
          }
        }
      }
      
      // If changing subject, exam_session, or exam_year, update title and paper code
      if (['subject', 'exam_session', 'exam_year'].includes(field)) {
        const subject = field === 'subject' ? value : newState.subject;
        const examSession = field === 'exam_session' ? value : newState.exam_session;
        const examYear = field === 'exam_year' ? value : newState.exam_year;
        
        if (newState.paper_code && newState.paper_number && examYear) {
          const baseParts = newState.paper_code.split('/');
          if (baseParts.length >= 2) {
            newState.paper_code = `${baseParts[0]}/${baseParts[1]}/${examYear}`;
          }
        }
        
        if (subject && newState.paper_code && examSession && examYear) {
          const sessionCode = mapSessionToCode(examSession);
          const basePaperCode = newState.paper_code.split('/').slice(0, 2).join('/');
          newState.title = `${subject} - ${basePaperCode}/${sessionCode}/${examYear}`;
        }
      }
      
      return newState;
    });
    
    // Clear any existing error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  }, [formErrors]);

  // Handle data structure change
  const handleDataStructureChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, data_structure_id: value }));
    
    if (!value) {
      setSelectedDataStructure(null);
      setMatchingDataStructureFound(null);
      return;
    }
    
    const selected = dataStructures.find(ds => ds.id === value);
    if (selected) {
      setSelectedDataStructure(selected);
      setMatchingDataStructureFound(true);
      
      // Update form data with values from the selected data structure
      setFormData(prev => ({
        ...prev,
        subject: selected.edu_subjects?.name || prev.subject,
        program: selected.programs?.name || prev.program,
        provider: selected.providers?.name || prev.provider,
        subject_code: selected.edu_subjects?.code || prev.subject_code,
      }));
    }
  }, [dataStructures]);

  // Handle data structure form field changes
  const handleDataStructureFieldChange = useCallback((field: string, value: string) => {
    setNewDataStructure(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Mutation to create a new data structure
  const createDataStructureMutation = useMutation(
    async (data: typeof newDataStructure) => {
      try {
        const validatedData = dataStructureSchema.parse(data);
        
        // Check if this combination already exists
        const { data: existingStructure, error: checkError } = await supabase
          .from('data_structures')
          .select('id')
          .eq('region_id', validatedData.region_id)
          .eq('program_id', validatedData.program_id)
          .eq('provider_id', validatedData.provider_id)
          .eq('subject_id', validatedData.subject_id)
          .maybeSingle();
        
        if (checkError) throw checkError;
        
        if (existingStructure) {
          return existingStructure.id;
        }
        
        // Create new data structure
        const { data: newStructure, error } = await supabase
          .from('data_structures')
          .insert([validatedData])
          .select()
          .single();
        
        if (error) throw error;
        return newStructure.id;
      } catch (error) {
        console.error('Error creating data structure:', error);
        throw error;
      }
    },
    {
      onSuccess: (dataStructureId) => {
        queryClient.invalidateQueries(['data-structures-for-metadata']);
        toast.success('Academic structure created successfully');
        
        setFormData(prev => ({ ...prev, data_structure_id: dataStructureId }));
        setMatchingDataStructureFound(true);
        setShowDataStructureForm(false);
        setIsCreatingDataStructure(false);
      },
      onError: (error: any) => {
        console.error('Error creating data structure:', error);
        
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach(err => {
            if (err.path.length > 0) {
              errors[err.path[0]] = err.message;
            }
          });
          setNewDataStructureErrors(errors);
        } else {
          toast.error(error.message || 'Failed to create academic structure');
          setNewDataStructureErrors({ form: error.message || 'Failed to create academic structure' });
        }
        
        setIsCreatingDataStructure(false);
      }
    }
  );

  // Create a new data structure
  const handleCreateDataStructure = async () => {
    const { new_region_id, new_program_id, new_provider_id, new_subject_id } = formData;

    if (!new_region_id || !new_program_id || !new_provider_id || !new_subject_id) {
      toast.error("Please select all fields to create structure.");
      return;
    }

    const { data: existingStructure, error: checkError } = await supabase
      .from("data_structures")
      .select("id")
      .eq("region_id", new_region_id)
      .eq("program_id", new_program_id)
      .eq("provider_id", new_provider_id)
      .eq("subject_id", new_subject_id)
      .maybeSingle();

    if (checkError) {
      toast.error("Failed to check for existing structure");
      return;
    }

    if (existingStructure?.id) {
      setFormData(prev => ({
        ...prev,
        data_structure_id: existingStructure.id
      }));
      toast.success("Existing academic structure found and assigned.");
      setCreateNewStructureMode(false);
      return;
    }

    const { data, error } = await supabase
      .from("data_structures")
      .insert({
        region_id: new_region_id,
        program_id: new_program_id,
        provider_id: new_provider_id,
        subject_id: new_subject_id,
        status: "active"
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      toast.error("Failed to create structure");
      return;
    }

    setFormData(prev => ({
      ...prev,
      data_structure_id: data.id
    }));
    toast.success("Academic structure created and assigned.");
    setCreateNewStructureMode(false);
  };

  // Mutation to save paper metadata
  const savePaperMutation = useMutation(
    async (data: typeof formData) => {
      if (!importSession?.id) {
        throw new Error('No active import session');
      }

      try {
        const selectedDs = dataStructures.find(ds => ds.id === data.data_structure_id);
        
        if (!selectedDs) {
          throw new Error('Selected data structure not found. Please select a valid academic structure.');
        }

        const {
          region_id,
          program_id,
          provider_id,
          edu_subjects: { id: subject_id }
        } = selectedDs;

        // Prepare paper data
        const paperData = {
          import_session_id: importSession.id,
          data_structure_id: data.data_structure_id,
          title: data.title || `${data.subject} - ${data.paper_code}/${data.exam_session}/${data.exam_year}`,
          paper_code: data.paper_code,
          paper_number: data.paper_number,
          variant_number: data.variant_number || '',
          paper_type: data.paper_type || 'Both QP and MS',
          exam_year: parseInt(String(data.exam_year)),
          exam_session: data.exam_session,
          subject: data.subject,
          program: data.program,
          provider: data.provider,
          subject_code: data.subject_code || '',
          duration: data.duration || '',
          total_marks: data.total_marks ? parseInt(String(data.total_marks)) : null,
          notes: data.notes || '',
          status: data.status || 'draft',
          region_id,
          program_id,
          provider_id,
          subject_id
        };

        // Check if we already have a paper record
        if (paperDetails?.id) {
          const { error } = await supabase
            .from('papers_setup')
            .update(paperData)
            .eq('id', paperDetails.id);

          if (error) throw error;
          
          toast.success('Paper metadata updated successfully');
          onContinue();
        } else {
          const { data: newPaper, error } = await supabase
            .from('papers_setup')
            .insert(paperData)
            .select()
            .single();

          if (error) throw error;
          
          toast.success('Paper metadata saved successfully');
          onContinue();
        }
      } catch (error) {
        console.error('Error saving paper metadata:', error);
        throw error;
      }
    },
    {
      onSuccess: () => {
        setIsSaving(false);
      },
      onError: (error: any) => {
        console.error('Error saving paper metadata:', error);
        setIsSaving(false);
        toast.error(error.message || 'Failed to save paper metadata');
      }
    }
  );

  // Handle form submission
  const handleSubmit = async () => {
    setFormErrors({});

    try {
      const validatedData = {
        ...formData,
        exam_year: typeof formData.exam_year === 'string' ? 
                   (parseInt(formData.exam_year) || 2023) : 
                   (formData.exam_year || 2023),
        total_marks: formData.total_marks ? 
                     (typeof formData.total_marks === 'string' ? 
                      parseInt(formData.total_marks) : 
                      formData.total_marks) : 
                     undefined,
        paper_type: formData.paper_type || 'Both QP and MS'
      };
      
      const data = paperMetadataSchema.parse(validatedData);
      
      if (!data.data_structure_id) {
        throw new Error('Please select an academic structure');
      }
      
      // Check if paper with this code already exists (only for new papers)
      if (!paperDetails?.id) {
        const { data: existingPaper, error: checkError } = await supabase
          .from('papers_setup')
          .select('id')
          .eq('paper_code', data.paper_code)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error checking for existing paper:', checkError);
        }
        
        if (existingPaper) {
          toast.info('Paper with this code already exists. Loading existing paper for review.');
          onPaperFound(existingPaper.id);
          return;
        }
      }
      
      setIsSaving(true);
      await savePaperMutation.mutateAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setFormErrors(errors);
        toast.error('Please fix validation errors');
      } else {
        console.error('Form submission error:', error);
        
        let errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to save paper metadata';
        
        if (errorMessage.includes('duplicate key value') || 
            errorMessage.includes('papers_setup_paper_code_key')) {
          
          const { data: existingPaper, error: fetchError } = await supabase
            .from('papers_setup')
            .select('id')
            .eq('paper_code', formData.paper_code)
            .maybeSingle();
          
          if (!fetchError && existingPaper) {
            const confirmView = window.confirm(
              'A paper with this code already exists. Would you like to view it?'
            );
            
            if (confirmView) {
              onPaperFound(existingPaper.id);
              return;
            }
          }
          
          errorMessage = 'A paper with this code already exists. Please use a different code.';
        }
        
        setFormErrors({ form: errorMessage });
        toast.error(errorMessage);
      }
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Debug info - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md mb-4 text-xs">
          <details>
            <summary className="cursor-pointer font-medium">Debug: Parsed Data</summary>
            <pre className="mt-2 overflow-auto max-h-40">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </details>
        </div>
      )}
      
      {/* Paper Details Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Paper Details</h3>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Paper Metadata
          </h2>
          
          {/* Metadata Summary Card */}
          {parsedData && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
              <h3 className="text-md font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Extracted Metadata Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Paper Code:</span>{' '}
                  <span className="text-blue-900 dark:text-blue-100">{extractField('paper_code', 'Not found')}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Year:</span>{' '}
                  <span className="text-blue-900 dark:text-blue-100">{extractField('exam_year', 'Not found')}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Session:</span>{' '}
                  <span className="text-blue-900 dark:text-blue-100">{extractField('exam_session', 'Not found')}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Subject:</span>{' '}
                  <span className="text-blue-900 dark:text-blue-100">{extractField('subject', 'Not found')}</span>
                </div>
                {extractField('duration') && (
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-400">Duration:</span>{' '}
                    <span className="text-blue-900 dark:text-blue-100">{extractField('duration')}</span>
                  </div>
                )}
                {extractField('total_marks') && (
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-400">Total Marks:</span>{' '}
                    <span className="text-blue-900 dark:text-blue-100">{extractField('total_marks')}</span>
                  </div>
                )}
              </div>
              {findingDataStructure && (
                <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching for matching academic structure...
                </div>
              )}
            </div>
          )}

          {/* Collapsible section for distinct values */}
          <CollapsibleSection
            id="distinct-values-section"
            title="Content Summary"
            isOpen={expandedSections.summary}
            onToggle={() => setExpandedSections(prev => ({ ...prev, summary: !prev.summary }))}
            className="mb-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700"
          >
            <div className="space-y-4 p-4">
              {distinctValues.units.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">Units ({distinctValues.units.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {distinctValues.units.map((unit, index) => (
                      <span key={index} className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-sm">
                        {unit}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {distinctValues.topics.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">Topics ({distinctValues.topics.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {distinctValues.topics.map((topic, index) => (
                      <span key={index} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-sm">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {distinctValues.subtopics.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">Subtopics ({distinctValues.subtopics.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {distinctValues.subtopics.map((subtopic, index) => (
                      <span key={index} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm">
                        {subtopic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {showDataStructureForm ? (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">Create New Academic Structure</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                  Create a new academic structure to link with this paper. This will be reusable for future papers.
                </p>

                {newDataStructureErrors.form && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md flex items-center border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {newDataStructureErrors.form}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      id="region_id"
                      label="Region"
                      required
                      error={newDataStructureErrors.region_id}
                    >
                      <Select
                        id="region_id"
                        name="region_id"
                        options={newStructureData.regions.map(region => ({
                          value: region.id,
                          label: region.name
                        }))}
                        value={newDataStructure.region_id}
                        onChange={(value) => handleDataStructureFieldChange('region_id', value)}
                        disabled={isCreatingDataStructure}
                      />
                    </FormField>

                    <FormField
                      id="program_id"
                      label="Program"
                      required
                      error={newDataStructureErrors.program_id}
                    >
                      <Select
                        id="program_id"
                        name="program_id"
                        options={newStructureData.programs.map(program => ({
                          value: program.id,
                          label: program.name
                        }))}
                        value={newDataStructure.program_id}
                        onChange={(value) => handleDataStructureFieldChange('program_id', value)}
                        disabled={isCreatingDataStructure}
                      />
                    </FormField>

                    <FormField
                      id="provider_id"
                      label="Provider"
                      required
                      error={newDataStructureErrors.provider_id}
                    >
                      <Select
                        id="provider_id"
                        name="provider_id"
                        options={newStructureData.providers.map(provider => ({
                          value: provider.id,
                          label: provider.name
                        }))}
                        value={newDataStructure.provider_id}
                        onChange={(value) => handleDataStructureFieldChange('provider_id', value)}
                        disabled={isCreatingDataStructure}
                      />
                    </FormField>

                    <FormField
                      id="subject_id"
                      label="Subject"
                      required
                      error={newDataStructureErrors.subject_id}
                    >
                      <Select
                        id="subject_id"
                        name="subject_id"
                        options={newStructureData.subjects.map(subject => ({
                          value: subject.id,
                          label: `${subject.name}${subject.code ? ` (${subject.code})` : ''}`
                        }))}
                        value={newDataStructure.subject_id}
                        onChange={(value) => handleDataStructureFieldChange('subject_id', value)}
                        disabled={isCreatingDataStructure}
                      />
                    </FormField>
                  </div>

                  <div className="flex justify-end space-x-3 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDataStructureForm(false)}
                      disabled={isCreatingDataStructure}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setIsCreatingDataStructure(true);
                        createDataStructureMutation.mutate(newDataStructure);
                      }}
                      disabled={isCreatingDataStructure}
                    >
                      {isCreatingDataStructure ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Academic Structure'
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={onPrevious}
                className="mt-4"
              >
                Back to Academic Structure
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {formErrors.form && (
                <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                  {formErrors.form}
                </div>
              )}
              
              {/* Configuration Settings Section */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration Settings</h2>
                
                {/* Data Structure Selector */}
                <FormField
                  id="data_structure_id"
                  label="Data Structure"
                  required
                  error={formErrors.data_structure_id}
                  description="Select the academic structure that matches this paper"
                >
                  <Select
                    id="data_structure_id"
                    name="data_structure_id"
                    options={dataStructureOptions.map(option => ({
                      value: option.value,
                      label: `${option.subject} (${option.region} / ${option.program} / ${option.provider})`
                    }))}
                    value={formData.data_structure_id}
                    onChange={(value) => handleDataStructureChange(value)}
                    disabled={isLoading}
                    placeholder="Select a data structure"
                  />
                </FormField>
                
                {matchingDataStructureFound === false && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start">
                    <Info className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" /> 
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Data Structure Not Found
                      </h4>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                        The academic structure for this paper doesn't exist yet. Please select an existing structure or create a new one.
                      </p>
                      <Button
                        type="button"
                        onClick={() => setShowDataStructureForm(true)}
                        variant="outline"
                        className="mt-3"
                        leftIcon={<PlusCircle className="h-4 w-4" />}
                      >
                        Create New Academic Structure
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Region Field - Display only, populated from data structure */}
                <FormField
                  id="region"
                  label="Region"
                  required
                  description="Region is determined by the selected data structure"
                >
                  <Select
                    id="region"
                    name="region"
                    options={fetchedRegions.map(r => ({ value: r.id, label: r.name }))}
                    value={selectedDataStructure?.region_id || ''}
                    onChange={() => {}} // Read-only
                    disabled={true}
                    placeholder="Select a region"
                  />
                </FormField>
                
                {/* Status Field */}
                <FormField
                  id="status"
                  label="Status"
                  error={formErrors.status}
                >
                  <Select
                    id="status"
                    name="status"
                    options={[
                      { value: 'draft', label: 'Draft - Needs review' },
                      { value: 'active', label: 'Active - Ready for use' },
                      { value: 'inactive', label: 'Inactive' }
                    ]}
                    value={formData.status}
                    onChange={(value) => handleFieldChange('status', value)}
                    placeholder="Select an option"
                  />
                </FormField>
                
                {/* Notes Field */}
                <FormField
                  id="notes"
                  label="Notes"
                  error={formErrors.notes}
                >
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Add any additional notes about this paper..."
                    value={formData.notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                </FormField>
              </div>
              
              {/* Advanced Settings */}
              <CollapsibleSection
                id="advanced-settings"
                title="Advanced Settings"
                isOpen={expandedSections.advanced}
                onToggle={() => {
                  console.log('Toggling advanced section');
                  setExpandedSections(prev => ({ ...prev, advanced: !prev.advanced }));
                }}
                className="mt-6"
              >
                <div className="space-y-6 p-4">
                  {/* Paper Details Section */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Paper Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        id="title"
                        label="Paper Title"
                        error={formErrors.title}
                        description="Auto-generated, but can be edited"
                      >
                        <Input
                          id="title"
                          name="title"
                          placeholder="Enter paper title"
                          value={formData?.title || ''}
                          onChange={(e) => handleFieldChange('title', e.target.value)}
                          disabled={isSaving}
                          maxLength={120}
                        />
                      </FormField>
                      
                      <FormField
                        id="paper_code"
                        label="Paper Code"
                        required={true}
                        error={formErrors.paper_code}
                        description="Format: 0000/00 (e.g., 0452/12)"
                      >
                        <Input
                          id="paper_code"
                          name="paper_code"
                          placeholder="e.g., 0452/12"
                          value={formData.paper_code}
                          onChange={(e) => handleFieldChange('paper_code', e.target.value)}
                          disabled={isSaving}
                        />
                      </FormField>
                      
                      <FormField
                        id="paper_number"
                        label="Paper Number"
                        required
                        error={formErrors.paper_number}
                        description="Auto-extracted from paper code"
                      >
                        <Input
                          id="paper_number"
                          name="paper_number"
                          placeholder="e.g., 12"
                          value={formData.paper_number}
                          onChange={(e) => handleFieldChange('paper_number', e.target.value)}
                          disabled={isSaving}
                        />
                      </FormField>
                      
                      <FormField
                        id="variant_number"
                        label="Variant Number"
                        error={formErrors.variant_number}
                        description="Auto-extracted from paper number (2nd digit)"
                      >
                        <Input
                          id="variant_number"
                          name="variant_number"
                          placeholder="e.g., 2"
                          value={formData?.variant_number || ''}
                          onChange={(e) => handleFieldChange('variant_number', e.target.value)}
                          disabled={isSaving}
                        />
                      </FormField>
                      
                      <FormField
                        id="paper_type"
                        label="Paper Type"
                        error={formErrors.paper_type}
                        description="Type of paper content"
                      >
                        <Select
                          id="paper_type"
                          name="paper_type"
                          options={[
                            { value: 'MCQ', label: 'Multiple Choice' },
                            { value: 'Complex', label: 'Complex/Theory' },
                            { value: 'Both QP and MS', label: 'Both QP and MS' },
                            { value: 'QP Only', label: 'Question Paper Only' },
                            { value: 'MS Only', label: 'Mark Scheme Only' },
                            { value: 'Practical', label: 'Practical' }
                          ]}
                          value={formData.paper_type}
                          onChange={(value) => handleFieldChange('paper_type', value)}
                          disabled={isSaving}
                        />
                      </FormField>
                      
                      <FormField
                        id="exam_year"
                        label="Paper Year"
                        required={true}
                        error={formErrors.exam_year}
                        description="4-digit year (2000-present)"
                      >
                        <Input
                          id="exam_year"
                          name="exam_year"
                          type="number"
                          min={2000}
                          max={new Date().getFullYear() + 1}
                          placeholder="e.g., 2023"
                          value={formData.exam_year}
                          onChange={(e) => handleFieldChange('exam_year', e.target.value)}
                          disabled={isLoading}
                        />
                      </FormField>
                      
                      <FormField
                        id="exam_session"
                        label="Exam Session"
                        required={true}
                        error={formErrors.exam_session}
                        description="The exam session"
                      >
                        <Select
                          id="exam_session"
                          name="exam_session"
                          options={sessionOptions}
                          value={formData.exam_session}
                          onChange={(value) => handleFieldChange('exam_session', value)}
                          disabled={isLoading}
                        />
                      </FormField>
                      
                      <FormField
                        id="subject"
                        label="Subject"
                        error={formErrors.subject}
                        description="Auto-extracted from questions or metadata"
                      >
                        <Input
                          id="subject"
                          name="subject"
                          placeholder="e.g., Accounting"
                          value={formData?.subject || ''}
                          onChange={(e) => handleFieldChange('subject', e.target.value)}
                          disabled={isSaving}
                        />
                      </FormField>
                      
                      <FormField
                        id="program"
                        label="Program"
                        error={formErrors.program}
                        description="Auto-extracted from questions or metadata"
                      >
                        <Input
                          id="program"
                          name="program"
                          placeholder="e.g., IGCSE"
                          value={formData?.program || ''}
                          onChange={(e) => handleFieldChange('program', e.target.value)}
                          disabled={isSaving}
                        />
                      </FormField>
                      
                      <FormField
                        id="provider"
                        label="Provider"
                        error={formErrors.provider}
                        description="Auto-extracted from questions or metadata"
                      >
                        <Input
                          id="provider"
                          name="provider"
                          placeholder="e.g., Cambridge International (CIE)"
                          value={formData?.provider || ''}
                          onChange={(e) => handleFieldChange('provider', e.target.value)}
                          disabled={isSaving}
                        />
                      </FormField>
                      
                      <FormField
                        id="subject_code"
                        label="Subject Code"
                        error={formErrors.subject_code}
                        description="Auto-extracted from paper code or subject"
                      >
                        <Input
                          id="subject_code"
                          name="subject_code"
                          placeholder="e.g., 0452"
                          value={formData?.subject_code || ''}
                          onChange={(e) => handleFieldChange('subject_code', e.target.value)}
                          disabled={isSaving}
                        />
                      </FormField>
                      
                      <FormField
                        id="duration"
                        label="Duration"
                        error={formErrors.duration}
                        description="The duration of the exam (e.g., '1 hour 15 minutes')"
                      >
                        <Input
                          id="duration"
                          name="duration"
                          placeholder="e.g., 1 hour 15 minutes"
                          value={formData?.duration || ''}
                          onChange={(e) => handleFieldChange('duration', e.target.value)}
                          disabled={isSaving}
                        />
                      </FormField>
                      
                      <FormField
                        id="total_marks"
                        label="Total Marks"
                        error={formErrors.total_marks}
                        description="The total marks for the paper"
                      >
                        <Input
                          id="total_marks"
                          name="total_marks"
                          type="number"
                          placeholder="e.g., 80"
                          value={formData?.total_marks || ''}
                          onChange={(e) => handleFieldChange('total_marks', e.target.value)}
                          disabled={isSaving}
                        />
                      </FormField>
                    </div>
                  </div>
                  
                  {/* Overrides Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Override Settings</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Use these fields to manually override auto-detected values
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Paper Type (from number)
                        </label>
                        <Input
                          type="text"
                          value={extractPaperType(formData.paper_number) || ''}
                          disabled={true}
                          placeholder="Auto-determined from paper number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Paper Type Override
                        </label>
                        <Select
                          value={formData.paper_type}
                          onChange={(value) => handleFieldChange('paper_type', value)}
                          options={[
                            { value: 'MCQ', label: 'Multiple Choice' },
                            { value: 'Complex', label: 'Complex/Theory' },
                            { value: 'Both QP and MS', label: 'Both QP and MS' },
                            { value: 'QP Only', label: 'Question Paper Only' },
                            { value: 'MS Only', label: 'Mark Scheme Only' }
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
              
              {/* Navigation buttons */}
              <div className="mt-8 flex justify-between">
                <Button
                  variant="outline" 
                  onClick={onPrevious}
                  disabled={isLoading}
                >
                  Back to Academic Structure
                </Button>
                
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving || matchingDataStructureFound === false}
                  rightIcon={<ArrowRight className="h-4 w-4 ml-1" />}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Continue to Questions Review'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Debug Information */}
      <div className="mt-8">
        <button 
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {showDebug ? '▼' : '►'} <Bug className="h-4 w-4 mr-1" /> Debug: Parsed Data
        </button>
        
        {showDebug && (
          <div className="p-4 bg-gray-800 text-white rounded-lg">
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Extracted Fields:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><strong>paper_code:</strong> {formData.paper_code || 'Not extracted'}</div>
                <div><strong>paper_number:</strong> {formData.paper_number || 'Not extracted'}</div>
                <div><strong>exam_year:</strong> {formData.exam_year || 'Not extracted'}</div>
                <div><strong>exam_session:</strong> {formData.exam_session || 'Not extracted'}</div>
                <div><strong>duration:</strong> {formData.duration || 'Not extracted'}</div>
                <div><strong>total_marks:</strong> {formData.total_marks || 'Not extracted'}</div>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Selected Data Structure:</h4>
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(selectedDataStructure, null, 2)}
              </pre>
            </div>
            
            <h4 className="text-sm font-medium mb-2">Raw Parsed Data:</h4>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}