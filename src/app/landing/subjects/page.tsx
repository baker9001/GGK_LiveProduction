import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  BookOpen, 
  Calculator, 
  Atom, 
  Globe, 
  Palette, 
  Music, 
  Activity,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { Navigation } from '../../../components/shared/Navigation';

const subjects = [
  {
    icon: Calculator,
    name: 'Mathematics',
    description: 'Comprehensive math curriculum from basic arithmetic to advanced calculus',
    levels: ['Primary', 'Secondary', 'Advanced'],
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Atom,
    name: 'Science',
    description: 'Physics, Chemistry, and Biology with hands-on experiments',
    levels: ['General Science', 'Physics', 'Chemistry', 'Biology'],
    color: 'from-green-500 to-green-600'
  },
  {
    icon: Globe,
    name: 'Geography',
    description: 'World geography, climate studies, and environmental science',
    levels: ['Physical', 'Human', 'Environmental'],
    color: 'from-emerald-500 to-emerald-600'
  },
  {
    icon: BookOpen,
    name: 'Literature',
    description: 'Language arts, reading comprehension, and creative writing',
    levels: ['Reading', 'Writing', 'Literature Analysis'],
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Palette,
    name: 'Arts',
    description: 'Visual arts, design principles, and creative expression',
    levels: ['Drawing', 'Painting', 'Digital Art'],
    color: 'from-pink-500 to-pink-600'
  },
  {
    icon: Music,
    name: 'Music',
    description: 'Music theory, instruments, and composition',
    levels: ['Theory', 'Performance', 'Composition'],
    color: 'from-indigo-500 to-indigo-600'
  },
  {
    icon: Activity,
    name: 'Physical Education',
    description: 'Sports, fitness, and health education programs',
    levels: ['Fitness', 'Team Sports', 'Individual Sports'],
    color: 'from-orange-500 to-orange-600'
  },
  {
    icon: Globe,
    name: 'Social Studies',
    description: 'History, civics, and cultural studies',
    levels: ['History', 'Civics', 'Cultural Studies'],
    color: 'from-teal-500 to-teal-600'
  }
];

export default function SubjectsPage() {
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
                <GraduationCap className="h-16 w-16 text-[#8CC63F]" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Our Subjects
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Comprehensive curriculum designed to inspire learning and foster academic excellence across all disciplines
              </p>
            </div>

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
              {subjects.map((subject, index) => {
                const IconComponent = subject.icon;
                return (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${subject.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-white mb-3">
                      {subject.name}
                    </h3>
                    
                    <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                      {subject.description}
                    </p>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Available Levels:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {subject.levels.map((level, levelIndex) => (
                          <span
                            key={levelIndex}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#8CC63F]/20 text-[#8CC63F] border border-[#8CC63F]/30"
                          >
                            {level}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Features Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 mb-16">
              <h2 className="text-3xl font-bold text-white text-center mb-8">
                Why Choose Our Curriculum?
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#8CC63F]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-[#8CC63F]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    Standards-Aligned
                  </h3>
                  <p className="text-gray-300">
                    All subjects align with international educational standards and best practices
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#8CC63F]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-[#8CC63F]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    Interactive Learning
                  </h3>
                  <p className="text-gray-300">
                    Engaging multimedia content and interactive exercises for better understanding
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#8CC63F]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-8 w-8 text-[#8CC63F]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    Progress Tracking
                  </h3>
                  <p className="text-gray-300">
                    Comprehensive analytics to monitor student progress and performance
                  </p>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join thousands of educators and students who are already experiencing the future of learning
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate('/signin')}
                  className="bg-[#8CC63F] hover:bg-[#7AB635] text-white px-8 py-3 text-lg"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Sign In to Explore
                </Button>
                
                <Button
                  onClick={() => navigate('/contact')}
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 px-8 py-3 text-lg"
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}