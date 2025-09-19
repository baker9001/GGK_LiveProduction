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
  GraduationCap,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

const subjects = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: Calculator,
    description: 'From basic arithmetic to advanced calculus and statistics',
    levels: ['Primary', 'Secondary', 'Advanced'],
    color: 'from-blue-500 to-blue-600',
    features: ['Interactive Problem Solving', 'Step-by-Step Solutions', 'Practice Tests']
  },
  {
    id: 'science',
    name: 'Science',
    icon: Atom,
    description: 'Physics, Chemistry, Biology, and Environmental Science',
    levels: ['Elementary', 'Middle School', 'High School'],
    color: 'from-green-500 to-green-600',
    features: ['Virtual Labs', '3D Simulations', 'Experiment Guides']
  },
  {
    id: 'english',
    name: 'English Language',
    icon: BookOpen,
    description: 'Reading, Writing, Grammar, and Literature',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    color: 'from-purple-500 to-purple-600',
    features: ['Reading Comprehension', 'Writing Workshops', 'Literature Analysis']
  },
  {
    id: 'social-studies',
    name: 'Social Studies',
    icon: Globe,
    description: 'History, Geography, Civics, and Cultural Studies',
    levels: ['Elementary', 'Middle School', 'High School'],
    color: 'from-orange-500 to-orange-600',
    features: ['Interactive Maps', 'Historical Timelines', 'Cultural Exploration']
  },
  {
    id: 'arts',
    name: 'Arts & Creativity',
    icon: Palette,
    description: 'Visual Arts, Music, Drama, and Creative Expression',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    color: 'from-pink-500 to-pink-600',
    features: ['Digital Art Tools', 'Music Composition', 'Creative Projects']
  },
  {
    id: 'languages',
    name: 'World Languages',
    icon: Languages,
    description: 'Arabic, French, Spanish, and other world languages',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    color: 'from-indigo-500 to-indigo-600',
    features: ['Interactive Conversations', 'Cultural Context', 'Pronunciation Guides']
  }
];

export default function SubjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#8CC63F] via-[#7AB635] to-[#6DA52F] text-white py-20">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Comprehensive Subject Coverage
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
            Explore our extensive curriculum designed to inspire learning across all academic disciplines
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signin"
              className="inline-flex items-center px-8 py-4 bg-white text-[#8CC63F] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Learning Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
              View Sample Lessons
            </button>
          </div>
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Academic Subjects
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Comprehensive curriculum covering all essential subjects with interactive learning experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {subjects.map((subject) => {
              const IconComponent = subject.icon;
              return (
                <div
                  key={subject.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
                >
                  {/* Subject Header */}
                  <div className={`bg-gradient-to-r ${subject.color} p-6 text-white`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{subject.name}</h3>
                        <p className="text-white/80 text-sm">{subject.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Subject Content */}
                  <div className="p-6">
                    {/* Levels */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Available Levels
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {subject.levels.map((level) => (
                          <span
                            key={level}
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                          >
                            {level}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Key Features
                      </h4>
                      <ul className="space-y-2">
                        {subject.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle className="w-4 h-4 text-[#8CC63F]" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <Link
                      to="/signin"
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-[#8CC63F] text-white rounded-lg font-medium hover:bg-[#7AB635] transition-colors group-hover:scale-105 transform duration-200"
                    >
                      Explore {subject.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Our Curriculum?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Our subjects are designed with modern pedagogy and cutting-edge technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-[#8CC63F]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Expert-Designed Content
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Curriculum developed by subject matter experts and experienced educators
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-[#8CC63F]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Adaptive Learning
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Personalized learning paths that adapt to each student's pace and style
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#8CC63F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#8CC63F]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Proven Results
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track record of improved student outcomes and academic achievement
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#8CC63F] to-[#7AB635]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Learning?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of students already excelling with our comprehensive curriculum
          </p>
          <Link
            to="/signin"
            className="inline-flex items-center px-8 py-4 bg-white text-[#8CC63F] rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}