import React from 'react';
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
  Users
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

const SUBJECTS = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: Calculator,
    description: 'Comprehensive math curriculum from basic arithmetic to advanced calculus',
    levels: ['Primary', 'Secondary', 'Advanced'],
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  {
    id: 'science',
    name: 'Science',
    icon: Atom,
    description: 'Physics, Chemistry, and Biology with hands-on experiments',
    levels: ['General Science', 'Physics', 'Chemistry', 'Biology'],
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
    textColor: 'text-green-700 dark:text-green-300'
  },
  {
    id: 'english',
    name: 'English Language',
    icon: BookOpen,
    description: 'Reading, writing, grammar, and literature comprehension',
    levels: ['Basic', 'Intermediate', 'Advanced', 'Literature'],
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-300'
  },
  {
    id: 'social-studies',
    name: 'Social Studies',
    icon: Globe,
    description: 'History, geography, civics, and cultural studies',
    levels: ['Local History', 'World History', 'Geography', 'Civics'],
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700',
    textColor: 'text-orange-700 dark:text-orange-300'
  },
  {
    id: 'arts',
    name: 'Arts & Creativity',
    icon: Palette,
    description: 'Visual arts, music, drama, and creative expression',
    levels: ['Visual Arts', 'Music', 'Drama', 'Digital Arts'],
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-700',
    textColor: 'text-pink-700 dark:text-pink-300'
  },
  {
    id: 'languages',
    name: 'World Languages',
    icon: Languages,
    description: 'Arabic, French, Spanish, and other world languages',
    levels: ['Arabic', 'French', 'Spanish', 'Mandarin'],
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-700',
    textColor: 'text-indigo-700 dark:text-indigo-300'
  },
  {
    id: 'physical-education',
    name: 'Physical Education',
    icon: Dumbbell,
    description: 'Sports, fitness, health education, and wellness',
    levels: ['Basic Fitness', 'Team Sports', 'Individual Sports', 'Health'],
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300'
  },
  {
    id: 'music',
    name: 'Music Education',
    icon: Music,
    description: 'Music theory, instruments, composition, and performance',
    levels: ['Music Theory', 'Instruments', 'Composition', 'Performance'],
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    borderColor: 'border-teal-200 dark:border-teal-700',
    textColor: 'text-teal-700 dark:text-teal-300'
  }
];

export default function SubjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Academic Subjects
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Explore our comprehensive curriculum designed to inspire learning and academic excellence across all grade levels
          </p>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
          {SUBJECTS.map((subject) => {
            const IconComponent = subject.icon;
            return (
              <div
                key={subject.id}
                className={`${subject.bgColor} ${subject.borderColor} border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${subject.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className={`w-5 h-5 ${subject.textColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                </div>
                
                <h3 className={`text-lg font-semibold ${subject.textColor} mb-2`}>
                  {subject.name}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {subject.description}
                </p>
                
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Available Levels:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {subject.levels.map((level) => (
                      <span
                        key={level}
                        className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Our Curriculum?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Our subjects are designed with modern pedagogy and aligned with international standards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-6 h-6 text-[#8CC63F]" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Expert Designed
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Curriculum developed by education experts and subject specialists
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-[#8CC63F]" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Standards Aligned
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Aligned with international education standards and best practices
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-[#8CC63F]" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Flexible Pacing
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Adaptive learning paths that adjust to individual student needs
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-[#8CC63F]" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Collaborative
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Encourages collaboration and peer-to-peer learning experiences
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-[#8CC63F] to-[#7AB635] rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-6 opacity-90">
              Join thousands of students already learning with our comprehensive curriculum
            </p>
            <Link
              to="/signin"
              className="inline-flex items-center px-8 py-3 bg-white text-[#8CC63F] font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              Start Learning Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}