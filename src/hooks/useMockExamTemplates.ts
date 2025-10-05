import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MockExamTemplateService, type MockExamTemplate, type CreateTemplateData } from '../services/mockExamTemplateService';
import toast from 'react-hot-toast';

export function useMockExamTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: ['mockExamTemplates', companyId],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return MockExamTemplateService.getTemplatesForCompany(companyId);
    },
    enabled: !!companyId,
  });
}

export function usePopularTemplates(companyId: string | undefined, limit: number = 5) {
  return useQuery({
    queryKey: ['mockExamTemplates', 'popular', companyId, limit],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return MockExamTemplateService.getPopularTemplates(companyId, limit);
    },
    enabled: !!companyId,
  });
}

export function useRecentTemplates(companyId: string | undefined, limit: number = 5) {
  return useQuery({
    queryKey: ['mockExamTemplates', 'recent', companyId, limit],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return MockExamTemplateService.getRecentTemplates(companyId, limit);
    },
    enabled: !!companyId,
  });
}

export function useCreateTemplate(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateData: CreateTemplateData) =>
      MockExamTemplateService.createTemplate(companyId, templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExamTemplates'] });
      toast.success('Template saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save template');
    },
  });
}

export function useCreateTemplateFromExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, templateName, templateDescription }: {
      examId: string;
      templateName: string;
      templateDescription?: string;
    }) => MockExamTemplateService.createTemplateFromExam(examId, templateName, templateDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExamTemplates'] });
      toast.success('Template created from exam successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create template from exam');
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, updates }: {
      templateId: string;
      updates: Partial<CreateTemplateData>;
    }) => MockExamTemplateService.updateTemplate(templateId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExamTemplates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update template');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => MockExamTemplateService.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExamTemplates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });
}

export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => MockExamTemplateService.incrementUsage(templateId),
    onSuccess: () => {
      // Silently update - don't show toast for usage tracking
      queryClient.invalidateQueries({ queryKey: ['mockExamTemplates'] });
    },
    onError: (error: Error) => {
      // Don't show error toast for non-critical usage tracking
      console.error('Failed to increment template usage:', error);
    },
  });
}

export function useSearchTemplates(companyId: string | undefined, query: string) {
  return useQuery({
    queryKey: ['mockExamTemplates', 'search', companyId, query],
    queryFn: () => {
      if (!companyId) throw new Error('Company ID is required');
      return MockExamTemplateService.searchTemplates(companyId, query);
    },
    enabled: !!companyId && query.length > 0,
  });
}
