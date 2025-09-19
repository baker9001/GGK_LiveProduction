// ======================================
// ENHANCED SUBJECTS PAGE - /src/app/landing/subjects/page.tsx
// Complete IGCSE/Cambridge/Edexcel subjects listing with SEO optimization
// ======================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Calculator, 
  Atom, 
  Globe, 
  Palette, 
  Music, 
  Dumbbell, 
  Languages,
  ArrowRight,
  GraduationCap,
  Award,
  Clock,
  Users,
  FileText,
  Video,
  ChevronDown,
  CheckCircle,
  Star,
  Target,
  Zap,
  Search
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

// Enhanced Subjects Data matching landing page
const IGCSE_SUBJECTS = [
  {
    id: 'mathematics',
    name: 'IGCSE Mathematics',
    icon: Calculator,
    description: 'Complete Cambridge (0580/0606) & Edexcel (4MA1) Mathematics with extended & core levels',
    levels: ['Core', 'Extended', 'Additional Mathematics', 'Further Pure'],
    examBoards: ['Cambridge', 'Edexcel', 'AQA', 'OCR'],
    syllabusCodes: ['0580', '0606', '4MA1'],
    resources: ['10+ Years Past Papers', 'Video Solutions', 'Topic Tests', 'Mock Exams'],
    passRate: '96%',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  {
    id: 'physics',
    name: 'IGCSE Physics',
    icon: Atom,
    description: 'Cambridge (0625) & Edexcel (4PH1) Physics with practical skills and lab simulations',
    levels: ['Core', 'Extended', 'A-Level Bridge'],
    examBoards: ['Cambridge', 'Edexcel', 'AQA'],
    syllabusCodes: ['0625', '4PH1'],
    resources: ['Animated Concepts', 'Virtual Labs', 'Past Papers', 'Formula Sheets'],
    passRate: '94%',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-300'
  },
  {
    id: 'chemistry',
    name: 'IGCSE Chemistry',
    icon: Atom,
    description: 'Cambridge (0620) & Edexcel (4CH1) Chemistry with 3D molecular models',
    levels: ['Core', 'Extended', 'Triple Science'],
    examBoards: ['Cambridge', 'Edexcel', 'AQA'],
    syllabusCodes: ['0620', '4CH1'],
    resources: ['Virtual Labs', '3D Molecules', 'Equation Balancer', 'Past Papers'],
    passRate: '93%',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
    textColor: 'text-green-700 dark:text-green-300'
  },
  {
    id: 'biology',
    name: 'IGCSE Biology',
    icon: Atom,
    description: 'Cambridge (0610) & Edexcel (4BI1) Biology with interactive diagrams',
    levels: ['Core', 'Extended', 'Human Biology'],
    examBoards: ['Cambridge', 'Edexcel', 'AQA'],
    syllabusCodes: ['0610', '4BI1'],
    resources: ['3D Anatomy', 'Process Animations', 'Virtual Dissections', 'Past Papers'],
    passRate: '95%',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-700',
    textColor: 'text-emerald-700 dark:text-emerald-300'
  },
  {
    id: 'english-language',
    name: 'IGCSE English Language',
    icon: BookOpen,
    description: 'First Language (0500) & Second Language (0510/0511) English mastery',
    levels: ['First Language', 'Second Language', 'Literature in English'],
    examBoards: ['Cambridge', 'Edexcel', 'AQA'],
    syllabusCodes: ['0500', '0510', '0511', '4EA1', '4EB1'],
    resources: ['Writing Templates', 'Speaking Practice', 'Model Essays', 'Past Papers'],
    passRate: '92%',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-700',
    textColor: 'text-indigo-700 dark:text-indigo-300'
  },
  {
    id: 'computer-science',
    name: 'IGCSE Computer Science',
    icon: BookOpen,
    description: 'Cambridge (0478) & Edexcel programming, algorithms, and computational thinking',
    levels: ['Theory', 'Practical Programming', 'Problem Solving'],
    examBoards: ['Cambridge', 'Edexcel', 'OCR'],
    syllabusCodes: ['0478', '0984', '4CP1'],
    resources: ['Code Compiler', 'Algorithm Visualizer', 'Project Ideas', 'Past Papers'],
    passRate: '91%',
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-700',
    textColor: 'text-gray-700 dark:text-gray-300'
  },
  {
    id: 'economics',
    name: 'IGCSE Economics',
    icon: Globe,
    description: 'Cambridge (0455) & Edexcel micro and macroeconomics with real-world applications',
    levels: ['Basic Economic Ideas', 'Microeconomics', 'Macroeconomics', 'International Trade'],
    examBoards: ['Cambridge', 'Edexcel'],
    syllabusCodes: ['0455', '4EC1'],
    resources: ['Case Studies', 'Data Response Practice', 'Essay Guides', 'Past Papers'],
    passRate: '90%',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700',
    textColor: 'text-orange-700 dark:text-orange-300'
  },
  {
    id: 'business-studies',
    name: 'IGCSE Business Studies',
    icon: Globe,
    description: 'Cambridge (0450) & Edexcel business concepts with real case studies',
    levels: ['Business Activity', 'Marketing', 'Finance', 'Operations'],
    examBoards: ['Cambridge', 'Edexcel'],
    syllabusCodes: ['0450', '4BS1'],
    resources: ['Business Plans', 'Financial Calculator', 'Case Studies', 'Past Papers'],
    passRate: '93%',
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    borderColor: 'border-teal-200 dark:border-teal-700',
    textColor: 'text-teal-700 dark:text-teal-300'
  }
];

// A-Level subjects
const A_LEVEL_SUBJECTS = [
  {
    name: 'A-Level Mathematics',
    codes: ['9709', 'P1-P6'],
    boards: 'Cambridge & Edexcel',
    modules: ['Pure Mathematics', 'Mechanics', 'Statistics', 'Further Mathematics']
  },
  {
    name: 'A-Level Physics',
    codes: ['9702', 'WPH11-16'],
    boards: 'Cambridge & Edexcel',
    modules: ['Mechanics', 'Waves', 'Electricity', 'Nuclear Physics']
  },
  {
    name: 'A-Level Chemistry',
    codes: ['9701', 'WCH11-16'],
    boards: 'Cambridge & Edexcel',
    modules: ['Physical', 'Inorganic', 'Organic', 'Analysis']
  },
  {
    name: 'A-Level Biology',
    codes: ['9700', 'WBI11-16'],
    boards: 'Cambridge & Edexcel',
    modules: ['Cell Biology', 'Genetics', 'Ecology', 'Human Biology']
  }
];

export default function SubjectsPage() {
  const [selectedBoard, setSelectedBoard] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('igcse');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);

  const toggleSubjectExpansion = (subjectId: string) => {
    setExpandedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const filteredSubjects = IGCSE_SUBJECTS.filter(subject => {
    const matchesBoard = selectedBoard === 'all' || subject.examBoards.includes(selectedBoard);
    const matchesSearch = subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         subject.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBoard && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced Header with SEO-friendly content */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center shadow-lg">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            IGCSE, O-Level & A-Level Subjects
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto mb-4">
            Complete Cambridge International (CIE) and Pearson Edexcel curriculum coverage with 
            10+ years of past papers, video lessons, and exam-specific resources
          </p>
          
          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#8CC63F]" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Official Syllabus Coverage
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#8CC63F]" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                95% Pass Rate
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-[#8CC63F]" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                50,000+ Students
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search subjects, codes, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* Exam Board Filter */}
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Exam Boards</option>
              <option value="Cambridge">Cambridge International</option>
              <option value="Edexcel">Pearson Edexcel</option>
              <option value="AQA">AQA</option>
              <option value="OCR">OCR</option>
            </select>
            
            {/* Level Filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="igcse">IGCSE</option>
              <option value="olevel">O-Level</option>
              <option value="alevel">A-Level</option>
              <option value="as">AS Level</option>
            </select>
          </div>
        </div>

        {/* IGCSE Subjects Grid with Enhanced Cards */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            IGCSE Core Subjects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => {
              const IconComponent = subject.icon;
              const isExpanded = expandedSubjects.includes(subject.id);
              
              return (
                <div
                  key={subject.id}
                  className={`${subject.bgColor} ${subject.borderColor} border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
                >
                  {/* Card Header */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${subject.color} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#8CC63F] text-white text-xs px-2 py-1 rounded-full font-semibold">
                          {subject.passRate} Pass
                        </span>
                      </div>
                    </div>
                    
                    <h3 className={`text-xl font-semibold ${subject.textColor} mb-2`}>
                      {subject.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {subject.description}
                    </p>
                    
                    {/* Exam Boards & Codes */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Syllabus Codes:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {subject.syllabusCodes.map((code) => (
                          <span
                            key={code}
                            className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Resources Preview */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Resources Include:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {subject.resources.slice(0, isExpanded ? 4 : 2).map((resource) => (
                          <div key={resource} className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-[#8CC63F]" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {resource}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                              Available Levels:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {subject.levels.map((level) => (
                                <span
                                  key={level}
                                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                                >
                                  {level}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                              Exam Boards:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {subject.examBoards.map((board) => (
                                <span
                                  key={board}
                                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                                >
                                  {board}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={() => toggleSubjectExpansion(subject.id)}
                        className={`text-sm font-medium ${subject.textColor} hover:opacity-80 transition-opacity`}
                      >
                        {isExpanded ? 'Show Less' : 'Learn More'}
                        <ChevronDown className={`inline ml-1 h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <Link
                        to={`/subjects/${subject.id}`}
                        className="inline-flex items-center text-sm font-medium text-[#8CC63F] hover:text-[#7AB635] transition-colors"
                      >
                        Start Learning
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* A-Level Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            A-Level Advanced Subjects
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {A_LEVEL_SUBJECTS.map((subject, index) => (
                <div key={index} className="border-l-4 border-[#8CC63F] pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {subject.name}
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Syllabus Codes:</span> {subject.codes.join(', ')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Exam Boards:</span> {subject.boards}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {subject.modules.map((module) => (
                        <span
                          key={module}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                        >
                          {module}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-gradient-to-r from-[#8CC63F] to-[#7AB635] rounded-2xl p-8 mb-16 text-white">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Why Choose GGK for IGCSE & A-Level?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Comprehensive exam preparation aligned with official Cambridge and Edexcel specifications
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">15,000+ Past Papers</h3>
              <p className="text-sm opacity-90">
                Complete database from 2010-2024 with mark schemes
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">3,000+ Video Lessons</h3>
              <p className="text-sm opacity-90">
                Animated explanations for every topic
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Mock Exams</h3>
              <p className="text-sm opacity-90">
                AI-powered exam simulations with instant feedback
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Expert Teachers</h3>
              <p className="text-sm opacity-90">
                24/7 support from qualified IGCSE teachers
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gray-900 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Excel in Your IGCSE & A-Level Exams?
            </h2>
            <p className="text-xl mb-6 opacity-90 max-w-2xl mx-auto">
              Join 50,000+ students achieving top grades with our comprehensive resources
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signin"
                className="inline-flex items-center px-8 py-3 bg-[#8CC63F] hover:bg-[#7AB635] text-white font-semibold rounded-lg transition-colors duration-200"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-gray-900 transition-colors duration-200"
              >
                Request Demo
                <Zap className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}