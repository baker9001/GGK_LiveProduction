import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Video, 
  FileText, 
  Download, 
  Search, 
  Filter,
  Play,
  Clock,
  Star,
  Users,
  ArrowRight,
  Headphones,
  Image,
  PresentationChart,
  Calculator,
  FlaskConical,
  Globe
} from 'lucide-react';
import { Navigation } from '../../components/shared/Navigation';

const resourceCategories = [
  {
    id: 'lesson-plans',
    name: 'Lesson Plans',
    icon: FileText,
    description: 'Ready-to-use lesson plans for all subjects and grade levels',
    count: '2,500+',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700'
  },
  {
    id: 'video-library',
    name: 'Video Library',
    icon: Video,
    description: 'Educational videos, tutorials, and interactive demonstrations',
    count: '1,200+',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700'
  },
  {
    id: 'worksheets',
    name: 'Worksheets & Activities',
    icon: PresentationChart,
    description: 'Printable worksheets, activities, and practice exercises',
    count: '5,000+',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700'
  },
  {
    id: 'assessments',
    name: 'Assessments',
    icon: Calculator,
    description: 'Quizzes, tests, and comprehensive assessment tools',
    count: '800+',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-700'
  },
  {
    id: 'interactive-tools',
    name: 'Interactive Tools',
    icon: FlaskConical,
    description: 'Simulations, virtual labs, and interactive learning tools',
    count: '300+',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700'
  },
  {
    id: 'reference-materials',
    name: 'Reference Materials',
    icon: Globe,
    description: 'Textbooks, guides, and comprehensive reference materials',
    count: '1,500+',
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    borderColor: 'border-teal-200 dark:border-teal-700'
  }
];

const featuredResources = [
  {
    title: 'Interactive Math Simulator',
    type: 'Interactive Tool',
    subject: 'Mathematics',
    duration: '15-30 min',
    rating: 4.9,
    thumbnail: 'https://images.pexels.com/photos/3862132/pexels-photo-3862132.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Visualize complex mathematical concepts with our interactive simulator'
  },
  {
    title: 'Chemistry Lab Virtual Experience',
    type: 'Video Series',
    subject: 'Science',
    duration: '45 min',
    rating: 4.8,
    thumbnail: 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Conduct safe chemistry experiments in our virtual laboratory'
  },
  {
    title: 'World History Timeline',
    type: 'Reference Material',
    subject: 'Social Studies',
    duration: 'Self-paced',
    rating: 4.7,
    thumbnail: 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Comprehensive timeline of world historical events and civilizations'
  }
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#8CC63F] to-[#7AB635] text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Educational Resources
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-green-100">
                Discover thousands of high-quality educational materials for every subject
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search for lesson plans, videos, worksheets..."
                    className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#7AB635] text-white px-6 py-2 rounded-md hover:bg-[#6DA52F] transition-colors">
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Resource Categories */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Resource Categories
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Find exactly what you need for your teaching and learning goals
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {resourceCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <div
                    key={category.id}
                    className={`${category.bgColor} ${category.borderColor} border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      <span className="text-sm font-bold text-[#8CC63F]">
                        {category.count}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {category.description}
                    </p>
                    
                    <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#8CC63F] transition-colors">
                      Browse Resources
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Featured Resources */}
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Featured Resources
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Popular and highly-rated educational materials
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredResources.map((resource, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={resource.thumbnail}
                      alt={resource.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute top-4 left-4">
                      <span className="bg-[#8CC63F] text-white px-2 py-1 rounded-md text-xs font-medium">
                        {resource.type}
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                        <Play className="h-4 w-4 text-gray-900" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#8CC63F] font-medium">
                        {resource.subject}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {resource.rating}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {resource.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {resource.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-1" />
                        {resource.duration}
                      </div>
                      <button className="text-[#8CC63F] font-medium text-sm hover:text-[#7AB635] transition-colors">
                        View Resource →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Access All Resources
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Get unlimited access to our complete library of educational resources
            </p>
            <Link
              to="/signin"
              className="bg-[#8CC63F] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#7AB635] transition-colors inline-flex items-center"
            >
              Sign In to Access
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}