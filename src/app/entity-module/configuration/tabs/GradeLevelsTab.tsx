// Fetch grade levels
  const { 
    data: gradeLevels = [], 
    isLoading, 
    isFetching 
  } = useQuery(
    ['grade-levels', companyId, filters, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('grade_levels')
        .select(`
          id,
          grade_name,
          grade_code,
          grade_order,
          education_level,
          max_students_per_section,
          total_sections,
          status,
          created_at,
          grade_level_schools!inner (
            schools!grade_level_schools_school_id_fkey (
              id,
              name
            )
          )
        `)
        .order('grade_order', { ascending: true });

      // Apply school filtering based on scope
      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('grade_level_schools.school_id', scopeFilters.school_ids);
      } else if (!canAccessAll) {
        // No scope assigned, return empty
        return [];
      }

      // Apply additional filters
      if (filters.search) {
        query = query.or(`grade_name.ilike.%${filters.search}%,grade_code.ilike.%${filters.search}%`);
      }

      if (filters.school_ids.length > 0) {
        query = query.in('grade_level_schools.school_id', filters.school_ids);
      }

      if (filters.education_level.length > 0) {
        query = query.in('education_level', filters.education_level);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(grade => ({
        ...grade,
        school_ids: grade.grade_level_schools?.map(gls => gls.schools?.id) || [],
        school_names: grade.grade_level_schools?.map(gls => gls.schools?.name) || []
      }));
    },
      } else {
        // Create grade levels for each selected school
        const gradeRecords = validatedData.school_ids.map(schoolId => ({
          grade_name: validatedData.grade_name,
          grade_code: validatedData.grade_code,
          grade_order: validatedData.grade_order,
          education_level: validatedData.education_level,
          max_students_per_section: validatedData.max_students_per_section,
          total_sections: validatedData.total_sections,
          status: validatedData.status
        }));

        const { data: newGradeLevels, error } = await supabase
          .from('grade_levels')
          .insert(gradeRecords)
          .select();

        if (error) throw error;

        // Create junction table entries
        const junctionRecords = [];
        for (let i = 0; i < newGradeLevels.length; i++) {
          junctionRecords.push({
            grade_level_id: newGradeLevels[i].id,
            school_id: validatedData.school_ids[i]
          });
        }

        const { error: junctionError } = await supabase
          .from('grade_level_schools')
          .insert(junctionRecords);

        if (junctionError) throw junctionError;
        return newGradeLevels;
      }
    },
              onChange={(values) => {
                setFormState(prev => ({ ...prev, school_ids: values }));
              }}
              isMulti={true}
              placeholder="Select schools..."
            />
          </FormField>