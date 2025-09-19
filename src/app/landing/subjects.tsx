import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Calculator, 
  FlaskConical, 
  Globe, 
  Languages, 
  Palette, 
  Music, 
  Dumbbell,
  ArrowRight,
  Star,
  Clock,
  Users,
  Award
} from 'lucide-react';
import { Navigation } from '../../components/shared/Navigation';

const subjects = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: Calculator,
    description: 'Comprehensive math curriculum from basic arithmetic to advanced calculus',
    levels: ['Elementary', 'Middle School', 'High School', 'Advanced'],
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  {
    id: 'science',
    name: 'Science',
    icon: FlaskConical,
    description: 'Explore physics, chemistry, biology, and earth sciences',
    levels: ['General Science', 'Physics', 'Chemistry', 'Biology'],
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
    textColor: 'text-green-700 dark:text-green-300'
  },
  {
    id: 'english',
    name: 'English Language Arts',
    icon: BookOpen,
    description: 'Reading, writing, literature, and communication skills',
    levels: ['Reading', 'Writing', 'Literature', 'Communication'],
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
    levels: ['History', 'Geography', 'Civics', 'Economics'],
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700',
    textColor: 'text-orange-700 dark:text-orange-300'
  },
  {
    id: 'languages',
    name: 'World Languages',
    icon: Languages,
    description: 'Learn multiple languages and cultural communication',
    levels: ['Arabic', 'French', 'Spanish', 'Mandarin'],
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300'
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
    id: 'physical-education',
    name: 'Physical Education',
    icon: Dumbbell,
    description: 'Health, fitness, sports, and physical wellness',
    levels: ['Fitness', 'Team Sports', 'Individual Sports', 'Health'],
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    borderColor: 'border-teal-200 dark:border-teal-700',
    textColor: 'text-teal-700 dark:text-teal-300'
  },
  {
    id: 'technology',
    name: 'Technology & Computing',
    icon: BookOpen,
    description: 'Computer science, digital literacy, and technology skills',
    levels: ['Digital Literacy', 'Programming', 'Web Design', 'Data Science'],
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-700',
    textColor: 'text-indigo-700 dark:text-indigo-300'
  }
];

const features = [
  {
    icon: Star,
    title: 'Expert-Designed Curriculum',
    description: 'Content created by subject matter experts and experienced educators'
  },
  {
    icon: Clock,
    title: 'Self-Paced Learning',
    description: 'Students can learn at their own pace with flexible scheduling'
  },
  {
    icon: Users,
    title: 'Collaborative Learning',
    description: 'Group projects and peer-to-peer learning opportunities'
  },
  {
    icon: Award,
    title: 'Achievement Tracking',
    description: 'Comprehensive progress tracking and achievement recognition'
  }
];

export default function SubjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#8CC63F] to-[#7AB635] text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Comprehensive Subject Catalog
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-green-100">
                Explore our extensive range of subjects designed for modern education
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/signin"
                  className="bg-white text-[#8CC63F] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Get Started Today
                </Link>
                <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-[#8CC63F] transition-colors">
                  View Sample Lessons
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Subjects Grid */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Our Subject Areas
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Each subject is carefully structured with progressive learning paths, 
                interactive content, and comprehensive assessment tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subjects.map((subject) => {
                const IconComponent = subject.icon;
                return (
                  <div
                    key={subject.id}
                    className={`${subject.bgColor} ${subject.borderColor} border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${subject.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {subject.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {subject.description}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
                        Available Levels:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {subject.levels.map((level) => (
                          <span
                            key={level}
                            className={`text-xs px-2 py-1 rounded-full ${subject.textColor} bg-white dark:bg-gray-800 border ${subject.borderColor}`}
                          >
                            {level}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#8CC63F] transition-colors">
                      Explore Subject
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
                Why Choose Our Subjects?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Every subject is designed with modern pedagogy and proven learning methodologies
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Learning?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of students already learning with our comprehensive subject catalog
            </p>
            <Link
              to="/signin"
              className="bg-[#8CC63F] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#7AB635] transition-colors inline-flex items-center"
            >
              Start Learning Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}