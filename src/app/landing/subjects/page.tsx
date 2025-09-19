import React from 'react';
import { Link } from 'react-router-dom';
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
import { Navigation } from '../../../components/shared/Navigation';

const subjects = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: Calculator,
    description: 'From basic arithmetic to advanced calculus and statistics',
    topics: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'],
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700'
  },
  {
    id: 'science',
    name: 'Science',
    icon: Atom,
    description: 'Physics, Chemistry, and Biology with hands-on experiments',
    topics: ['Physics', 'Chemistry', 'Biology', 'Earth Science', 'Environmental Science'],
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700'
  },
  {
    id: 'languages',
    name: 'Languages',
    icon: Globe,
    description: 'Master multiple languages with interactive learning',
    topics: ['English', 'Arabic', 'French', 'Spanish', 'Mandarin'],
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-700'
  },
  {
    id: 'arts',
    name: 'Arts & Creativity',
    icon: Palette,
    description: 'Express creativity through visual and performing arts',
    topics: ['Visual Arts', 'Music', 'Drama', 'Creative Writing', 'Digital Design'],
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-700'
  },
  {
    id: 'social-studies',
    name: 'Social Studies',
    icon: BookOpen,
    description: 'Explore history, geography, and social sciences',
    topics: ['History', 'Geography', 'Civics', 'Economics', 'Cultural Studies'],
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700'
  },
  {
    id: 'physical-education',
    name: 'Physical Education',
    icon: Activity,
    description: 'Promote health and fitness through sports and activities',
    topics: ['Sports', 'Fitness', 'Health Education', 'Team Building', 'Nutrition'],
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700'
  }
];

export default function SubjectsPage() {
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
              <GraduationCap className="h-16 w-16 text-[#8CC63F]" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-6">
              Our Subjects
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Comprehensive curriculum covering all essential subjects with interactive learning experiences, 
              expert instruction, and cutting-edge educational technology.
            </p>
          </div>

          {/* Subjects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {subjects.map((subject) => {
              const IconComponent = subject.icon;
              return (
                <div
                  key={subject.id}
                  className="bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-6 hover:bg-gray-800/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
                >
                  {/* Subject Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${subject.color} flex items-center justify-center`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white group-hover:text-[#8CC63F] transition-colors">
                      {subject.name}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 mb-4">
                    {subject.description}
                  </p>

                  {/* Topics List */}
                  <div className="space-y-2 mb-6">
                    {subject.topics.map((topic, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#8CC63F]" />
                        <span className="text-sm text-gray-300">{topic}</span>
                      </div>
                    ))}
                  </div>

                  {/* Learn More Button */}
                  <button className="w-full bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 group">
                    Learn More
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Call to Action Section */}
          <div className="text-center bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Learning?
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Join thousands of students who are already excelling with our comprehensive subject offerings. 
              Get personalized learning paths and expert guidance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signin"
                className="bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="border border-gray-600 hover:border-[#8CC63F] text-white hover:text-[#8CC63F] font-medium py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2"
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