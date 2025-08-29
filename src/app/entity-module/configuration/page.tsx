/**
 * File: /src/app/entity-module/configuration/page.tsx
 * Entity Configuration Management System
 * Manages Grade Levels, Academic Years, Departments, and Class Sections
 */

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
  Search,
  X,
  ChevronDown,
  Edit2,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  School,
  Hash,
  Mail,
  Phone,
  Clock,
  MapPin,
  User
} from 'lucide-react';

// ============ MAIN CONFIGURATION PAGE ============
const ConfigurationPage = () => {
  const [activeTab, setActiveTab] = useState('grade-levels');
  const [userCompanyId] = useState('550e8400-e29b-41d4-a716-446655440000');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <Settings className="w-8 h-8 text-white" />
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
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <Download className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Import</span>
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Configuration Access
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You have full access to configure all organizational settings and academic structures.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'grade-levels', label: 'Grade Levels', icon: GraduationCap },
                { id: 'academic-years', label: 'Academic Years', icon: Calendar },
                { id: 'departments', label: 'Departments', icon: Building2 },
                { id: 'class-sections', label: 'Class Sections', icon: Users }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab.id
                        ? 'border-green-500 text-green-600 dark:text-green-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'grade-levels' && <GradeLevelsTab companyId={userCompanyId} />}
            {activeTab === 'academic-years' && <AcademicYearsTab companyId={userCompanyId} />}
            {activeTab === 'departments' && <DepartmentsTab companyId={userCompanyId} />}
            {activeTab === 'class-sections' && <ClassSectionsTab companyId={userCompanyId} />}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ GRADE LEVELS TAB ============
const GradeLevelsTab = ({ companyId }) => {
  const [gradeLevels, setGradeLevels] = useState([
    { 
      id: '1', 
      school_id: '1', 
      grade_name: 'Grade 1', 
      grade_code: 'G1', 
      grade_order: 1, 
      education_level: 'primary', 
      max_students_per_section: 30,
      total_sections: 3,
      school_name: 'Main School', 
      status: 'active' 
    }
  ]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGrades = gradeLevels.filter(grade =>
    grade.grade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grade.grade_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Grade Levels</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage grade levels and their configurations
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Grade Level
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search grade levels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Grade Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredGrades.map((grade) => (
              <tr key={grade.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <GraduationCap className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{grade.grade_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {grade.grade_code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {grade.grade_order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    grade.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {grade.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingItem(grade);
                        setIsFormOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <FormModal
          title={editingItem ? 'Edit Grade Level' : 'Add Grade Level'}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
        >
          <GradeLevelForm
            editingItem={editingItem}
            onSave={(data) => {
              if (editingItem) {
                setGradeLevels(prev => prev.map(g => g.id === editingItem.id ? { ...g, ...data } : g));
              } else {
                setGradeLevels(prev => [...prev, { ...data, id: Date.now().toString(), school_name: 'Main School' }]);
              }
              setIsFormOpen(false);
              setEditingItem(null);
            }}
          />
        </FormModal>
      )}
    </div>
  );
};

// ============ ACADEMIC YEARS TAB ============
const AcademicYearsTab = ({ companyId }) => {
  const [academicYears, setAcademicYears] = useState([
    { 
      id: '1', 
      school_id: '1',
      year_name: '2024-2025', 
      school_name: 'Main School', 
      start_date: '2024-09-01', 
      end_date: '2025-06-30', 
      total_terms: 3,
      current_term: 1,
      is_current: true, 
      status: 'active' 
    }
  ]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Years</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage academic years and term schedules
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Academic Year
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Year Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {academicYears.map((year) => (
              <tr key={year.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{year.year_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    year.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {year.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingItem(year);
                        setIsFormOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <FormModal
          title={editingItem ? 'Edit Academic Year' : 'Add Academic Year'}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
        >
          <AcademicYearForm
            editingItem={editingItem}
            onSave={(data) => {
              if (editingItem) {
                setAcademicYears(prev => prev.map(y => y.id === editingItem.id ? { ...y, ...data } : y));
              } else {
                setAcademicYears(prev => [...prev, { ...data, id: Date.now().toString(), school_name: 'Main School' }]);
              }
              setIsFormOpen(false);
              setEditingItem(null);
            }}
          />
        </FormModal>
      )}
    </div>
  );
};

// ============ DEPARTMENTS TAB ============
const DepartmentsTab = ({ companyId }) => {
  const [departments, setDepartments] = useState([
    { 
      id: '1',
      company_id: companyId,
      school_id: '1',
      name: 'Mathematics', 
      code: 'MATH', 
      head_name: 'Dr. Smith',
      school_name: 'Main School',
      status: 'active' 
    }
  ]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Departments</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage academic and administrative departments
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Department Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Head
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {departments.map((dept) => (
              <tr key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{dept.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {dept.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {dept.head_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    dept.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {dept.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingItem(dept);
                        setIsFormOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <FormModal
          title={editingItem ? 'Edit Department' : 'Add Department'}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
        >
          <DepartmentForm
            editingItem={editingItem}
            onSave={(data) => {
              if (editingItem) {
                setDepartments(prev => prev.map(d => d.id === editingItem.id ? { ...d, ...data } : d));
              } else {
                setDepartments(prev => [...prev, { 
                  ...data, 
                  id: Date.now().toString(), 
                  company_id: companyId,
                  school_name: 'Main School' 
                }]);
              }
              setIsFormOpen(false);
              setEditingItem(null);
            }}
          />
        </FormModal>
      )}
    </div>
  );
};

// ============ CLASS SECTIONS TAB ============
const ClassSectionsTab = ({ companyId }) => {
  const [sections, setSections] = useState([
    { 
      id: '1',
      section_name: 'Section A', 
      section_code: 'SEC-A',
      max_capacity: 30,
      current_enrollment: 25,
      class_teacher_name: 'Mrs. Johnson',
      classroom_number: '101',
      grade_level_name: 'Grade 1',
      status: 'active' 
    }
  ]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Class Sections</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage class sections and student capacity
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Class Section
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Students
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sections.map((section) => (
              <tr key={section.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-indigo-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{section.section_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {section.current_enrollment} / {section.max_capacity}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                      <div 
                        className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${Math.min(100, (section.current_enrollment / section.max_capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    section.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {section.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingItem(section);
                        setIsFormOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <FormModal
          title={editingItem ? 'Edit Class Section' : 'Add Class Section'}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
        >
          <ClassSectionForm
            editingItem={editingItem}
            onSave={(data) => {
              if (editingItem) {
                setSections(prev => prev.map(s => s.id === editingItem.id ? { ...s, ...data } : s));
              } else {
                setSections(prev => [...prev, { 
                  ...data, 
                  id: Date.now().toString(), 
                  grade_level_name: 'Grade 1'
                }]);
              }
              setIsFormOpen(false);
              setEditingItem(null);
            }}
          />
        </FormModal>
      )}
    </div>
  );
};

// ============ FORM MODAL WRAPPER ============
const FormModal = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ============ FORM COMPONENTS ============
const GradeLevelForm = ({ editingItem, onSave }) => {
  const [formData, setFormData] = useState({
    grade_name: editingItem?.grade_name || '',
    grade_code: editingItem?.grade_code || '',
    grade_order: editingItem?.grade_order || 1,
    education_level: editingItem?.education_level || 'primary',
    status: editingItem?.status || 'active'
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Grade Name *
        </label>
        <input
          type="text"
          value={formData.grade_name}
          onChange={(e) => setFormData({ ...formData, grade_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g., Grade 1"
        />
      </div>
      <button
        onClick={() => onSave(formData)}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
      >
        {editingItem ? 'Update' : 'Create'}
      </button>
    </div>
  );
};

const AcademicYearForm = ({ editingItem, onSave }) => {
  const [formData, setFormData] = useState({
    year_name: editingItem?.year_name || '',
    start_date: editingItem?.start_date || '',
    end_date: editingItem?.end_date || '',
    status: editingItem?.status || 'active'
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Year Name *
        </label>
        <input
          type="text"
          value={formData.year_name}
          onChange={(e) => setFormData({ ...formData, year_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g., 2024-2025"
        />
      </div>
      <button
        onClick={() => onSave(formData)}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
      >
        {editingItem ? 'Update' : 'Create'}
      </button>
    </div>
  );
};

const DepartmentForm = ({ editingItem, onSave }) => {
  const [formData, setFormData] = useState({
    name: editingItem?.name || '',
    code: editingItem?.code || '',
    status: editingItem?.status || 'active'
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Department Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g., Mathematics"
        />
      </div>
      <button
        onClick={() => onSave(formData)}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
      >
        {editingItem ? 'Update' : 'Create'}
      </button>
    </div>
  );
};

const ClassSectionForm = ({ editingItem, onSave }) => {
  const [formData, setFormData] = useState({
    section_name: editingItem?.section_name || '',
    section_code: editingItem?.section_code || '',
    max_capacity: editingItem?.max_capacity || 30,
    current_enrollment: editingItem?.current_enrollment || 0,
    status: editingItem?.status || 'active'
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Section Name *
        </label>
        <input
          type="text"
          value={formData.section_name}
          onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g., Section A"
        />
      </div>
      <button
        onClick={() => onSave(formData)}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
      >
        {editingItem ? 'Update' : 'Create'}
      </button>
    </div>
  );
};

export default ConfigurationPage;