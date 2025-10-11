// ======================================
// ENHANCED RESOURCES PAGE - /src/app/landing/resources/page.tsx
// Complete IGCSE/Cambridge/Edexcel resources with past papers, mock exams, videos
// ======================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Video, 
  Headphones, 
  Download, 
  BookOpen, 
  Laptop,
  Users,
  Clock,
  ArrowRight,
  Play,
  Eye,
  Star,
  Calendar,
  Search,
  Filter,
  Award,
  Target,
  Zap,
  CheckCircle,
  TrendingUp,
  FileQuestion
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

// Enhanced Resource Categories with IGCSE/Cambridge/Edexcel focus
const RESOURCE_CATEGORIES = [
  {
    id: 'past-papers',
    name: 'Past Papers Database',
    icon: FileText,
    description: 'Complete Cambridge & Edexcel past papers from 2010-2024 with mark schemes',
    count: '15,000+',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-[#E8F5DC] dark:bg-[#5D7E23]/20',
    borderColor: 'border-[#99C93B]/30 dark:border-blue-700',
    textColor: 'text-[#5D7E23] dark:text-[#AAD775]',
    items: [
      'Cambridge IGCSE Papers',
      'Edexcel International Papers',
      'Mark Schemes & Grade Boundaries',
      'Examiner Reports',
      'Specimen Papers',
      'Alternative to Practical Papers'
    ],
    featured: true
  },
  {
    id: 'video-lessons',
    name: 'Animated Video Lessons',
    icon: Video,
    description: 'Topic-wise animated explanations aligned with exam board specifications',
    count: '3,000+',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300',
    items: [
      'Concept Animations',
      'Problem Solving Walkthroughs',
      'Lab Experiment Demos',
      'Exam Technique Videos',
      'Past Paper Solutions',
      'Quick Revision Videos'
    ],
    featured: true
  },
  {
    id: 'mock-exams',
    name: 'Mock Exam Platform',
    icon: FileQuestion,
    description: 'AI-powered mock exams with instant grading and detailed feedback',
    count: '500+',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
    textColor: 'text-green-700 dark:text-green-300',
    items: [
      'Timed Mock Tests',
      'Instant AI Grading',
      'Performance Analytics',
      'Topic-wise Tests',
      'Chapter Tests',
      'Full Paper Simulations'
    ],
    featured: true
  },
  {
    id: 'revision-notes',
    name: 'Revision Materials',
    icon: BookOpen,
    description: 'Concise revision notes following Cambridge & Edexcel syllabi',
    count: '2,000+',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-[#E8F5DC] dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-300',
    items: [
      'Topic Summaries',
      'Formula Sheets',
      'Mind Maps',
      'Flashcards',
      'Quick Reference Guides',
      'Exam Tips & Tricks'
    ]
  },
  {
    id: 'interactive-tools',
    name: 'Interactive Learning Tools',
    icon: Laptop,
    description: 'Virtual labs, simulations, and calculators for hands-on learning',
    count: '800+',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-[#E8F5DC] dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-700',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    items: [
      'Virtual Science Labs',
      'Graph Plotters',
      'Equation Solvers',
      '3D Molecule Viewer',
      'Physics Simulations',
      'Chemistry Calculators'
    ]
  },
  {
    id: 'teacher-resources',
    name: 'Teacher Resources',
    icon: Users,
    description: 'Lesson plans, schemes of work, and teaching guides',
    count: '1,500+',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700',
    textColor: 'text-orange-700 dark:text-orange-300',
    items: [
      'Lesson Plans',
      'Schemes of Work',
      'PowerPoint Presentations',
      'Worksheets & Activities',
      'Assessment Rubrics',
      'Progress Trackers'
    ]
  }
];

// Featured Past Papers by Subject
const FEATURED_PAPERS = [
  {
    title: 'IGCSE Mathematics (0580) - May/June 2024',
    board: 'Cambridge',
    type: 'Complete Paper Set',
    subject: 'Mathematics',
    rating: 4.9,
    downloads: '25.5K',
    components: ['Paper 2', 'Paper 4', 'Paper 6', 'Mark Schemes'],
    difficulty: 'Extended',
    thumbnail: 'https://images.pexels.com/photos/6256/mathematics-blackboard-education-classroom.jpg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    title: 'IGCSE Physics (0625) - Oct/Nov 2023',
    board: 'Cambridge',
    type: 'Complete Paper Set',
    subject: 'Physics',
    rating: 4.8,
    downloads: '18.2K',
    components: ['Theory', 'ATP', 'Practical', 'Mark Schemes'],
    difficulty: 'Core & Extended',
    thumbnail: 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    title: 'International GCSE Chemistry (4CH1) - January 2024',
    board: 'Edexcel',
    type: 'Complete Paper Set',
    subject: 'Chemistry',
    rating: 4.9,
    downloads: '15.8K',
    components: ['Paper 1C', 'Paper 2C', 'Mark Schemes'],
    difficulty: 'Higher Tier',
    thumbnail: 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    title: 'IGCSE English Language (0500) - May/June 2024',
    board: 'Cambridge',
    type: 'Complete Paper Set',
    subject: 'English',
    rating: 4.7,
    downloads: '20.3K',
    components: ['Paper 1', 'Paper 2', 'Insert', 'Mark Schemes'],
    difficulty: 'First Language',
    thumbnail: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400'
  }
];

// Statistics Data
const RESOURCE_STATS = [
  { label: 'Past Papers', value: '15,000+', icon: FileText },
  { label: 'Video Lessons', value: '3,000+', icon: Video },
  { label: 'Mock Exams', value: '500+', icon: Target },
  { label: 'Active Users', value: '50,000+', icon: Users },
  { label: 'Success Rate', value: '95%', icon: TrendingUp },
  { label: 'Subjects', value: '30+', icon: BookOpen }
];

export default function ResourcesPage() {
  const [selectedBoard, setSelectedBoard] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center shadow-lg">
              <Download className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            IGCSE & A-Level Learning Resources
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto mb-4">
            Access the most comprehensive collection of Cambridge and Edexcel past papers, 
            video lessons, mock exams, and revision materials
          </p>
          
          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#8CC63F]" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Updated Daily
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#8CC63F]" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Exam Board Verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-[#8CC63F]" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                4.9/5 Rating
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search papers, videos, notes by code or topic..."
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
              <option value="all">All Boards</option>
              <option value="cambridge">Cambridge</option>
              <option value="edexcel">Edexcel</option>
              <option value="aqa">AQA</option>
              <option value="ocr">OCR</option>
            </select>
            
            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Subjects</option>
              <option value="mathematics">Mathematics</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
              <option value="english">English</option>
              <option value="computer-science">Computer Science</option>
            </select>
            
            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
              <option value="older">Before 2020</option>
            </select>
          </div>
        </div>

        {/* Resource Categories Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Resource Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {RESOURCE_CATEGORIES.map((category) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.id}
                  className={`${category.bgColor} ${category.borderColor} border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer ${
                    category.featured ? 'ring-2 ring-[#8CC63F] ring-opacity-50' : ''
                  }`}
                >
                  {category.featured && (
                    <div className="flex justify-end mb-2">
                      <span className="bg-[#8CC63F] text-white text-xs px-2 py-1 rounded-full font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-lg font-bold ${category.textColor}`}>
                      {category.count}
                    </span>
                  </div>
                  
                  <h3 className={`text-xl font-semibold ${category.textColor} mb-2`}>
                    {category.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {category.description}
                  </p>
                  
                  <div className="space-y-2">
                    {category.items.map((item) => (
                      <div key={item} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-3 h-3 text-[#8CC63F] mr-2 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to={`/resources/${category.id}`}
                      className="inline-flex items-center text-sm font-medium text-[#8CC63F] hover:text-[#7AB635] transition-colors"
                    >
                      Browse Collection
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Featured Past Papers */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Latest Past Papers & Mark Schemes
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Recently added Cambridge and Edexcel examination papers
              </p>
            </div>
            <Link
              to="/resources/past-papers"
              className="text-[#8CC63F] hover:text-[#7AB635] font-medium flex items-center"
            >
              View All Papers
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURED_PAPERS.map((paper, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={paper.thumbnail}
                    alt={paper.title}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Download className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-1 bg-[#8CC63F] text-white text-xs font-medium rounded-full">
                      {paper.board}
                    </span>
                    <span className="px-2 py-1 bg-white/90 text-gray-800 text-xs font-medium rounded-full">
                      {paper.difficulty}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {paper.subject}
                    </span>
                    <div className="flex items-center text-xs text-yellow-600 dark:text-yellow-400">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {paper.rating}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {paper.title}
                  </h3>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <FileText className="w-3 h-3 mr-1" />
                      <span>{paper.components.length} Components</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Download className="w-3 h-3 mr-1" />
                      <span>{paper.downloads} Downloads</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {paper.components.slice(0, 3).map((component) => (
                      <span
                        key={component}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
                      >
                        {component}
                      </span>
                    ))}
                    {paper.components.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{paper.components.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <button className="w-full bg-[#8CC63F] hover:bg-[#7AB635] text-white text-sm font-medium py-2 rounded-lg transition-colors">
                    Download Papers
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Statistics */}
        <div className="bg-gradient-to-r from-[#8CC63F] to-[#7AB635] rounded-2xl p-8 mb-16 text-white">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              GGK Learning Resource Statistics
            </h2>
            <p className="text-xl opacity-90">
              The largest collection of IGCSE & A-Level materials online
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {RESOURCE_STATS.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm opacity-90">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Path Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Your Path to IGCSE & A-Level Success
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Follow our proven 4-step methodology for exam excellence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Learn Concepts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Watch animated videos and read comprehensive notes
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Practice Questions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Solve topic-wise questions from past papers
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Take Mock Exams
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Test yourself with timed mock examinations
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Review & Improve
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Analyze performance and focus on weak areas
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gray-900 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Start Your IGCSE & A-Level Journey Today
            </h2>
            <p className="text-xl mb-6 opacity-90 max-w-2xl mx-auto">
              Join 50,000+ students accessing premium Cambridge and Edexcel resources
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signin"
                className="inline-flex items-center px-8 py-3 bg-[#8CC63F] hover:bg-[#7AB635] text-white font-semibold rounded-lg transition-colors duration-200"
              >
                Get Full Access
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-gray-900 transition-colors duration-200"
              >
                View Pricing Plans
                <Zap className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}