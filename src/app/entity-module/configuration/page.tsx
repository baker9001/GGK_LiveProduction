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
  const [userCompanyId, setUserCompanyId] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editingItem ? 'Edit Class Section' : 'Add Class Section'}
        </h3>
        
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Section Code
            </label>
            <input
              type="text"
              value={formData.section_code}
              onChange={(e) => setFormData({ ...formData, section_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., SEC-A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Class Teacher
            </label>
            <input
              type="text"
              value={formData.class_teacher_name}
              onChange={(e) => setFormData({ ...formData, class_teacher_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Teacher name"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={formData.classroom_number}
                onChange={(e) => setFormData({ ...formData, classroom_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Building
              </label>
              <input
                type="text"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Main"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Floor
              </label>
              <input
                type="number"
                min="0"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Capacity *
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Enrollment
              </label>
              <input
                type="number"
                min="0"
                max={formData.max_capacity}
                value={formData.current_enrollment}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value <= formData.max_capacity) {
                    setFormData({ ...formData, current_enrollment: value });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {formData.current_enrollment > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Capacity Usage
                </span>
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {Math.round((formData.current_enrollment / formData.max_capacity) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    (formData.current_enrollment / formData.max_capacity) > 0.9 
                      ? 'bg-red-500' 
                      : (formData.current_enrollment / formData.max_capacity) > 0.7
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, (formData.current_enrollment / formData.max_capacity) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            {editingItem ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPage;
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
                  Changes will affect all schools and branches within your organization.
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
    },
    { 
      id: '2', 
      school_id: '1', 
      grade_name: 'Grade 2', 
      grade_code: 'G2', 
      grade_order: 2, 
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
                Education Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                School
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Capacity
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
                  <span className="capitalize text-sm text-gray-900 dark:text-white">{grade.education_level}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {grade.school_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {grade.max_students_per_section} per section × {grade.total_sections} sections
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
        <GradeLevelForm
          editingItem={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
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

  const calculateDuration = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  };

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
                School
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Terms
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Current
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
                  {year.school_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {calculateDuration(year.start_date, year.end_date)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      Term {year.current_term} of {year.total_terms}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {year.is_current && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Current Year
                    </span>
                  )}
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
        <AcademicYearForm
          editingItem={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
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
      )}
    </div>
  );
};

// ============ DEPARTMENTS TAB (With hierarchy support) ============
const DepartmentsTab = ({ companyId }) => {
  const [departments, setDepartments] = useState([
    { 
      id: '1',
      company_id: companyId,
      school_id: '1',
      branch_id: null,
      name: 'Mathematics', 
      code: 'MATH', 
      description: 'Mathematics Department',
      head_id: '1',
      head_name: 'Dr. Smith',
      parent_department_id: null,
      school_name: 'Main School',
      status: 'active' 
    },
    { 
      id: '2',
      company_id: companyId,
      school_id: '1',
      branch_id: null,
      name: 'Applied Mathematics', 
      code: 'APP-MATH', 
      description: 'Applied Mathematics Sub-Department',
      head_id: '2',
      head_name: 'Dr. Johnson',
      parent_department_id: '1',
      parent_department_name: 'Mathematics',
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
                Parent Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Head
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                School
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
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{dept.name}</span>
                      {dept.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{dept.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {dept.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {dept.parent_department_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="w-3 h-3 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-900 dark:text-white">{dept.head_name || '-'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {dept.school_name}
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
        <DepartmentForm
          editingItem={editingItem}
          departments={departments}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
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
      )}
    </div>
  );
};

// ============ CLASS SECTIONS TAB (Updated with actual DB fields) ============
const ClassSectionsTab = ({ companyId }) => {
  const [sections, setSections] = useState([
    { 
      id: '1',
      grade_level_id: '1',
      academic_year_id: '1',
      section_name: 'Section A', 
      section_code: 'SEC-A',
      max_capacity: 30,
      current_enrollment: 25,
      class_teacher_id: '1',
      class_teacher_name: 'Mrs. Johnson',
      classroom_number: '101',
      building: 'Main Building',
      floor: 1,
      grade_level_name: 'Grade 1',
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
                Grade Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Class Teacher
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Location
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
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{section.section_name}</span>
                      {section.section_code && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{section.section_code}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {section.grade_level_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="w-3 h-3 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-900 dark:text-white">{section.class_teacher_name || 'Not Assigned'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="text-gray-900 dark:text-white">Room {section.classroom_number}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {section.building}, Floor {section.floor}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {section.current_enrollment} / {section.max_capacity}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                      <div 
                        className={`h-1.5 rounded-full ${
                          (section.current_enrollment / section.max_capacity) > 0.9 
                            ? 'bg-red-500' 
                            : (section.current_enrollment / section.max_capacity) > 0.7
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
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
        <ClassSectionForm
          editingItem={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSave={(data) => {
            if (editingItem) {
              setSections(prev => prev.map(s => s.id === editingItem.id ? { ...s, ...data } : s));
            } else {
              setSections(prev => [...prev, { 
                ...data, 
                id: Date.now().toString(), 
                grade_level_name: 'Grade 1',
                school_name: 'Main School' 
              }]);
            }
            setIsFormOpen(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

// ============ UPDATED FORM COMPONENTS ============

const GradeLevelForm = ({ editingItem, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    school_id: editingItem?.school_id || '',
    grade_name: editingItem?.grade_name || '',
    grade_code: editingItem?.grade_code || '',
    grade_order: editingItem?.grade_order || 1,
    education_level: editingItem?.education_level || 'primary',
    max_students_per_section: editingItem?.max_students_per_section || 30,
    total_sections: editingItem?.total_sections || 1,
    status: editingItem?.status || 'active'
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editingItem ? 'Edit Grade Level' : 'Add Grade Level'}
        </h3>
        
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grade Code
              </label>
              <input
                type="text"
                value={formData.grade_code}
                onChange={(e) => setFormData({ ...formData, grade_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., G1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grade Order *
              </label>
              <input
                type="number"
                min="1"
                value={formData.grade_order}
                onChange={(e) => setFormData({ ...formData, grade_order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Education Level *
            </label>
            <select
              value={formData.education_level}
              onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="kindergarten">Kindergarten</option>
              <option value="primary">Primary</option>
              <option value="middle">Middle</option>
              <option value="secondary">Secondary</option>
              <option value="senior">Senior</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Students/Section
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_students_per_section}
                onChange={(e) => setFormData({ ...formData, max_students_per_section: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Sections
              </label>
              <input
                type="number"
                min="1"
                value={formData.total_sections}
                onChange={(e) => setFormData({ ...formData, total_sections: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            {editingItem ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AcademicYearForm = ({ editingItem, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    school_id: editingItem?.school_id || '',
    year_name: editingItem?.year_name || '',
    start_date: editingItem?.start_date || '',
    end_date: editingItem?.end_date || '',
    total_terms: editingItem?.total_terms || 3,
    current_term: editingItem?.current_term || 1,
    is_current: editingItem?.is_current || false,
    status: editingItem?.status || 'active'
  });

  const handleSave = () => {
    // Validate dates
    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      alert('End date must be after start date');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editingItem ? 'Edit Academic Year' : 'Add Academic Year'}
        </h3>
        
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Terms
              </label>
              <input
                type="number"
                min="1"
                max="4"
                value={formData.total_terms}
                onChange={(e) => setFormData({ ...formData, total_terms: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Term
              </label>
              <input
                type="number"
                min="1"
                max={formData.total_terms}
                value={formData.current_term}
                onChange={(e) => setFormData({ ...formData, current_term: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Set as Current Year
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.is_current
                  ? 'This will be set as the current academic year' 
                  : 'This is not the current academic year'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_current: !formData.is_current })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_current ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_current ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            {editingItem ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DepartmentForm = ({ editingItem, departments, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    school_id: editingItem?.school_id || '',
    branch_id: editingItem?.branch_id || null,
    name: editingItem?.name || '',
    code: editingItem?.code || '',
    description: editingItem?.description || '',
    head_id: editingItem?.head_id || '',
    parent_department_id: editingItem?.parent_department_id || null,
    status: editingItem?.status || 'active'
  });

  const parentDepartments = departments.filter(d => d.id !== editingItem?.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editingItem ? 'Edit Department' : 'Add Department'}
        </h3>
        
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., MATH"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parent Department
            </label>
            <select
              value={formData.parent_department_id || ''}
              onChange={(e) => setFormData({ ...formData, parent_department_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">No Parent (Top Level)</option>
              {parentDepartments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Department description..."
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            {editingItem ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ClassSectionForm = ({ editingItem, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    grade_level_id: editingItem?.grade_level_id || '',
    academic_year_id: editingItem?.academic_year_id || '',
    section_name: editingItem?.section_name || '',
    section_code: editingItem?.section_code || '',
    max_capacity: editingItem?.max_capacity || 30,
    current_enrollment: editingItem?.current_enrollment || 0,
    class_teacher_id: editingItem?.class_teacher_id || '',
    class_teacher_name: editingItem?.class_teacher_name || '',
    classroom_number: editingItem?.classroom_number || '',
    building: editingItem?.building || '',
    floor: editingItem?.floor || 1,
    status: editingItem?.status || 'active'
  });

  const handleSave = () => {
    // Validate enrollment
    if (formData.current_enrollment > formData.max_capacity) {
      alert('Current enrollment cannot exceed maximum capacity');
      return;
    }
    onSave(formData);
  };

  return (