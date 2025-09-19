import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  BookOpen, 
  Video, 
  FileText, 
  Download, 
  Users, 
  Clock, 
  Star,
  ArrowRight,
  Play,
  Eye,
  Calendar
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

const resourceCategories = [
  {
    id: 'study-materials',
    name: 'Study Materials',
    icon: BookOpen,
    description: 'Comprehensive textbooks, workbooks, and reference materials',
    items: [
      { name: 'Interactive Textbooks', type: 'Digital', count: '500+' },
      { name: 'Practice Workbooks', type: 'PDF', count: '200+' },
      { name: 'Reference Guides', type: 'Digital', count: '150+' },
      { name: 'Study Notes', type: 'PDF', count: '300+' }
    ],
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'video-lessons',
    name: 'Video Lessons',
    icon: Video,
    description: 'High-quality video content from expert educators',
    items: [
      { name: 'Recorded Lectures', type: 'Video', count: '1,200+' },
      { name: 'Interactive Demos', type: 'Video', count: '800+' },
      { name: 'Lab Experiments', type: 'Video', count: '400+' },
      { name: 'Skill Tutorials', type: 'Video', count: '600+' }
    ],
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'assessments',
    name: 'Assessments',
    icon: FileText,
    description: 'Practice tests, quizzes, and evaluation tools',
    items: [
      { name: 'Practice Tests', type: 'Interactive', count: '300+' },
      { name: 'Quick Quizzes', type: 'Interactive', count: '1,000+' },
      { name: 'Past Papers', type: 'PDF', count: '500+' },
      { name: 'Mock Exams', type: 'Interactive', count: '150+' }
    ],
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'tools',
    name: 'Learning Tools',
    icon: Users,
    description: 'Interactive tools and utilities to enhance learning',
    items: [
      { name: 'Virtual Labs', type: 'Interactive', count: '50+' },
      { name: 'Calculators', type: 'Tool', count: '25+' },
      { name: 'Simulators', type: 'Interactive', count: '30+' },
      { name: 'Study Planners', type: 'Tool', count: '10+' }
    ],
    color: 'from-orange-500 to-orange-600'
  }
];

const featuredResources = [
  {
    title: 'Advanced Mathematics Course',
    type: 'Video Series',
    duration: '24 hours',
    rating: 4.9,
    students: '2,500+',
    thumbnail: 'https://images.pexels.com/photos/3862130/pexels-photo-3862130.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    title: 'Chemistry Lab Experiments',
    type: 'Interactive Lab',
    duration: '12 experiments',
    rating: 4.8,
    students: '1,800+',
    thumbnail: 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    title: 'World History Timeline',
    type: 'Interactive Guide',
    duration: 'Self-paced',
    rating: 4.7,
    students: '3,200+',
    thumbnail: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400'
  }
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/shutterstock_2475380851.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL3NodXR0ZXJzdG9ja18yNDc1MzgwODUxLmpwZyIsImlhdCI6MTc1NjA2MDQ1OSwiZXhwIjo0ODc4MTI0NDU5fQ.vmQTU-G_jb0V6yz8TGg2-WP-mqnxYD-5A8VIzatHizI"
          alt="Educational background"
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
      </div>

      {/* Navigation */}
      <div className="relative z-10">
        <Navigation />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center mb-6">
              <BookOpen className="h-16 w-16 text-[#8CC63F]" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-6">
              Learning Resources
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Access thousands of high-quality educational resources including videos, interactive content, 
              assessments, and tools designed to enhance your learning experience.
            </p>
          </div>

          {/* Featured Resources */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Featured Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredResources.map((resource, index) => (
                <div
                  key={index}
                  className="bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 overflow-hidden hover:bg-gray-800/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={resource.thumbnail}
                      alt={resource.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-[#8CC63F] rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <Play className="h-6 w-6 text-white ml-1" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 bg-[#8CC63F] text-white rounded-full">
                        {resource.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {resource.duration}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#8CC63F] transition-colors">
                      {resource.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span>{resource.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{resource.students}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Categories */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Resource Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {resourceCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <div
                    key={category.id}
                    className="bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-6 hover:bg-gray-800/60 transition-all duration-300 group"
                  >
                    {/* Category Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white group-hover:text-[#8CC63F] transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-gray-300 text-sm">
                          {category.description}
                        </p>
                      </div>
                    </div>

                    {/* Resource Items */}
                    <div className="grid grid-cols-2 gap-4">
                      {category.items.map((item, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="text-white font-medium text-sm mb-1">
                            {item.name}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{item.type}</span>
                            <span className="text-xs text-[#8CC63F] font-medium">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Call to Action Section */}
          <div className="text-center bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Access All Resources
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Get unlimited access to our complete library of educational resources. 
              Start your learning journey today with expert-curated content.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signin"
                className="bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2"
              >
                Sign In to Access
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/subjects"
                className="border border-gray-600 hover:border-[#8CC63F] text-white hover:text-[#8CC63F] font-medium py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2"
              >
                Browse Subjects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}