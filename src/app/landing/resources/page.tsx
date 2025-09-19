import React from 'react';
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
  Filter
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

const RESOURCE_CATEGORIES = [
  {
    id: 'study-materials',
    name: 'Study Materials',
    icon: FileText,
    description: 'Comprehensive study guides, worksheets, and reference materials',
    count: '2,500+',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
    textColor: 'text-blue-700 dark:text-blue-300',
    items: [
      'Study Guides',
      'Practice Worksheets',
      'Reference Charts',
      'Formula Sheets',
      'Revision Notes'
    ]
  },
  {
    id: 'video-lessons',
    name: 'Video Lessons',
    icon: Video,
    description: 'Interactive video content with expert instructors',
    count: '1,200+',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300',
    items: [
      'Concept Explanations',
      'Step-by-step Tutorials',
      'Problem Solving',
      'Lab Demonstrations',
      'Expert Interviews'
    ]
  },
  {
    id: 'audio-content',
    name: 'Audio Content',
    icon: Headphones,
    description: 'Podcasts, audiobooks, and language learning materials',
    count: '800+',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
    textColor: 'text-green-700 dark:text-green-300',
    items: [
      'Educational Podcasts',
      'Language Lessons',
      'Story Narrations',
      'Music Theory',
      'Pronunciation Guides'
    ]
  },
  {
    id: 'interactive-tools',
    name: 'Interactive Tools',
    icon: Laptop,
    description: 'Simulations, calculators, and interactive learning tools',
    count: '500+',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-300',
    items: [
      'Virtual Labs',
      'Math Calculators',
      'Language Games',
      'Science Simulations',
      'Quiz Builders'
    ]
  },
  {
    id: 'assessments',
    name: 'Assessments',
    icon: BookOpen,
    description: 'Tests, quizzes, and evaluation materials',
    count: '3,000+',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700',
    textColor: 'text-orange-700 dark:text-orange-300',
    items: [
      'Practice Tests',
      'Quick Quizzes',
      'Past Papers',
      'Mock Exams',
      'Progress Assessments'
    ]
  },
  {
    id: 'teacher-resources',
    name: 'Teacher Resources',
    icon: Users,
    description: 'Lesson plans, teaching guides, and classroom materials',
    count: '1,500+',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-700',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    items: [
      'Lesson Plans',
      'Teaching Guides',
      'Classroom Activities',
      'Assessment Rubrics',
      'Parent Resources'
    ]
  }
];

const FEATURED_RESOURCES = [
  {
    title: 'Advanced Mathematics Problem Sets',
    type: 'Study Material',
    subject: 'Mathematics',
    rating: 4.9,
    downloads: '12.5K',
    duration: '2-3 hours',
    level: 'Advanced',
    thumbnail: 'https://images.pexels.com/photos/6256/mathematics-blackboard-education-classroom.jpg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    title: 'Chemistry Lab Experiments',
    type: 'Video Series',
    subject: 'Science',
    rating: 4.8,
    downloads: '8.2K',
    duration: '45 min',
    level: 'Intermediate',
    thumbnail: 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    title: 'English Literature Analysis',
    type: 'Audio Guide',
    subject: 'English',
    rating: 4.7,
    downloads: '6.8K',
    duration: '1.5 hours',
    level: 'Advanced',
    thumbnail: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    title: 'World History Timeline',
    type: 'Interactive Tool',
    subject: 'Social Studies',
    rating: 4.9,
    downloads: '15.3K',
    duration: 'Self-paced',
    level: 'All Levels',
    thumbnail: 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=400'
  }
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center">
              <Download className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Learning Resources
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Access thousands of educational materials, tools, and resources to enhance your learning experience
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-12">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search resources by title, subject, or type..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <select className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>All Subjects</option>
                <option>Mathematics</option>
                <option>Science</option>
                <option>English</option>
                <option>Social Studies</option>
              </select>
              <select className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>All Types</option>
                <option>Study Materials</option>
                <option>Videos</option>
                <option>Audio</option>
                <option>Interactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resource Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {RESOURCE_CATEGORIES.map((category) => {
            const IconComponent = category.icon;
            return (
              <div
                key={category.id}
                className={`${category.bgColor} ${category.borderColor} border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-sm font-bold ${category.textColor}`}>
                    {category.count}
                  </span>
                </div>
                
                <h3 className={`text-lg font-semibold ${category.textColor} mb-2`}>
                  {category.name}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {category.description}
                </p>
                
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <div key={item} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Featured Resources */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Featured Resources
            </h2>
            <Link
              to="/signin"
              className="text-[#8CC63F] hover:text-[#7AB635] font-medium flex items-center"
            >
              View All Resources
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURED_RESOURCES.map((resource, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={resource.thumbnail}
                    alt={resource.title}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {resource.type === 'Video Series' ? (
                        <Play className="w-12 h-12 text-white" />
                      ) : (
                        <Eye className="w-12 h-12 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-[#8CC63F] text-white text-xs font-medium rounded-full">
                      {resource.type}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {resource.subject}
                    </span>
                    <div className="flex items-center text-xs text-yellow-600 dark:text-yellow-400">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {resource.rating}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {resource.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center">
                      <Download className="w-3 h-3 mr-1" />
                      {resource.downloads}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {resource.duration}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                      {resource.level}
                    </span>
                    <button className="text-[#8CC63F] hover:text-[#7AB635] text-sm font-medium">
                      Access Resource
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Resource Library Statistics
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Our comprehensive collection continues to grow every day
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#8CC63F] mb-2">8,500+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Resources</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#8CC63F] mb-2">50+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Subject Areas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#8CC63F] mb-2">25K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Downloads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#8CC63F] mb-2">4.8</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
            </div>
          </div>
        </div>

        {/* How to Access */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              How to Access Resources
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Simple steps to get started with our learning materials
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Sign Up
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create your account to access our complete resource library
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Browse & Search
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Find resources by subject, type, or use our advanced search
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Download & Learn
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Access materials instantly and start your learning journey
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-[#8CC63F] to-[#7AB635] rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Explore Our Resources?
            </h2>
            <p className="text-xl mb-6 opacity-90">
              Join our learning community and access thousands of educational materials
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signin"
                className="inline-flex items-center px-8 py-3 bg-white text-[#8CC63F] font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                Access Resources
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-[#8CC63F] transition-colors duration-200"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}