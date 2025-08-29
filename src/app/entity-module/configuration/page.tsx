import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  GraduationCap, 
  Calendar, 
  Building2, 
  Users, 
  AlertTriangle, 
  Loader2,
  Info,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  X,
  ChevronDown,
  Phone,
  Mail,
  Hash,
  School,
  MapPin
} from 'lucide-react';

// Mock hooks and components (replace with actual imports in your app)
const useAccessControl = () => ({
  canViewTab: () => true,
  can: () => true,
  getUserContext: () => ({ companyId: 'test-company-123' }),
  isLoading: false,
  isAuthenticated: true,
  isEntityAdmin: true,
  isSubEntityAdmin: false,
  isSchoolAdmin: false,
  isBranchAdmin: false,
  hasError: false,
  error: null,
  getScopeFilters: () => ({ school_ids: [] }),
  canCreate: true,
  canEdit: true,
  canDelete: true
});

const useUser = () => ({
  user: { id: 'user-123', email: 'admin@test.com' }
});

// Simulated data fetching
const useQuery = (key, fetcher, options) => {
  const [data, setData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  
  React.useEffect(() => {
    if (key[0] === 'schools-for-years' || key[0] === 'schools') {
      setData([
        { id: 'school-1', name: 'Lincoln Elementary', status: 'active' },
        { id: 'school-2', name: 'Washington Middle School', status: 'active' },
        { id: 'school-3', name: 'Roosevelt High School', status: 'active' }
      ]);
    } else if (key[0] === 'academic-years') {
      setData([
        {
          id: 'year-1',
          school_id: 'school-1',
          school_name: 'Lincoln Elementary',
          year_name: '2024-2025',
          start_date: '2024-09-01',
          end_date: '2025-06-15',
          is_current: true,
          status: 'active',
          created_at: '2024-01-15'
        }
      ]);
    } else if (key[0] === 'departments') {
      setData([
        {
          id: 'dept-1',
          school_id: 'school-1',
          school_name: 'Lincoln Elementary',
          name: 'Mathematics',
          code: 'MATH',
          department_type: 'academic',
          head_of_department: 'Dr. Smith',
          contact_email: 'math@school.edu',
          contact_phone: '+1-555-0100',
          status: 'active',
          created_at: '2024-01-15'
        }
      ]);
    } else if (key[0] === 'grade-levels-for-sections') {
      setData([
        { id: 'grade-1', label: 'Grade 1 - Lincoln Elementary', school_id: 'school-1' },
        { id: 'grade-2', label: 'Grade 2 - Lincoln Elementary', school_id: 'school-1' }
      ]);
    } else if (key[0] === 'class-sections') {
      setData([
        {
          id: 'section-1',
          grade_level_id: 'grade-1',
          grade_level_name: 'Grade 1',
          school_name: 'Lincoln Elementary',
          section_name: 'Section A',
          section_code: 'SEC-A',
          room_number: '101',
          max_capacity: 30,
          current_enrollment: 25,
          status: 'active',
          created_at: '2024-01-15'
        }
      ]);
    } else if (key[0] === 'grade-levels') {
      setData([
        {
          id: 'level-1',
          grade_name: 'Grade 1',
          grade_code: 'G1',
          grade_order: 1,
          education_level: 'primary',
          max_students_per_section: 30,
          total_sections: 3,
          status: 'active',
          created_at: '2024-01-15',
          school_ids: ['school-1'],
          school_names: ['Lincoln Elementary']
        }
      ]);
    }
  }, [JSON.stringify(key)]);
  
  return { data, isLoading, isFetching: false };
};

const useMutation = (options) => ({
  mutate: () => console.log('Mutation called'),
  isLoading: false
});

const useQueryClient = () => ({
  invalidateQueries: () => console.log('Queries invalidated')
});

// UI Components
const Tabs = ({ value, onValueChange, children }) => {
  const [activeTab, setActiveTab] = useState(value);
  
  useEffect(() => {
    setActiveTab(value);
  }, [value]);
  
  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
    onValueChange(newValue);
  };
  
  return React.Children.map(children, child => {
    if (child?.type === TabsList || child?.type === TabsContent) {
      return React.cloneElement(child, { activeTab, onTabChange: handleTabChange });
    }
    return child;
  });
};

const TabsList = ({ children, activeTab, onTabChange }) => (
  <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
    {React.Children.map(children, child =>
      React.cloneElement(child, { activeTab, onTabChange })
    )}
  </div>
);

const TabsTrigger = ({ value, children, activeTab, onTabChange }) => (
  <button
    onClick={() => onTabChange(value)}
    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
      activeTab === value
        ? 'text-[#8CC63F] border-[#8CC63F]'
        : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
    }`}
  >
    {children}
  </button>
);

const TabsContent = ({ value, children, activeTab }) => {
  if (activeTab !== value) return null;
  return <div className="mt-6">{children}</div>;
};

const Button = ({ onClick, children, leftIcon, variant = 'primary', disabled = false, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      variant === 'outline'
        ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
        : variant === 'ghost'
        ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        : 'bg-[#8CC63F] text-white hover:bg-[#7AB635]'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {leftIcon && <span className="mr-2">{leftIcon}</span>}
    {children}
  </button>
);

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    status === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : status === 'completed'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  }`}>
    {status}
  </span>
);

const Input = ({ value, onChange, placeholder, type = 'text', leftIcon }) => (
  <div className="relative">
    {leftIcon && (
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {leftIcon}
      </div>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full ${leftIcon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F]`}
    />
  </div>
);

const Select = ({ value, onChange, options = [], placeholder = 'Select...' }) => (
  <select
    value={value}
    onChange={onChange}
    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F]"
  >
    <option value="">{placeholder}</option>
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const DataTable = ({ data, columns, isLoading, emptyMessage = 'No data found' }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map(col => (
              <th key={col.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row, idx) => (
            <tr key={row.id || idx}>
              {columns.map(col => (
                <td key={col.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {col.cell ? col.cell(row) : row[col.accessorKey]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Tab Components
const GradeLevelsTab = ({ companyId }) => {
  const { data: gradeLevels = [], isLoading } = useQuery(['grade-levels', companyId], null, {});
  const [isFormOpen, setIsFormOpen] = useState(false);

  const columns = [
    { id: 'grade_name', header: 'Grade Name', accessorKey: 'grade_name' },
    { id: 'grade_code', header: 'Code', accessorKey: 'grade_code' },
    { id: 'grade_order', header: 'Order', accessorKey: 'grade_order' },
    { id: 'education_level', header: 'Level', accessorKey: 'education_level' },
    { id: 'schools', header: 'Schools', cell: (row) => row.school_names?.join(', ') || 'N/A' },
    { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Grade Levels</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage grade levels and educational stages
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Grade Level
        </Button>
      </div>
      <DataTable data={gradeLevels} columns={columns} isLoading={isLoading} />
    </div>
  );
};

const AcademicYearsTab = ({ companyId }) => {
  const { data: academicYears = [], isLoading } = useQuery(['academic-years', companyId], null, {});
  const [isFormOpen, setIsFormOpen] = useState(false);

  const columns = [
    { id: 'year_name', header: 'Year Name', accessorKey: 'year_name' },
    { id: 'school', header: 'School', accessorKey: 'school_name' },
    { 
      id: 'duration', 
      header: 'Duration', 
      cell: (row) => `${new Date(row.start_date).toLocaleDateString()} - ${new Date(row.end_date).toLocaleDateString()}` 
    },
    { 
      id: 'is_current', 
      header: 'Current', 
      cell: (row) => row.is_current ? 
        <span className="text-green-600 dark:text-green-400 font-medium">Current</span> : null 
    },
    { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Years</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage academic years and term schedules
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Academic Year
        </Button>
      </div>
      <DataTable data={academicYears} columns={columns} isLoading={isLoading} />
    </div>
  );
};

const DepartmentsTab = ({ companyId }) => {
  const { data: departments = [], isLoading } = useQuery(['departments', companyId], null, {});
  const [isFormOpen, setIsFormOpen] = useState(false);

  const columns = [
    { id: 'name', header: 'Department', accessorKey: 'name' },
    { id: 'code', header: 'Code', accessorKey: 'code' },
    { id: 'school', header: 'School', accessorKey: 'school_name' },
    { 
      id: 'type', 
      header: 'Type', 
      cell: (row) => (
        <span className="capitalize text-sm">{row.department_type}</span>
      )
    },
    { id: 'head', header: 'Head', accessorKey: 'head_of_department' },
    { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Departments</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage academic and administrative departments
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Department
        </Button>
      </div>
      <DataTable data={departments} columns={columns} isLoading={isLoading} />
    </div>
  );
};

const ClassSectionsTab = ({ companyId }) => {
  const { data: classSections = [], isLoading } = useQuery(['class-sections', companyId], null, {});
  const [isFormOpen, setIsFormOpen] = useState(false);

  const columns = [
    { id: 'section_name', header: 'Section', accessorKey: 'section_name' },
    { id: 'code', header: 'Code', accessorKey: 'section_code' },
    { id: 'grade', header: 'Grade', accessorKey: 'grade_level_name' },
    { id: 'school', header: 'School', accessorKey: 'school_name' },
    { id: 'room', header: 'Room', accessorKey: 'room_number' },
    { 
      id: 'capacity', 
      header: 'Students', 
      cell: (row) => `${row.current_enrollment || 0}/${row.max_capacity}` 
    },
    { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Class Sections</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage class sections and student capacity
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Class Section
        </Button>
      </div>
      <DataTable data={classSections} columns={columns} isLoading={isLoading} />
    </div>
  );
};

// Main Component
export default function ConfigurationPage() {
  const { user } = useUser();
  const {
    canViewTab,
    getUserContext,
    isLoading: isAccessControlLoading,
    isAuthenticated,
    isEntityAdmin,
    isSubEntityAdmin,
    hasError: accessControlError,
    error: accessControlErrorMessage
  } = useAccessControl();

  const [activeTab, setActiveTab] = useState('grade-levels');
  const [userCompanyId, setUserCompanyId] = useState(null);

  useEffect(() => {
    const userContext = getUserContext();
    if (userContext?.companyId) {
      setUserCompanyId(userContext.companyId);
    }
  }, [getUserContext]);

  if (isAccessControlLoading || !userCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#8CC63F] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Configuration
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Checking permissions and loading data...
          </p>
        </div>
      </div>
    );
  }

  if (accessControlError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Access Control Error
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {accessControlErrorMessage || 'Failed to load access permissions.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 rounded-full flex items-center justify-center">
              <Settings className="w-8 h-8 text-[#8CC63F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Entity Configuration
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configure academic structure, departments, and organizational settings
              </p>
            </div>
          </div>

          {(isEntityAdmin || isSubEntityAdmin) && (
            <div className="flex items-center gap-1 px-3 py-1 bg-[#8CC63F]/10 rounded-lg">
              <Shield className="w-4 h-4 text-[#8CC63F]" />
              <span className="text-sm font-medium text-[#8CC63F]">
                Full Access
              </span>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Configuration Access
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {isEntityAdmin || isSubEntityAdmin 
                  ? "You have full access to configure all organizational settings."
                  : "Your configuration access may be limited based on your role."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="grade-levels">
              <GraduationCap className="w-4 h-4 mr-2" />
              Grade Levels
            </TabsTrigger>
            <TabsTrigger value="academic-years">
              <Calendar className="w-4 h-4 mr-2" />
              Academic Years
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building2 className="w-4 h-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="class-sections">
              <Users className="w-4 h-4 mr-2" />
              Class Sections
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="grade-levels">
            <GradeLevelsTab companyId={userCompanyId} />
          </TabsContent>

          <TabsContent value="academic-years">
            <AcademicYearsTab companyId={userCompanyId} />
          </TabsContent>

          <TabsContent value="departments">
            <DepartmentsTab companyId={userCompanyId} />
          </TabsContent>

          <TabsContent value="class-sections">
            <ClassSectionsTab companyId={userCompanyId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}