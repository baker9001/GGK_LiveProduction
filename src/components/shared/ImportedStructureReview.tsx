// src/components/shared/ImportedStructureReview.tsx

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  ChevronRight, ChevronDown, FileText, Folder, AlertCircle, 
  CheckCircle, XCircle, Loader2, RefreshCw, Package, Building2,
  BookOpen, FileStack, Hash, Tags, Plus, Filter, Square, CheckSquare,
  Info, MapPin, Database, ArrowLeft, WifiOff
} from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';

// Toast implementation
const showToast = ({ title, description, variant = 'default' }: { 
  title: string; 
  description?: string; 
  variant?: 'default' | 'success' | 'error' | 'warning' 
}) => {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-4 right-4 z-50 space-y-2';
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement('div');
  const borderClass = variant === 'error' ? 'border-red-200 dark:border-red-800' : 
                     variant === 'success' ? 'border-green-200 dark:border-green-800' : 
                     variant === 'warning' ? 'border-yellow-200 dark:border-yellow-800' : 
                     'border-gray-200 dark:border-gray-700';
  
  toast.className = 'transform transition-all duration-300 ease-in-out translate-x-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 min-w-[300px] max-w-md border ' + borderClass;
  
  const titleEl = document.createElement('h3');
  const titleColorClass = variant === 'error' ? 'text-red-900 dark:text-red-100' : 
                          variant === 'success' ? 'text-green-900 dark:text-green-100' : 
                          variant === 'warning' ? 'text-yellow-900 dark:text-yellow-100' : 
                          'text-gray-900 dark:text-gray-100';
  titleEl.className = 'font-semibold ' + titleColorClass;
  titleEl.textContent = title;
  toast.appendChild(titleEl);

  if (description) {
    const descEl = document.createElement('p');
    descEl.className = 'text-sm text-gray-600 dark:text-gray-400 mt-1';
    descEl.textContent = description;
    toast.appendChild(descEl);
  }

  toastContainer.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);

  // Remove after 5 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      toast.remove();
      if (toastContainer && toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, 5000);
};

// Helper function to extract academic structure from JSON data
export function extractAcademicStructure(data: any) {
  const structure = {};
  
  // Map qualification to program (standardize naming)
  let program = data.qualification || "Unknown Program";
  const qualLower = program.toLowerCase();
  switch (qualLower) {
    case 'igcse':
    case 'international gcse':
      program = 'IGCSE';
      break;
    case 'gcse':
      program = 'GCSE';
      break;
    case 'a level':
    case 'a-level':
      program = 'A Level';
      break;
    case 'as level':
    case 'as-level':
      program = 'AS Level';
      break;
    case 'ib':
    case 'international baccalaureate':
      program = 'IB';
      break;
  }
  
  // Map exam board to provider (standardize naming)
  let provider = data.exam_board || "Unknown Provider";
  const providerLower = provider.toLowerCase();
  switch (providerLower) {
    case 'cambridge':
    case 'cambridge international':
    case 'cambridge international (cie)':
    case 'cie':
      provider = 'Cambridge International (CIE)';
      break;
    case 'edexcel':
    case 'pearson edexcel':
      provider = 'Edexcel';
      break;
    case 'aqa':
      provider = 'AQA';
      break;
    case 'ocr':
      provider = 'OCR';
      break;
    case 'wjec':
      provider = 'WJEC';
      break;
  }
  
  // Keep the full subject string including code for display
  const subject = data.subject || "Unknown Subject";
  
  // Process questions to extract units, topics, and subtopics
  const uniqueTopicsSubtopics = new Map();
  
  // Check if any questions have units
  const hasAnyUnits = (data.questions || []).some(q => q.unit || q.chapter || q.section);
  
  (data.questions || []).forEach((q) => {
    // Check all possible fields for unit information
    const unit = q.unit || q.chapter || q.section || (hasAnyUnits ? "General Topics" : "All Topics");
    const topic = q.topic || "Unknown Topic";
    const subtopic = q.subtopic || null;
    
    const key = `${unit}|${topic}`;
    if (!uniqueTopicsSubtopics.has(key)) {
      uniqueTopicsSubtopics.set(key, {
        unit,
        topic,
        subtopics: new Set()
      });
    }
    
    if (subtopic) {
      uniqueTopicsSubtopics.get(key).subtopics.add(subtopic);
    }
  });

  // If no questions or no units found, create a default structure
  if (uniqueTopicsSubtopics.size === 0) {
    uniqueTopicsSubtopics.set("All Topics|General", {
      unit: "All Topics",
      topic: "General",
      subtopics: new Set()
    });
  }

  // Build the hierarchical structure
  uniqueTopicsSubtopics.forEach(({ unit, topic, subtopics }) => {
    if (!structure[program]) structure[program] = {};
    if (!structure[program][provider]) structure[program][provider] = {};
    if (!structure[program][provider][subject]) structure[program][provider][subject] = {};
    if (!structure[program][provider][subject][unit]) structure[program][provider][subject][unit] = {};
    if (!structure[program][provider][subject][unit][topic]) structure[program][provider][subject][unit][topic] = new Set();
    
    subtopics.forEach((st) => {
      if (st && typeof st === "string") {
        structure[program][provider][subject][unit][topic].add(st);
      }
    });
  });

  // Convert sets to arrays (for subtopics)
  Object.keys(structure).forEach(program =>
    Object.keys(structure[program]).forEach(provider =>
      Object.keys(structure[program][provider]).forEach(subject =>
        Object.keys(structure[program][provider][subject]).forEach(unit =>
          Object.keys(structure[program][provider][subject][unit]).forEach(topic => {
            structure[program][provider][subject][unit][topic] = Array.from(
              structure[program][provider][subject][unit][topic]
            );
          })
        )
      )
    )
  );
  
  console.log("[GGK] extractAcademicStructure result:", JSON.stringify(structure, null, 2));
  return structure;
}

// Extract subject code from subject string if present
function extractSubjectCode(subjectString: string): string | undefined {
  if (!subjectString) return undefined;
  
  // Handle format like "Physics - 0625"
  const dashMatch = subjectString.match(/\s*-\s*(\d+)$/);
  if (dashMatch) {
    return dashMatch[1];
  }
  
  // Handle format like "Physics (0625)"
  const parenMatch = subjectString.match(/\((\d+)\)$/);
  if (parenMatch) {
    return parenMatch[1];
  }
  
  // Handle format like "0625 Physics"
  const prefixMatch = subjectString.match(/^(\d+)\s+/);
  if (prefixMatch) {
    return prefixMatch[1];
  }
  
  return undefined;
}

// Extract subject name without code
function extractSubjectName(subjectString: string): string {
  if (!subjectString) return subjectString;
  
  // Remove code patterns
  return subjectString
    .replace(/\s*-\s*\d+$/, '')  // Remove " - 0625" pattern
    .replace(/\s*\(\d+\)$/, '')   // Remove " (0625)" pattern
    .replace(/^\d+\s+/, '')       // Remove "0625 " pattern
    .trim();
}

// Check if entity name is a potential duplicate
function isPotentialDuplicate(name1: string, name2: string): boolean {
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  // Check if one contains the other (for abbreviations)
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Check Levenshtein distance for typos (simple implementation)
  if (Math.abs(n1.length - n2.length) <= 2) {
    let distance = 0;
    const maxLen = Math.max(n1.length, n2.length);
    for (let i = 0; i < maxLen; i++) {
      if (n1[i] !== n2[i]) distance++;
    }
    if (distance <= 2) return true;
  }
  
  return false;
}

interface ImportedStructureReviewProps {
  importedData: any;
  onComplete: () => void;
  onStructureChange?: (updatedStructure: any) => void;
  className?: string;
  defaultRegionId?: string; // Allow passing a default region
}

function normalize(str = "") {
  return str.trim().toLowerCase().replace(/[\s\-\_]+/g, " ").replace(/\s*\(.*?\)\s*/g, "");
}

interface StructureEntity {
  id?: string;
  name: string;
  code?: string;
  parentId?: string;
  type: "program" | "provider" | "subject" | "unit" | "topic" | "subtopic";
  exists: boolean;
  loading?: boolean;
  error?: string;
  children?: StructureEntity[];
  potentialDuplicates?: Array<{ id: string; name: string }>;
}

type EntityMap = Map<string, { id: string; exists: true; name?: string }>;

// Filter tabs configuration
const FILTER_TABS = [
  { id: null, label: 'All Types', icon: null },
  { id: 'program', label: 'Programs', icon: Package },
  { id: 'provider', label: 'Providers', icon: Building2 },
  { id: 'subject', label: 'Subjects', icon: BookOpen },
  { id: 'unit', label: 'Units', icon: FileStack },
  { id: 'topic', label: 'Topics', icon: Hash },
  { id: 'subtopic', label: 'Subtopics', icon: Tags }
];

export default function ImportedStructureReview({
  importedData,
  onComplete,
  onStructureChange,
  className,
  defaultRegionId
}: ImportedStructureReviewProps) {
  const [structure, setStructure] = useState<StructureEntity | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creatingAll, setCreatingAll] = useState(false);
  const [showCreateAll, setShowCreateAll] = useState(false);
  const [allEntitiesExist, setAllEntitiesExist] = useState(false);
  const [completionCalled, setCompletionCalled] = useState(false);
  const [filterByType, setFilterByType] = useState<string | null>(null);
  const [dataStructureId, setDataStructureId] = useState<string | null>(null);
  const [dataStructureError, setDataStructureError] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(defaultRegionId || null);
  const [availableRegions, setAvailableRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [creationProgress, setCreationProgress] = useState<{ current: number; total: number } | null>(null);
  const [rollbackData, setRollbackData] = useState<Array<{ table: string; id: string }>>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const createdCountRef = useRef(0);
  const failedCountRef = useRef(0);
  const [maps, setMaps] = useState<{
    programs: EntityMap,
    providers: EntityMap,
    subjects: EntityMap,
    units: EntityMap,
    topics: EntityMap,
    subtopics: EntityMap
  } | null>(null);

  // Preload all entities and regions from DB on mount
  useEffect(() => {
    async function preload() {
      setLoading(true);
      
      try {
        // Try to fetch all data with error handling for each request
        const fetchWithFallback = async (table: string, query: string) => {
          try {
            const result = await supabase.from(table).select(query);
            if (result.error) {
              console.warn(`[GGK] Error loading ${table}:`, result.error);
              return { data: null, error: result.error };
            }
            return result;
          } catch (error) {
            console.warn(`[GGK] Failed to fetch ${table}:`, error);
            return { data: null, error };
          }
        };

        const [
          programsRes,
          providersRes,
          subjectsRes,
          unitsRes,
          topicsRes,
          subtopicsRes,
          regionsRes
        ] = await Promise.all([
          fetchWithFallback("programs", "id, name, code"),
          fetchWithFallback("providers", "id, name, code"),
          fetchWithFallback("edu_subjects", "id, name, code"),
          fetchWithFallback("edu_units", "id, name, code, subject_id"),
          fetchWithFallback("edu_topics", "id, name, unit_id"),
          fetchWithFallback("edu_subtopics", "id, name, topic_id"),
          fetchWithFallback("regions", "id, name")
        ]);
        
        // Handle regions with fallback
        if (regionsRes.data && regionsRes.data.length > 0) {
          setAvailableRegions(regionsRes.data);
          // Set default region if not already set
          if (!selectedRegionId && regionsRes.data.length > 0) {
            // Try to find "Middle East" as default, otherwise use first
            const middleEast = regionsRes.data.find(r => r.name.toLowerCase().includes('middle east'));
            setSelectedRegionId(middleEast ? middleEast.id : regionsRes.data[0].id);
          }
        } else {
          // Provide fallback regions if fetch failed
          console.warn('[GGK] Using fallback regions due to fetch error');
          const fallbackRegions = [
            { id: 'fallback-1', name: 'Middle East' },
            { id: 'fallback-2', name: 'Europe' },
            { id: 'fallback-3', name: 'Asia' },
            { id: 'fallback-4', name: 'Africa' },
            { id: 'fallback-5', name: 'Americas' }
          ];
          setAvailableRegions(fallbackRegions);
          if (!selectedRegionId) {
            setSelectedRegionId('fallback-1');
          }
        }
        
        // Lookup maps for fast matching
        const programs = new Map();
        programsRes.data?.forEach((x) => {
          programs.set(normalize(x.name), { id: x.id, exists: true, name: x.name });
          if (x.code) programs.set(normalize(x.code), { id: x.id, exists: true, name: x.name });
        });
        
        const providers = new Map();
        providersRes.data?.forEach((x) => {
          providers.set(normalize(x.name), { id: x.id, exists: true, name: x.name });
          if (x.code) providers.set(normalize(x.code), { id: x.id, exists: true, name: x.name });
        });
        
        const subjects = new Map();
        subjectsRes.data?.forEach((x) => {
          // Store both by name and by code for better matching
          subjects.set(normalize(x.name), { id: x.id, exists: true, name: x.name });
          if (x.code) {
            subjects.set(normalize(x.code), { id: x.id, exists: true, name: x.name });
            // Also store by name+code combination for exact matching
            subjects.set(normalize(`${x.name} - ${x.code}`), { id: x.id, exists: true, name: x.name });
            subjects.set(normalize(`${x.name} (${x.code})`), { id: x.id, exists: true, name: x.name });
          }
        });
        
        const units = new Map();
        unitsRes.data?.forEach((x) => {
          units.set(`${x.subject_id}:${normalize(x.name)}`, { id: x.id, exists: true, name: x.name });
        });
        
        const topics = new Map();
        topicsRes.data?.forEach((x) => {
          topics.set(`${x.unit_id}:${normalize(x.name)}`, { id: x.id, exists: true, name: x.name });
        });
        
        const subtopics = new Map();
        subtopicsRes.data?.forEach((x) => {
          subtopics.set(`${x.topic_id}:${normalize(x.name)}`, { id: x.id, exists: true, name: x.name });
        });
        
        setMaps({ programs, providers, subjects, units, topics, subtopics });
        
        // Check if we had any critical failures
        if (!programsRes.data && !providersRes.data && !subjectsRes.data) {
          console.error('[GGK] Critical error: Unable to load entity data from Supabase');
          setIsOfflineMode(true);
          showToast({
            title: "Connection Error",
            description: "Unable to connect to database. Working in offline mode.",
            variant: "warning"
          });
        } else {
          setIsOfflineMode(false);
        }
      } catch (error) {
        console.error('[GGK] Fatal error in preload:', error);
        setIsOfflineMode(true);
        // Set empty maps to allow the component to function
        setMaps({
          programs: new Map(),
          providers: new Map(),
          subjects: new Map(),
          units: new Map(),
          topics: new Map(),
          subtopics: new Map()
        });
        
        // Set fallback regions
        setAvailableRegions([
          { id: 'fallback-1', name: 'Middle East' },
          { id: 'fallback-2', name: 'Europe' }
        ]);
        setSelectedRegionId('fallback-1');
        
        showToast({
          title: "Offline Mode",
          description: "Database unavailable. New entities will be marked for creation.",
          variant: "warning"
        });
      } finally {
        setLoading(false);
      }
    }
    preload();
  }, [defaultRegionId, selectedRegionId]);

  // Build structure from importedData and DB maps
  useEffect(() => {
    if (!importedData || !maps) return;
    
    setLoading(true);
    setCompletionCalled(false);
    setDataStructureError(null);

    async function buildStructure() {
      // Extract academic structure from the raw parsedData
      const structureTree = extractAcademicStructure(importedData);

      // Log the structure tree for debugging
      console.log("[GGK] ImportedStructureReview structureTree:", JSON.stringify(structureTree, null, 2));

      // Recursively build UI entity tree using DB lookups for "exists"
      function buildEntities(node: any, type: string, parentId?: string): StructureEntity[] {
        return Object.entries(node).map(([name, child]) => {
          let entityType = type as StructureEntity["type"];
          let id, exists = false, code;
          let potentialDuplicates: Array<{ id: string; name: string }> = [];
          
          switch (entityType) {
            case "program": {
              let m = maps.programs.get(normalize(name));
              id = m?.id;
              exists = !!m;
              
              // Check for potential duplicates
              maps.programs.forEach((value, key) => {
                if (!m && value.name && isPotentialDuplicate(name, value.name)) {
                  potentialDuplicates.push({ id: value.id, name: value.name });
                }
              });
              break;
            }
            case "provider": {
              // Try exact match first
              let m = maps.providers.get(normalize(name));
              if (!m && name.includes('Cambridge')) {
                // Try common variations for Cambridge
                m = maps.providers.get(normalize('Cambridge International (CIE)')) ||
                    maps.providers.get(normalize('Cambridge International')) ||
                    maps.providers.get(normalize('Cambridge')) ||
                    maps.providers.get(normalize('CIE'));
              }
              id = m?.id;
              exists = !!m;
              
              // Check for potential duplicates
              maps.providers.forEach((value, key) => {
                if (!m && value.name && isPotentialDuplicate(name, value.name)) {
                  potentialDuplicates.push({ id: value.id, name: value.name });
                }
              });
              break;
            }
            case "subject": {
              // Extract the subject name and code
              const subjectName = extractSubjectName(name);
              const subjectCode = extractSubjectCode(name);
              
              // Try different matching strategies
              let m = null;
              
              // 1. Try exact match with full string
              m = maps.subjects.get(normalize(name));
              
              // 2. Try matching just the subject name
              if (!m) {
                m = maps.subjects.get(normalize(subjectName));
              }
              
              // 3. Try matching with the code if available
              if (!m && subjectCode) {
                m = maps.subjects.get(normalize(subjectCode));
              }
              
              // 4. Try matching name + code combinations
              if (!m && subjectCode) {
                m = maps.subjects.get(normalize(`${subjectName} - ${subjectCode}`)) ||
                    maps.subjects.get(normalize(`${subjectName} (${subjectCode})`));
              }
              
              id = m?.id;
              exists = !!m;
              code = subjectCode;
              
              // Check for potential duplicates
              maps.subjects.forEach((value, key) => {
                if (!m && value.name && isPotentialDuplicate(subjectName, value.name)) {
                  potentialDuplicates.push({ id: value.id, name: value.name });
                }
              });
              break;
            }
            case "unit": {
              let m = parentId ? maps.units.get(`${parentId}:${normalize(name)}`) : null;
              id = m?.id;
              exists = !!m;
              break;
            }
            case "topic": {
              let m = parentId ? maps.topics.get(`${parentId}:${normalize(name)}`) : null;
              id = m?.id;
              exists = !!m;
              break;
            }
          }
          
          let children: StructureEntity[] = [];
          if (entityType === "program") {
            children = buildEntities(child, "provider", id);
          } else if (entityType === "provider") {
            children = buildEntities(child, "subject", id);
          } else if (entityType === "subject") {
            children = buildEntities(child, "unit", id);
          } else if (entityType === "unit") {
            children = buildEntities(child, "topic", id);
          } else if (entityType === "topic") {
            // child is a Set of subtopics
            children = Array.from(child as Set<string>).map((subtopic: string) => {
              let m = id ? maps.subtopics.get(`${id}:${normalize(subtopic)}`) : null;
              return {
                name: subtopic,
                type: "subtopic",
                parentId: id,
                id: m?.id,
                exists: !!m,
                children: [],
              } as StructureEntity;
            });
          }
          
          return {
            name,
            type: entityType,
            id,
            code,
            parentId,
            exists,
            children,
            potentialDuplicates: potentialDuplicates.length > 0 ? potentialDuplicates : undefined
          } as StructureEntity;
        });
      }

      const [root] = buildEntities(structureTree, "program");
      
      // Log the processed structure for debugging
      console.log("[GGK] ImportedStructureReview processed structure:", root);

      // Collect all node IDs for initial expansion
      const allNodeIds = new Set<string>();
      const collectNodeIds = (node: StructureEntity | undefined) => {
        if (!node) return;
        const nodeId = `${node.type}_${node.name}_${node.parentId || ""}`;
        allNodeIds.add(nodeId);
        if (node.children) {
          node.children.forEach(collectNodeIds);
        }
      };
      collectNodeIds(root);
      
      setStructure(root || null);
      setExpandedNodes(allNodeIds); // Set all nodes to be expanded by default
      setShowCreateAll(true);
      setLoading(false);

      function allExist(entity: StructureEntity | undefined): boolean {
        if (!entity) return true;
        if (!('exists' in entity)) return true;
        if (!entity.exists) return false;
        if (entity.children && entity.children.length)
          return entity.children.every(allExist);
        return true;
      }
      
      const exists = allExist(root);
      setAllEntitiesExist(exists);
      
      // Check or create data structure if all basic entities exist
      if (root && exists) {
        await checkOrCreateDataStructure(root);
      }
      
      // Only call onComplete if all entities exist, no errors, and we haven't called it yet for this structure
      if (exists && onComplete && !completionCalled && !dataStructureError) {
        setCompletionCalled(true);
        onComplete();
      }
    }

    buildStructure();
  }, [importedData, maps, onComplete, completionCalled, dataStructureError]);

  // Check or create data structure
  async function checkOrCreateDataStructure(root: StructureEntity) {
    setDataStructureError(null);
    
    if (!root || !root.children || !root.children[0] || !root.children[0].children || !root.children[0].children[0]) {
      const error = 'Invalid structure for data structure check';
      console.error('[GGK]', error);
      setDataStructureError(error);
      return;
    }

    const program = root;
    const provider = root.children[0];
    const subject = root.children[0].children[0];

    if (!program.id || !provider.id || !subject.id) {
      const error = 'Missing IDs for data structure check';
      console.error('[GGK]', error);
      setDataStructureError(error);
      return;
    }

    if (!selectedRegionId) {
      const error = 'No region selected for data structure';
      console.error('[GGK]', error);
      setDataStructureError(error);
      showToast({
        title: "Region Required",
        description: "Please select a region for the data structure",
        variant: "warning"
      });
      return;
    }

    try {
      // Check if data structure exists
      const { data: existingStructure, error: checkError } = await supabase
        .from('data_structures')
        .select('id')
        .eq('program_id', program.id)
        .eq('provider_id', provider.id)
        .eq('subject_id', subject.id)
        .eq('region_id', selectedRegionId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        // Check if it's a connection error
        if (checkError.message?.includes('Failed to fetch') || checkError.message?.includes('TypeError')) {
          const error = 'Unable to connect to database. Data structure creation skipped.';
          console.warn('[GGK]', error);
          setDataStructureError(error);
          // Don't show error toast for connection issues, already shown in preload
          return;
        }
        
        const error = `Error checking data structure: ${checkError.message}`;
        console.error('[GGK]', error);
        setDataStructureError(error);
        return;
      }

      if (existingStructure) {
        console.log('[GGK] Data structure already exists:', existingStructure.id);
        setDataStructureId(existingStructure.id);

        // Store in metadata if onStructureChange is provided
        if (onStructureChange) {
          onStructureChange({
            dataStructureId: existingStructure.id,
            program: program.name,
            provider: provider.name,
            subject: subject.name,
            region: availableRegions.find(r => r.id === selectedRegionId)?.name,
            programId: program.id,
            providerId: provider.id,
            subjectId: subject.id,
            regionId: selectedRegionId
          });
        }
      } else {
        // Create new data structure
        console.log('[GGK] Creating new data structure for:', program.name, provider.name, subject.name);

        const { data: newStructure, error: createError } = await supabase
          .from('data_structures')
          .insert({
            program_id: program.id,
            provider_id: provider.id,
            subject_id: subject.id,
            region_id: selectedRegionId,
            status: 'active'
          })
          .select('id')
          .single();

        if (createError) {
          // Check if it's a connection error
          if (createError.message?.includes('Failed to fetch') || createError.message?.includes('TypeError')) {
            const error = 'Unable to connect to database. Data structure will be created when connection is restored.';
            console.warn('[GGK]', error);
            setDataStructureError(error);
            return;
          }

          const error = `Failed to create data structure: ${createError.message}`;
          console.error('[GGK]', error);
          setDataStructureError(error);
          showToast({
            title: "Error",
            description: error,
            variant: "error"
          });
        } else {
          console.log('[GGK] Created new data structure:', newStructure.id);
          setDataStructureId(newStructure.id);

          // Store in metadata if onStructureChange is provided
          if (onStructureChange) {
            onStructureChange({
              dataStructureId: newStructure.id,
              program: program.name,
              provider: provider.name,
              subject: subject.name,
              region: availableRegions.find(r => r.id === selectedRegionId)?.name,
              programId: program.id,
              providerId: provider.id,
              subjectId: subject.id,
              regionId: selectedRegionId
            });
          }

          showToast({
            title: "Success",
            description: `Data structure created: ${program.name} - ${provider.name} - ${subject.name}`,
            variant: "success"
          });
        }
      }
    } catch (error: any) {
      // Handle unexpected errors
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('TypeError')) {
        const errorMsg = 'Database connection unavailable. Working in offline mode.';
        console.warn('[GGK]', errorMsg);
        setDataStructureError(errorMsg);
      } else {
        const errorMsg = `Unexpected error: ${error?.message || error}`;
        console.error('[GGK]', errorMsg);
        setDataStructureError(errorMsg);
        showToast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "error"
        });
      }
    }
  }

  // Check completion status whenever structure changes
  useEffect(() => {
    if (!structure || completionCalled) return;
    
    const checkAllExist = (node: StructureEntity): boolean => {
      if (!node.exists) return false;
      if (node.children) {
        return node.children.every(child => checkAllExist(child));
      }
      return true;
    };
    
    const allExist = checkAllExist(structure);
    setAllEntitiesExist(allExist);

    if (allExist && onComplete && !dataStructureError) {
      console.log('[GGK] All entities already exist, calling onComplete');
      setCompletionCalled(true);
      onComplete();
    }
  }, [structure, onComplete, completionCalled, dataStructureError]);

  // Create a single entity
  async function createEntity(node: StructureEntity, parentId?: string, trackRollback = true) {
    if (parentId) node.parentId = parentId;
    if (!node.exists) {
      let table, payload;
      
      switch (node.type) {
        case "program":
          table = "programs";
          payload = { name: node.name, code: node.name.substr(0, 12), status: "active" };
          break;
        case "provider":
          table = "providers";
          payload = { name: node.name, code: node.name.substr(0, 12), status: "active" };
          break;
        case "subject":
          table = "edu_subjects";
          // Extract subject name without code for database
          const subjectName = extractSubjectName(node.name);
          payload = {
            name: subjectName,
            code: node.code || extractSubjectCode(node.name) || subjectName.substr(0, 12),
            status: "active"
          };
          break;
        case "unit":
          table = "edu_units";
          payload = {
            name: node.name,
            code: node.code || node.name.substr(0, 16) + Math.random().toString(36).substr(2, 4),
            subject_id: node.parentId,
            status: "active"
          };
          break;
        case "topic":
          table = "edu_topics";
          payload = { name: node.name, unit_id: node.parentId, status: "active" };
          break;
        case "subtopic":
          table = "edu_subtopics";
          payload = { name: node.name, topic_id: node.parentId, status: "active" };
          break;
      }
      
      node.loading = true;
      setStructure((s) => ({ ...s! }));
      
      try {
        const { data, error } = await supabase.from(table).insert(payload).select("id").single();
        
        node.loading = false;
        if (error) {
          // Check if it's a connection error
          if (error.message?.includes('Failed to fetch') || error.message?.includes('TypeError')) {
            node.error = 'Connection error - entity will be created when online';
            setStructure((s) => ({ ...s! }));
            // Don't show toast for each entity in offline mode
            console.warn(`[GGK] Offline: ${node.type} "${node.name}" marked for creation`);
            return false;
          }
          
          node.error = error.message;
          setStructure((s) => ({ ...s! }));
          showToast({
            title: "Error",
            description: error.message,
            variant: "error"
          });
          return false;
        }
        
        node.exists = true;
        node.id = data.id;
        
        // Track for rollback if needed
        if (trackRollback) {
          setRollbackData(prev => [...prev, { table, id: data.id }]);
        }
        
        // Update the lookup maps to reflect the new entity
        if (maps) {
          switch (node.type) {
            case "program":
              maps.programs.set(normalize(node.name), { id: data.id, exists: true, name: node.name });
              break;
            case "provider":
              maps.providers.set(normalize(node.name), { id: data.id, exists: true, name: node.name });
              break;
            case "subject":
              const subjectNameForMap = extractSubjectName(node.name);
              maps.subjects.set(normalize(subjectNameForMap), { id: data.id, exists: true, name: subjectNameForMap });
              maps.subjects.set(normalize(node.name), { id: data.id, exists: true, name: node.name });
              if (node.code) {
                maps.subjects.set(normalize(node.code), { id: data.id, exists: true, name: subjectNameForMap });
              }
              break;
            case "unit":
              if (node.parentId) {
                maps.units.set(`${node.parentId}:${normalize(node.name)}`, { id: data.id, exists: true, name: node.name });
              }
              break;
            case "topic":
              if (node.parentId) {
                maps.topics.set(`${node.parentId}:${normalize(node.name)}`, { id: data.id, exists: true, name: node.name });
              }
              break;
            case "subtopic":
              if (node.parentId) {
                maps.subtopics.set(`${node.parentId}:${normalize(node.name)}`, { id: data.id, exists: true, name: node.name });
              }
              break;
          }
        }
        
        setStructure((s) => ({ ...s! }));
        return true;
      } catch (error: any) {
        node.loading = false;
        
        // Handle connection errors
        if (error?.message?.includes('Failed to fetch') || error?.message?.includes('TypeError')) {
          node.error = 'Offline - will retry when connected';
          setStructure((s) => ({ ...s! }));
          console.warn(`[GGK] Offline: ${node.type} "${node.name}" marked for creation`);
          return false;
        }
        
        node.error = error?.message || 'Unknown error';
        setStructure((s) => ({ ...s! }));
        showToast({
          title: "Error",
          description: node.error,
          variant: "error"
        });
        return false;
      }
    }
    return true;
  }

  // Count total entities to create
  function countEntitiesToCreate(node: StructureEntity): number {
    let count = node.exists ? 0 : 1;
    if (node.children) {
      count += node.children.reduce((sum, child) => sum + countEntitiesToCreate(child), 0);
    }
    return count;
  }

  // Recursive creation: always create parent first
  async function createAllMissingEntities(node: StructureEntity, parentId?: string) {
    // Create the node if it doesn't exist
    if (!node.exists) {
      const success = await createEntity(node, parentId);
      if (success) {
        createdCountRef.current++;
      } else {
        failedCountRef.current++;
        // If parent creation failed, don't try to create children
        return;
      }
      
      // Update progress
      setCreationProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null);
    }
    
    // Recursively create children
    if (node.children && node.id) {
      for (const child of node.children) {
        await createAllMissingEntities(child, node.id);
      }
    }
  }

  // Rollback created entities
  async function rollbackCreatedEntities() {
    if (rollbackData.length === 0) {
      showToast({
        title: "No Changes",
        description: "No entities to rollback",
        variant: "info"
      });
      return;
    }

    const confirmRollback = window.confirm(`Are you sure you want to rollback ${rollbackData.length} created entities?`);
    if (!confirmRollback) return;

    setLoading(true);
    let rolledBack = 0;
    let failed = 0;

    // Rollback in reverse order (children first)
    for (const item of [...rollbackData].reverse()) {
      const { error } = await supabase
        .from(item.table)
        .delete()
        .eq('id', item.id);
      
      if (error) {
        console.error(`[GGK] Failed to rollback ${item.table}:${item.id}`, error);
        failed++;
      } else {
        rolledBack++;
      }
    }

    setRollbackData([]);
    setLoading(false);

    if (failed === 0) {
      showToast({
        title: "Rollback Complete",
        description: `Successfully rolled back ${rolledBack} entities`,
        variant: "success"
      });
    } else {
      showToast({
        title: "Partial Rollback",
        description: `Rolled back ${rolledBack} entities, ${failed} failed`,
        variant: "warning"
      });
    }

    // Refresh the page to reload data
    window.location.reload();
  }

  // Handle create all missing button click
  async function handleCreateAllMissing() {
    if (!structure) return;
    
    // Calculate total entities to create
    const totalToCreate = countEntitiesToCreate(structure);
    
    setCreatingAll(true);
    setCreationProgress({ current: 0, total: totalToCreate });
    setRollbackData([]); // Clear previous rollback data
    createdCountRef.current = 0;
    failedCountRef.current = 0;

    await createAllMissingEntities(structure);
    
    setCreatingAll(false);
    setCreationProgress(null);
    
    // Force a complete re-render of the structure after creation
    setStructure({ ...structure });
    
    // Check if all entities now exist
    const checkAllExist = (node: StructureEntity): boolean => {
      if (!node.exists) return false;
      if (node.children) {
        return node.children.every(child => checkAllExist(child));
      }
      return true;
    };

    const allExist = checkAllExist(structure);
    setAllEntitiesExist(allExist);
    
    // Check or create data structure if all entities now exist
    if (allExist) {
      await checkOrCreateDataStructure(structure);
    }
    
    // Show completion toast
    if (failedCountRef.current === 0) {
      showToast({
        title: "Success",
        description: `Created ${createdCountRef.current} entities successfully`,
        variant: "success"
      });
      
      // Trigger onComplete callback if all entities exist and no data structure errors
      if (allExist && onComplete && !completionCalled && !dataStructureError) {
        console.log('[GGK] All entities created, calling onComplete');
        setCompletionCalled(true);
        onComplete();
      }
    } else {
      showToast({
        title: "Partially Complete",
        description: `Created ${createdCountRef.current} entities, ${failedCountRef.current} failed. Use rollback if needed.`,
        variant: "warning"
      });
    }
  }

  // Handle individual entity creation
  async function handleCreateEntity(entity: StructureEntity) {
    const success = await createEntity(entity, entity.parentId, false);
    
    if (success) {
      // Check completion after individual creation
      if (structure) {
        const checkAllExist = (node: StructureEntity): boolean => {
          if (!node.exists) return false;
          if (node.children) {
            return node.children.every(child => checkAllExist(child));
          }
          return true;
        };
        
        const allExist = checkAllExist(structure);
        setAllEntitiesExist(allExist);
        
        if (allExist) {
          await checkOrCreateDataStructure(structure);

          if (onComplete && !completionCalled && !dataStructureError) {
            console.log('[GGK] All entities now exist after individual creation, calling onComplete');
            setCompletionCalled(true);
            onComplete();
          }
        }
      }
    }
  }

  // Handle region change
  async function handleRegionChange(regionId: string) {
    setSelectedRegionId(regionId);
    setDataStructureId(null);
    setDataStructureError(null);
    
    // Re-check data structure with new region
    if (structure && allEntitiesExist) {
      await checkOrCreateDataStructure(structure);
    }
  }

  // Toggle node expansion
  function toggleExpanded(nodeId: string) {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }

  // Handle select all/none
  function handleSelectAll(selectAll: boolean) {
    if (!structure) return;
    
    const newSelectedNodes = new Set<string>();
    
    if (selectAll) {
      const collectAllNodes = (node: StructureEntity) => {
        const nodeId = `${node.type}_${node.name}_${node.parentId || ""}`;
        newSelectedNodes.add(nodeId);
        if (node.children) {
          node.children.forEach(collectAllNodes);
        }
      };
      collectAllNodes(structure);
    }
    
    setSelectedNodes(newSelectedNodes);
  }

  // Get icon for entity type
  function getIcon(type: string) {
    switch (type) {
      case 'program': return Package;
      case 'provider': return Building2;
      case 'subject': return BookOpen;
      case 'unit': return FileStack;
      case 'topic': return Hash;
      case 'subtopic': return Tags;
      default: return FileText;
    }
  }

  // Count entities by type
  function countEntitiesByType(): Record<string, number> {
    const counts: Record<string, number> = {
      program: 0,
      provider: 0,
      subject: 0,
      unit: 0,
      topic: 0,
      subtopic: 0
    };

    function countNode(node: StructureEntity) {
      counts[node.type] = (counts[node.type] || 0) + 1;
      if (node.children) {
        node.children.forEach(countNode);
      }
    }

    if (structure) {
      countNode(structure);
    }

    return counts;
  }

  // Check if entity should be shown based on filter
  function shouldShowEntity(entity: StructureEntity): boolean {
    if (!filterByType) return true;
    
    // If filtering by type, check if this entity or any of its descendants match
    function hasMatchingType(node: StructureEntity): boolean {
      if (node.type === filterByType) return true;
      if (node.children) {
        return node.children.some(child => hasMatchingType(child));
      }
      return false;
    }
    
    return hasMatchingType(entity);
  }

  // Render a single entity
  function renderEntity(entity: StructureEntity, depth: number) {
    if (!shouldShowEntity(entity)) return null;

    const nodeId = `${entity.type}_${entity.name}_${entity.parentId || ""}`;
    const hasChildren = entity.children && entity.children.length > 0;
    const isExpanded = expandedNodes.has(nodeId);
    const Icon = getIcon(entity.type);
    const isSelected = selectedNodes.has(nodeId);
    
    // Don't render children if parent doesn't match filter
    const shouldRenderChildren = !filterByType || entity.type === filterByType || hasChildren;

    return (
      <div key={nodeId} className="transition-all duration-200">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer",
            depth > 0 && "ml-6",
            isSelected && "bg-[#E8F5DC] dark:bg-[#5D7E23]/20"
          )}
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(nodeId)}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          <Icon className={cn(
            "h-4 w-4 flex-shrink-0",
            entity.exists ? "text-gray-500 dark:text-gray-400" : "text-yellow-500 dark:text-yellow-400"
          )} />
          
          <span className={cn(
            "flex-1 text-sm",
            entity.exists ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-gray-100 font-medium"
          )}>
            {entity.name}
            {entity.code && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                ({entity.code})
              </span>
            )}
          </span>
          
          {/* Show potential duplicates warning */}
          {entity.potentialDuplicates && entity.potentialDuplicates.length > 0 && (
            <div className="group relative">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <div className="absolute right-0 top-6 z-10 hidden group-hover:block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[200px]">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Potential duplicates:</p>
                {entity.potentialDuplicates.map(dup => (
                  <p key={dup.id} className="text-xs text-gray-600 dark:text-gray-400">
                    • {dup.name}
                  </p>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {entity.loading && <Loader2 className="h-4 w-4 animate-spin text-[#99C93B]" />}
            {entity.error && (
              <div className="group relative">
                <XCircle className="h-4 w-4 text-red-500" />
                <div className="absolute right-0 top-6 z-10 hidden group-hover:block bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-3 min-w-[200px]">
                  <p className="text-xs text-red-600 dark:text-red-400">{entity.error}</p>
                </div>
              </div>
            )}
            {!entity.loading && !entity.error && (
              entity.exists ? (
                <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
              ) : (
                <button
                  onClick={() => !isOfflineMode && handleCreateEntity(entity)}
                  className={cn(
                    "p-1 rounded transition-colors",
                    isOfflineMode 
                      ? "text-gray-400 cursor-not-allowed" 
                      : "text-[#99C93B] hover:bg-[#E8F5DC] dark:text-[#AAD775] dark:hover:bg-blue-900/30"
                  )}
                  title={isOfflineMode ? "Cannot create entities in offline mode" : "Create this entity"}
                  disabled={isOfflineMode}
                >
                  <Plus className="h-3 w-3" />
                </button>
              )
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && shouldRenderChildren && (
          <div className="transition-all duration-300 overflow-hidden">
            {entity.children.map((child) =>
              renderEntity(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  }

  const entityCounts = countEntitiesByType();

  if (loading) {
    return (
      <div className={cn("bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm", className)}>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-[#99C93B] dark:text-[#AAD775] animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {isOfflineMode ? "Attempting to connect to database..." : "Analyzing imported structure..."}
          </p>
        </div>
      </div>
    );
  }

  if (!structure) {
    return (
      <div className={cn("bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm", className)}>
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-8 w-8 text-yellow-500 dark:text-yellow-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No academic structure found in this import.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-all", className)}>
      {/* Offline Mode Banner */}
      {isOfflineMode && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Offline Mode Active
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Database connection unavailable. Changes will be queued for when connection is restored.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}
      
      {/* Header with region selector */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Imported Structure Review
          </h3>
          
          {/* Select All checkbox */}
          <div 
            className="flex items-center gap-1 cursor-pointer ml-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleSelectAll(!structure || selectedNodes.size === 0)}
            title="Select/Deselect All"
          >
            {selectedNodes.size > 0 ? (
              <CheckSquare className="h-4 w-4 text-[#99C93B] dark:text-[#AAD775]" />
            ) : (
              <Square className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">Select All</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Region selector */}
          {availableRegions.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <select
                value={selectedRegionId || ''}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#99C93B]"
              >
                <option value="">Select Region</option>
                {availableRegions.map(region => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Filter by type dropdown */}
          <div className="relative">
            <select
              value={filterByType || ''}
              onChange={(e) => setFilterByType(e.target.value || null)}
              className="px-3 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#99C93B] cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="program">Programs</option>
              <option value="provider">Providers</option>
              <option value="subject">Subjects</option>
              <option value="unit">Units</option>
              <option value="topic">Topics</option>
              <option value="subtopic">Subtopics</option>
            </select>
            <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          
          {/* Rollback button */}
          {rollbackData.length > 0 && !isOfflineMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={rollbackCreatedEntities}
              disabled={loading}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Rollback ({rollbackData.length})
            </Button>
          )}
          
          {/* Create all button */}
          {!allEntitiesExist && showCreateAll && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleCreateAllMissing}
              disabled={creatingAll || !selectedRegionId || isOfflineMode}
              leftIcon={creatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              title={isOfflineMode ? "Cannot create entities in offline mode" : undefined}
            >
              {creatingAll ? 'Creating...' : isOfflineMode ? 'Offline - Cannot Create' : 'Create All Missing'}
            </Button>
          )}
          
          {allEntitiesExist && (
            <StatusBadge status="success" label="All Entities Exist" />
          )}
        </div>
      </div>

      {/* Progress bar for batch creation */}
      {creationProgress && (
        <div className="mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Creating entities: {creationProgress.current} / {creationProgress.total}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round((creationProgress.current / creationProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className="bg-[#99C93B] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(creationProgress.current / creationProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Data structure status */}
      {(dataStructureId || dataStructureError) && (
        <div className={cn(
          "mb-4 p-3 rounded-lg border",
          dataStructureError 
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        )}>
          <div className="flex items-start gap-2">
            {dataStructureError ? (
              <>
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Data Structure Error
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {dataStructureError}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Database className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Data Structure Configured
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    ID: {dataStructureId}
                  </p>
                  {structure && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {structure.name} → {structure.children?.[0]?.name} → {structure.children?.[0]?.children?.[0]?.name}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex items-center gap-1 flex-wrap border-b border-gray-200 dark:border-gray-700">
        {FILTER_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.id ? entityCounts[tab.id] || 0 : Object.values(entityCounts).reduce((a, b) => a + b, 0);
          
          return (
            <button
              key={tab.id || 'all'}
              onClick={() => setFilterByType(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                filterByType === tab.id
                  ? "border-[#99C93B] text-[#99C93B] dark:text-[#AAD775]"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{tab.label}</span>
              <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                {count}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Structure tree */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
        {structure && renderEntity(structure, 0)}
      </div>
      
      {/* Footer status */}
      {structure && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <p>
            {Object.values(entityCounts).reduce((a, b) => a + b, 0)} items in structure
          </p>
          {!allEntitiesExist && (
            <p className={cn(
              isOfflineMode ? "text-yellow-600 dark:text-yellow-400" : "text-yellow-600 dark:text-yellow-400"
            )}>
              {isOfflineMode 
                ? "Entities will be created when connection is restored" 
                : "Some entities need to be created"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}