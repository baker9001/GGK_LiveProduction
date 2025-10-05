import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Video,
  Music,
  FileText,
  Download,
  Eye,
  Search,
  Grid3x3,
  List,
  Filter,
  Globe,
  School
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useUser } from '../../../../contexts/UserContext';
import { getMaterialsForStudent, logMaterialAccess, StudentMaterial } from '../../../../services/materialsService';
import { MaterialPreview } from '../../../../components/shared/MaterialPreview';
import { toast } from '../../../../components/shared/Toast';

type MaterialType = 'all' | 'video' | 'ebook' | 'audio' | 'assignment';
type ViewMode = 'grid' | 'list';

function MaterialTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'video':
      return <Video className="h-5 w-5" />;
    case 'audio':
      return <Music className="h-5 w-5" />;
    case 'ebook':
      return <BookOpen className="h-5 w-5" />;
    case 'assignment':
      return <FileText className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

function SourceBadge({ sourceType }: { sourceType: 'global' | 'school' }) {
  if (sourceType === 'global') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
        <Globe className="h-3 w-3" />
        Global
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
      <School className="h-3 w-3" />
      School Resource
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function StudentLearningMaterialsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [selectedType, setSelectedType] = useState<MaterialType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewMaterial, setPreviewMaterial] = useState<StudentMaterial | null>(null);

  // Get subject info from navigation state
  const subjectName = (location.state as any)?.subjectName || 'Subject';
  const subjectLogo = (location.state as any)?.subjectLogo || null;

  // Fetch student ID
  const { data: studentId } = useQuery(
    ['student-id', user?.id],
    async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      // Explicitly return null instead of undefined to prevent cache issues
      return data?.id ?? null;
    },
    { enabled: !!user?.id }
  );

  // Fetch materials
  const {
    data: materials = [],
    isLoading,
    error
  } = useQuery(
    ['student-materials', studentId, subjectId],
    async () => {
      if (!studentId || !subjectId) return [];
      return getMaterialsForStudent(studentId, subjectId);
    },
    {
      enabled: !!studentId && !!subjectId,
      staleTime: 5 * 60 * 1000
    }
  );

  // Filter materials
  const filteredMaterials = materials.filter(material => {
    const matchesType = selectedType === 'all' || material.type === selectedType;
    const matchesSearch = !searchQuery ||
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handlePreview = async (material: StudentMaterial) => {
    if (studentId) {
      await logMaterialAccess(material.id, studentId, 'preview');
    }
    setPreviewMaterial(material);
  };

  const handleDownload = async (material: StudentMaterial) => {
    // Prevent video downloads - videos can only be streamed
    if (material.type === 'video') {
      toast.error('Video content cannot be downloaded for security reasons. You can stream it using the Preview button.');
      return;
    }

    if (studentId) {
      await logMaterialAccess(material.id, studentId, 'download');
    }
    window.open(material.file_url, '_blank');
  };

  useEffect(() => {
    if (materials.length > 0 && studentId) {
      // Log view access for the page
      materials.forEach(material => {
        logMaterialAccess(material.id, studentId, 'view');
      });
    }
  }, [materials, studentId]);

  const materialTypeCounts = {
    all: materials.length,
    video: materials.filter(m => m.type === 'video').length,
    ebook: materials.filter(m => m.type === 'ebook').length,
    audio: materials.filter(m => m.type === 'audio').length,
    assignment: materials.filter(m => m.type === 'assignment').length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/app/student-module/pathways')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Learning Pathway</span>
        </button>

        <div className="flex items-center gap-4 mb-2">
          {subjectLogo && (
            <img
              src={subjectLogo}
              alt={subjectName}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {subjectName} Materials
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Access learning resources and study materials
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Type Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['all', 'video', 'ebook', 'audio', 'assignment'] as MaterialType[]).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedType === type
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                <span className="ml-2 text-xs opacity-75">
                  ({materialTypeCounts[type]})
                </span>
              </button>
            ))}
          </div>

          {/* Search and View Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-300">
            Failed to load materials. Please try again later.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredMaterials.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No materials available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {searchQuery
              ? 'No materials match your search. Try different keywords.'
              : 'No learning materials have been added for this subject yet. Check back later or contact your teacher.'}
          </p>
        </div>
      )}

      {/* Materials Grid/List */}
      {!isLoading && !error && filteredMaterials.length > 0 && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredMaterials.map(material => (
            <div
              key={material.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-lg ${
                viewMode === 'list' ? 'flex items-center gap-4 p-4' : 'p-6'
              }`}
            >
              {/* Icon/Thumbnail */}
              <div
                className={`${
                  viewMode === 'grid'
                    ? 'w-12 h-12 mb-4'
                    : 'w-12 h-12 flex-shrink-0'
                } rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400`}
              >
                <MaterialTypeIcon type={material.type} />
              </div>

              {/* Content */}
              <div className={viewMode === 'list' ? 'flex-1 min-w-0' : ''}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {material.title}
                  </h3>
                  <SourceBadge sourceType={material.source_type} />
                </div>

                {material.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {material.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="capitalize">{material.type}</span>
                  <span>•</span>
                  <span>{formatFileSize(material.size)}</span>
                  <span>•</span>
                  <span>{new Date(material.created_at).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(material)}
                    className={`${material.type === 'video' ? 'flex-1' : 'flex-1'} flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors`}
                  >
                    <Eye className="h-4 w-4" />
                    {material.type === 'video' ? 'Stream Video' : 'Preview'}
                  </button>
                  {/* Hide download button for videos - security requirement */}
                  {material.type !== 'video' && (
                    <button
                      onClick={() => handleDownload(material)}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Material Preview Modal */}
      {previewMaterial && (
        <MaterialPreview
          materialId={previewMaterial.id}
          fileType={previewMaterial.type}
          fileUrl={previewMaterial.file_url}
          mimeType={previewMaterial.mime_type}
          title={previewMaterial.title}
          isOpen={!!previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}
    </div>
  );
}
