import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Video, 
  Headphones, 
  Download, 
  BookOpen, 
  Users, 
  Clock, 
  Award,
  ArrowRight,
  CheckCircle,
  Play,
  FileDown,
  Bookmark
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

const resourceCategories = [
  {
    id: 'study-materials',
    name: 'Study Materials',
    icon: FileText,
    description: 'Comprehensive study guides, worksheets, and reference materials',
    color: 'from-blue-500 to-blue-600',
    resources: [
      { name: 'Interactive Worksheets', count: '500+', type: 'PDF' },
      { name: 'Study Guides', count: '200+', type: 'Digital' },
      { name: 'Reference Charts', count: '150+', type: 'Visual' }
    ]
  },
  {
    id: 'video-lessons',
    name: 'Video Lessons',
    icon: Video,
    description: 'Engaging video content with expert instructors',
    color: 'from-red-500 to-red-600',
    resources: [
      { name: 'Concept Videos', count: '1000+', type: 'HD Video' },
      { name: 'Tutorial Series', count: '50+', type: 'Series' },
      { name: 'Live Sessions', count: 'Weekly', type: 'Live' }
    ]
  },
  {
    id: 'audio-content',
    name: 'Audio Content',
    icon: Headphones,
    description: 'Podcasts, audiobooks, and pronunciation guides',
    color: 'from-green-500 to-green-600',
    resources: [
      { name: 'Educational Podcasts', count: '100+', type: 'Audio' },
      { name: 'Language Pronunciation', count: '300+', type: 'Audio' },
      { name: 'Story Narrations', count: '75+', type: 'Audio' }
    ]
  },
  {
    id: 'practice-tests',
    name: 'Practice Tests',
    icon: Award,
    description: 'Comprehensive assessments and practice examinations',
    color: 'from-purple-500 to-purple-600',
    resources: [
      { name: 'Mock Exams', count: '200+', type: 'Interactive' },
      { name: 'Quick Quizzes', count: '500+', type: 'Timed' },
      { name: 'Past Papers', count: '300+', type: 'Official' }
    ]
  },
  {
    id: 'teacher-resources',
    name: 'Teacher Resources',
    icon: Users,
    description: 'Lesson plans, teaching guides, and classroom tools',
    color: 'from-indigo-500 to-indigo-600',
    resources: [
      { name: 'Lesson Plans', count: '400+', type: 'Template' },
      { name: 'Assessment Tools', count: '100+', type: 'Digital' },
      { name: 'Classroom Activities', count: '250+', type: 'Interactive' }
    ]
  },
  {
    id: 'digital-tools',
    name: 'Digital Tools',
    icon: BookOpen,
    description: 'Interactive tools and educational software',
    color: 'from-teal-500 to-teal-600',
    resources: [
      { name: 'Simulation Tools', count: '50+', type: 'Interactive' },
      { name: 'Calculators', count: '25+', type: 'Web App' },
      { name: 'Drawing Tools', count: '15+', type: 'Creative' }
    ]
  }
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#8CC63F] via-[#7AB635] to-[#6DA52F] text-white py-20">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Learning Resources Hub
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
            Access thousands of educational resources designed to enhance teaching and learning
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signin"
              className="inline-flex items-center px-8 py-4 bg-white text-[#8CC63F] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Access Resources
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Browse Catalog
            </button>
          </div>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {resourceCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
                >
                  {/* Category Header */}
                  <div className={`bg-gradient-to-r ${category.color} p-6 text-white`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{category.name}</h3>
                        <p className="text-white/80 text-sm">{category.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Category Content */}
                  <div className="p-6">
                    <ul className="space-y-3 mb-6">
                      {category.resources.map((resource, index) => (
                        <li key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-[#8CC63F]" />
                            <span className="text-gray-700 dark:text-gray-300 text-sm">
                              {resource.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {resource.count}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {resource.type}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/signin"
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-[#8CC63F] text-white rounded-lg font-medium hover:bg-[#7AB635] transition-colors group-hover:scale-105 transform duration-200"
                    >
                      Access {category.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Resource Library Statistics
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Constantly growing collection of educational materials
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#8CC63F] mb-2">
                5,000+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Learning Resources
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#8CC63F] mb-2">
                1,200+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Video Lessons
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#8CC63F] mb-2">
                800+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Practice Tests
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#8CC63F] mb-2">
                24/7
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Access Available
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#8CC63F] to-[#7AB635]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Unlock Your Learning Potential
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Access our complete library of educational resources and start your journey today
          </p>
          <Link
            to="/signin"
            className="inline-flex items-center px-8 py-4 bg-white text-[#8CC63F] rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
          >
            Start Exploring Resources
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}