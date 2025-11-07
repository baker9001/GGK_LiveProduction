import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { SlideInForm } from '../../../components/shared/SlideInForm'; 
import { FormField, Input, Select } from '../../../components/shared/FormField';
import { SearchableMultiSelect } from '../../../components/shared/SearchableMultiSelect';
import { toast } from '../../../components/shared/Toast';

const licenseSchema = z.object({
  company_id: z.string().uuid('Please select a company'),
  data_structure_id: z.string().uuid('Please select a data structure'),
  total_allocated: z.number().min(1, 'Quantity must be greater than 0').optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  notes: z.string().optional()
}).refine(data => {
  const start = dayjs(data.start_date);
  const end = dayjs(data.end_date);
  return end.isAfter(start) || end.isSame(start);
}, {
  message: "End date must be after or equal to start date",
  path: ["end_date"]
});

interface LicenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialCompanyId?: string | null;
  onSuccess?: () => void;
  editingLicense?: any;
}

export function LicenseForm({ isOpen, onClose, initialCompanyId, onSuccess, editingLicense }: LicenseFormProps) {
  const queryClient = useQueryClient();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [duplicateLicenseInfo, setDuplicateLicenseInfo] = useState<any>(null);
  
  // Form state
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [dataStructureId, setDataStructureId] = useState<string>('');

  // Fetch companies with React Query
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch regions with React Query
  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('regions')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch programs based on selected region
  const { data: programs = [] } = useQuery({
    queryKey: ['programs', selectedRegion],
    queryFn: async () => {
      if (!selectedRegion) return [];

      // First, get unique program_ids from data_structures for the given region
      const { data: dataStructures } = await supabase
        .from('data_structures')
        .select('program_id')
        .eq('region_id', selectedRegion)
        .eq('status', 'active');

      if (dataStructures && dataStructures.length > 0) {
        // Extract unique program IDs
        const programIds = [...new Set(dataStructures.map(ds => ds.program_id))];

        // Then fetch the program details
        const { data: programsData } = await supabase
          .from('programs')
          .select('id, name')
          .in('id', programIds)
          .order('name');

        return programsData || [];
      }

      return [];
    },
    enabled: !!selectedRegion,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch providers based on selected region and program
  const { data: providers = [] } = useQuery({
    queryKey: ['providers', selectedRegion, selectedProgram],
    queryFn: async () => {
      if (!selectedRegion || !selectedProgram) return [];

      // First, get unique provider_ids from data_structures for the given region and program
      const { data: dataStructures } = await supabase
        .from('data_structures')
        .select('provider_id')
        .eq('region_id', selectedRegion)
        .eq('program_id', selectedProgram)
        .eq('status', 'active');

      if (dataStructures && dataStructures.length > 0) {
        // Extract unique provider IDs
        const providerIds = [...new Set(dataStructures.map(ds => ds.provider_id))];

        // Then fetch the provider details
        const { data: providersData } = await supabase
          .from('providers')
          .select('id, name')
          .in('id', providerIds)
          .order('name');

        return providersData || [];
      }

      return [];
    },
    enabled: !!selectedRegion && !!selectedProgram,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch subjects based on selected region, program, and provider
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', selectedRegion, selectedProgram, selectedProvider],
    queryFn: async () => {
      if (!selectedRegion || !selectedProgram || !selectedProvider) return [];

      // First, get data_structures with subject_ids for the given region, program, and provider
      const { data: dataStructures } = await supabase
        .from('data_structures')
        .select('id, subject_id')
        .eq('region_id', selectedRegion)
        .eq('program_id', selectedProgram)
        .eq('provider_id', selectedProvider)
        .eq('status', 'active');

      if (dataStructures && dataStructures.length > 0) {
        // Extract unique subject IDs
        const subjectIds = [...new Set(dataStructures.map(ds => ds.subject_id))];

        // Then fetch the subject details from edu_subjects table
        const { data: subjectsData } = await supabase
          .from('edu_subjects')
          .select('id, name, code, status')
          .in('id', subjectIds)
          .order('name');

        return subjectsData || [];
      }

      return [];
    },
    enabled: !!selectedRegion && !!selectedProgram && !!selectedProvider,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch license details for editing
  const { isLoading: isLoadingLicense } = useQuery({
    queryKey: ['license', editingLicense?.id],
    queryFn: async () => {
      if (!editingLicense) return null;

      // Fetch the complete license data with all relationships
      const { data: license, error } = await supabase
        .from('licenses')
        .select(`
          *,
          data_structures (
            id,
            region_id,
            program_id,
            provider_id,
            subject_id
          )
        `)
        .eq('id', editingLicense.id)
        .single();

      if (error) throw error;

      if (license) {
        // Set company
        setSelectedCompany(license.company_id);

        // Set region and fetch dependent data
        const regionId = license.data_structures.region_id;
        setSelectedRegion(regionId);

        // Set program and fetch dependent data
        const programId = license.data_structures.program_id;
        setSelectedProgram(programId);

        // Set provider and fetch dependent data
        const providerId = license.data_structures.provider_id;
        setSelectedProvider(providerId);

        // Set subject and data structure
        setSelectedSubject(license.data_structures.subject_id);
        setDataStructureId(license.data_structure_id);
      }

      return license;
    },
    enabled: !!editingLicense?.id,
    staleTime: 0, // Don't cache this query
  });

  // Create/update license mutation
  const licenseMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const totalQuantityValue = formData.get('total_quantity') as string;

      if (editingLicense) {
        // For UPDATE: only send editable fields to avoid unique constraint violation
        // The fields company_id, data_structure_id, and status are part of a unique constraint
        // and cannot be changed during edit, so we exclude them from the update payload
        const updateData = {
          start_date: formData.get('start_date') as string,
          end_date: formData.get('end_date') as string,
          notes: (formData.get('notes') || '') as string
        };

        // Validate dates
        const start = dayjs(updateData.start_date);
        const end = dayjs(updateData.end_date);
        if (!end.isAfter(start) && !end.isSame(start)) {
          throw new Error('End date must be after or equal to start date');
        }

        const { error } = await supabase
          .from('licenses')
          .update(updateData)
          .eq('id', editingLicense.id);

        if (error) {
          console.error('License UPDATE Error Details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            payload: updateData
          });
          throw error;
        }
        return { ...editingLicense, ...updateData };
      } else {
        // For INSERT: build complete data object with all required fields
        const data = {
          company_id: selectedCompany,
          data_structure_id: dataStructureId,
          total_allocated: totalQuantityValue ? parseInt(totalQuantityValue) : undefined,
          start_date: formData.get('start_date') as string,
          end_date: formData.get('end_date') as string,
          notes: (formData.get('notes') || '') as string,
          status: 'active'
        };

        // For new licenses, total_allocated is required
        if (!data.total_allocated) {
          throw new Error('Total quantity is required for new licenses');
        }

        const validatedData = licenseSchema.parse(data);

        const { data: newLicense, error } = await supabase
          .from('licenses')
          .insert([validatedData])
          .select()
          .maybeSingle();

        if (error) {
          console.error('License INSERT Error Details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            payload: validatedData
          });
          if (error.code === '23505') {
            throw new Error('An active license for this company and data structure already exists.');
          }
          throw error;
        }
        return newLicense;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      onSuccess?.();
      onClose();
      setIsSubmittingForm(false);
      toast.success(`License ${editingLicense ? 'updated' : 'created'} successfully`);
    },
    onError: (error) => {
      setIsSubmittingForm(false);
      console.error('License Mutation Error:', error);

      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setFormErrors(errors);
      } else if (error instanceof Error) {
        // Log the full error for debugging
        console.error('Full Error Object:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          error: error
        });

        // Check for Supabase unique constraint error
        if (error.message.includes('23505') ||
            error.message.includes('already exists') ||
            error.message.includes('unique constraint')) {
          setFormErrors({
            form: 'An active license for this company and data structure already exists. Please use Expand, Extend, or Renew.'
          });
          toast.error('An active license for this company and data structure already exists. Please use Expand, Extend, or Renew.');
        } else if (error.message.includes('total_quantity') || error.message.includes('total_allocated')) {
          setFormErrors({ total_quantity: error.message });
          toast.error(error.message);
        } else if (error.message.includes('permission') || error.message.includes('policy')) {
          setFormErrors({ form: `Permission Error: ${error.message}` });
          toast.error(`Permission Error: ${error.message}`);
        } else {
          setFormErrors({ form: error.message });
          toast.error(error.message);
        }
      } else {
        console.error('Unknown error type saving license:', error);
        setFormErrors({ form: 'Failed to save license. Please try again.' });
        toast.error('Failed to save license. Please try again.');
      }
    }
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form state when dialog closes
      setSelectedCompany('');
      setSelectedRegion('');
      setSelectedProgram('');
      setSelectedProvider('');
      setSelectedSubject('');
      setDataStructureId('');
      setFormErrors({});
      setDuplicateLicenseInfo(null);
    } else {
      // Reset mutation state when dialog opens
      // No need to reset mutation state here
    }
    
    // Set initial company if provided
    if (isOpen && initialCompanyId) {
      setSelectedCompany(initialCompanyId);
    }
  }, [isOpen, licenseMutation]);

  // Update data structure ID when subject changes
  useEffect(() => {
    const updateDataStructureId = async () => {
      if (selectedRegion && selectedProgram && selectedProvider && selectedSubject) {
        const { data } = await supabase
          .from('data_structures')
          .select('id')
          .eq('region_id', selectedRegion)
          .eq('program_id', selectedProgram)
          .eq('provider_id', selectedProvider)
          .eq('subject_id', selectedSubject)
          .maybeSingle();
        
        if (data) {
          setDataStructureId(data.id);
        } else {
          setDataStructureId('');
        }
      }
    };

    updateDataStructureId();
  }, [selectedRegion, selectedProgram, selectedProvider, selectedSubject]);

  // Check for duplicate license when creating new license
  useEffect(() => {
    const checkDuplicateLicense = async () => {
      // Only check for duplicates when creating new license (not editing)
      if (editingLicense || !selectedCompany || !dataStructureId) {
        setDuplicateLicenseInfo(null);
        return;
      }

      try {
        const { data: existingLicense } = await supabase
          .from('licenses')
          .select(`
            id,
            start_date,
            end_date,
            status,
            total_quantity,
            companies!inner(name),
            data_structures!inner(
              regions!inner(name),
              programs!inner(name),
              providers!inner(name),
              edu_subjects!inner(name)
            )
          `)
          .eq('company_id', selectedCompany)
          .eq('data_structure_id', dataStructureId)
          .eq('status', 'active')
          .maybeSingle();

        if (existingLicense) {
          setDuplicateLicenseInfo(existingLicense);
        } else {
          setDuplicateLicenseInfo(null);
        }
      } catch (error) {
        console.error('Error checking for duplicate license:', error);
        setDuplicateLicenseInfo(null);
      }
    };

    checkDuplicateLicense();
  }, [selectedCompany, dataStructureId, editingLicense]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent submission if duplicate license exists (only for new licenses)
    if (!editingLicense && duplicateLicenseInfo) {
      toast.error('Cannot create duplicate license. Please use Expand, Extend, or Renew.');
      return;
    }
    
    setIsSubmittingForm(true);
    licenseMutation.mutate(new FormData(e.currentTarget));
  };

  return (
    <SlideInForm
      title={editingLicense ? 'Edit License' : 'Create License'}
      isOpen={isOpen}
      onClose={onClose}
      onSave={() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }}
      loading={false}
      saveDisabled={!editingLicense && !!duplicateLicenseInfo}
      saveButtonText={editingLicense ? 'Save Changes' : 'Save'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formErrors.form && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {formErrors.form}
          </div>
        )}

        {/* Duplicate license warning */}
        {duplicateLicenseInfo && !editingLicense && (
          <div className="p-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
            <div className="font-medium mb-2">⚠️ Active License Already Exists</div>
            <div className="space-y-1 text-xs">
              <p><strong>Company:</strong> {duplicateLicenseInfo.companies?.name}</p>
              <p><strong>Region:</strong> {duplicateLicenseInfo.data_structures?.regions?.name}</p>
              <p><strong>Program:</strong> {duplicateLicenseInfo.data_structures?.programs?.name}</p>
              <p><strong>Provider:</strong> {duplicateLicenseInfo.data_structures?.providers?.name}</p>
              <p><strong>Subject:</strong> {duplicateLicenseInfo.data_structures?.edu_subjects?.name}</p>
              <p><strong>Period:</strong> {dayjs(duplicateLicenseInfo.start_date).format('MMM DD, YYYY')} - {dayjs(duplicateLicenseInfo.end_date).format('MMM DD, YYYY')}</p>
              <p><strong>Quantity:</strong> {duplicateLicenseInfo.total_quantity}</p>
            </div>
            <div className="mt-2 text-xs font-medium">
              Please use Expand, Extend, or Renew instead of creating a new license.
            </div>
          </div>
        )}

        <SearchableMultiSelect
          label="Company"
          options={companies.map(c => ({
            value: c.id,
            label: c.name
          }))}
          selectedValues={selectedCompany ? [selectedCompany] : []}
          onChange={values => setSelectedCompany(values[0])}
          isMulti={false}
          disabled={!!editingLicense || !!initialCompanyId}
        />

        <SearchableMultiSelect
          label="Region"
          options={regions.map(r => ({
            value: r.id,
            label: r.name
          }))}
          selectedValues={selectedRegion ? [selectedRegion] : []}
          onChange={values => {
            setSelectedRegion(values[0]);
            setSelectedProgram('');
            setSelectedProvider('');
            setSelectedSubject('');
            setDataStructureId('');
          }}
          isMulti={false}
          disabled={!selectedCompany || !!editingLicense}
        />

        <SearchableMultiSelect
          label="Program"
          options={programs.map(p => ({
            value: p.id,
            label: p.name
          }))}
          selectedValues={selectedProgram ? [selectedProgram] : []}
          onChange={values => {
            setSelectedProgram(values[0]);
            setSelectedProvider('');
            setSelectedSubject('');
            setDataStructureId('');
          }}
          isMulti={false}
          disabled={!selectedRegion || !!editingLicense}
        />

        <SearchableMultiSelect
          label="Provider"
          options={providers.map(p => ({
            value: p.id,
            label: p.name
          }))}
          selectedValues={selectedProvider ? [selectedProvider] : []}
          onChange={values => {
            setSelectedProvider(values[0]);
            setSelectedSubject('');
            setDataStructureId('');
          }}
          isMulti={false}
          disabled={!selectedProgram || !!editingLicense}
        />

        <SearchableMultiSelect
          label="Subject"
          options={subjects.map(s => ({
            value: s.id,
            label: s.name
          }))}
          selectedValues={selectedSubject ? [selectedSubject] : []}
          onChange={values => {
            setSelectedSubject(values[0]);
          }}
          isMulti={false}
          disabled={!selectedProvider || !!editingLicense}
        />

        {/* Only show Total Quantity field for new licenses */}
        {!editingLicense && (
          <FormField
            id="total_quantity"
            label="Total Quantity"
            required
            error={formErrors.total_quantity}
          >
            <Input
              id="total_quantity"
              name="total_quantity"
              type="number"
              min="1"
              placeholder="Enter quantity"
            />
          </FormField>
        )}

        <FormField
          id="start_date"
          label="Start Date"
          required
          error={formErrors.start_date}
        >
          <Input
            id="start_date"
            name="start_date"
            type="date"
            rightIcon={<Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
            hideNativeCalendarIcon={true}
            defaultValue={editingLicense?.start_date || dayjs().format('YYYY-MM-DD')}
          />
        </FormField>

        <FormField
          id="end_date"
          label="End Date"
          required
          error={formErrors.end_date}
        >
          <Input
            id="end_date"
            name="end_date"
            type="date"
            rightIcon={<Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
            hideNativeCalendarIcon={true}
            defaultValue={editingLicense?.end_date || dayjs().add(1, 'year').format('YYYY-MM-DD')}
          />
        </FormField>

        <FormField
          id="notes"
          label="Notes"
          error={formErrors.notes}
        >
          <Input
            id="notes"
            name="notes"
            placeholder="Enter notes (optional)"
            defaultValue={editingLicense?.notes}
          />
        </FormField>
      </form>
    </SlideInForm>
  );
}