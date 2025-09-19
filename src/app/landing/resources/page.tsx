import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  FileText, 
  Video, 
  Headphones, 
  Download, 
  BookOpen, 
  Users, 
  Award,
  Play,
  CheckCircle
  ExternalLink,
  Clock,
  Star
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { Navigation } from '../../../components/shared/Navigation';

const resourceCategories = [
  {
    icon: FileText,
    title: 'Study Materials',
    description: 'Comprehensive textbooks, worksheets, and practice exercises',
    items: ['Digital Textbooks', 'Practice Worksheets', 'Study Guides', 'Reference Materials'],
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Video,
    title: 'Video Lessons',
    description: 'Interactive video content with expert instructors',
    items: ['Recorded Lectures', 'Interactive Tutorials', 'Animated Explanations', 'Virtual Labs'],
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Headphones,
    title: 'Audio Content',
    description: 'Podcasts, audiobooks, and language learning materials',
    items: ['Educational Podcasts', 'Audio Books', 'Language Lessons', 'Music Theory'],
    color: 'from-green-500 to-green-600'
  },
  {
    icon: Award,
    title: 'Assessment Tools',
    description: 'Quizzes, tests, and evaluation resources',
    items: ['Practice Tests', 'Quiz Banks', 'Assessment Rubrics', 'Progress Reports'],
    color: 'from-orange-500 to-orange-600'
  }
];

const featuredResources = [
  {
    title: 'Mathematics Mastery Course',
    type: 'Video Series',
    duration: '12 hours',
    rating: 4.9,
    description: 'Complete mathematics course covering algebra, geometry, and calculus'
  },
  {
    title: 'Science Laboratory Simulations',
    type: 'Interactive',
    duration: '8 modules',
    rating: 4.8,
    description: 'Virtual lab experiments for physics, chemistry, and biology'
  },
  {
    title: 'English Literature Collection',
    type: 'Digital Library',
    duration: '200+ books',
    rating: 4.7,
    description: 'Classic and contemporary literature with study guides'
  }
];

export default function ResourcesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="relative">
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

        {/* Content */}
        <div className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center mb-6">
                <BookOpen className="h-16 w-16 text-[#8CC63F]" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Learning Resources
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Access a vast library of educational materials, interactive content, and assessment tools designed to enhance your learning experience
              </p>
            </div>

            {/* Resource Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {resourceCategories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
                  >
                    <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-semibold text-white mb-4">
                      {category.title}
                    </h3>
                    
                    <p className="text-gray-300 mb-6 leading-relaxed">
                      {category.description}
                    </p>
                    
                    <div className="space-y-2">
                      {category.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-[#8CC63F]" />
                          <span className="text-gray-300 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Featured Resources */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 mb-16">
              <h2 className="text-3xl font-bold text-white text-center mb-8">
                Featured Resources
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredResources.map((resource, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg border border-white/10 p-6 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-[#8CC63F] bg-[#8CC63F]/20 px-2 py-1 rounded-full">
                        {resource.type}
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-300">{resource.rating}</span>
                      </div>
                    </div>
                    
                    <h4 className="text-lg font-semibold text-white mb-2">
                      {resource.title}
                    </h4>
                    
                    <p className="text-gray-300 text-sm mb-4">
                      {resource.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{resource.duration}</span>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#8CC63F] text-[#8CC63F] hover:bg-[#8CC63F] hover:text-white"
                        rightIcon={<Play className="h-4 w-4" />}
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Access Information */}
            <div className="bg-gradient-to-r from-[#8CC63F]/20 to-[#7AB635]/20 backdrop-blur-md rounded-2xl border border-[#8CC63F]/30 p-8 mb-16">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Access All Resources
                </h2>
                <p className="text-xl text-gray-300 mb-6">
                  Get unlimited access to our complete library of educational resources
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#8CC63F] mb-2">10,000+</div>
                    <div className="text-gray-300">Study Materials</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#8CC63F] mb-2">500+</div>
                    <div className="text-gray-300">Video Lessons</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#8CC63F] mb-2">24/7</div>
                    <div className="text-gray-300">Access</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-6">
                Start Learning Today
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join our platform and unlock access to premium educational resources
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate('/signin')}
                  className="bg-[#8CC63F] hover:bg-[#7AB635] text-white px-8 py-3 text-lg"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Access Resources
                </Button>
                
                <Button
                  onClick={() => navigate('/about')}
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 px-8 py-3 text-lg"
                  rightIcon={<ExternalLink className="h-5 w-5" />}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}