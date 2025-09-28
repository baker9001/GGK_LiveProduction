// /src/app/landing/page.tsx
// Updated with standardized buttons and improved navigation

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  Award, 
  ChevronRight, 
  Play,
  CheckCircle,
  Star,
  ArrowRight,
  Globe,
  Zap,
  Shield,
  Target,
  TrendingUp,
  Heart,
  Lightbulb,
  Rocket,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Navigation } from '../../components/shared/Navigation';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Comprehensive Learning',
    description: 'Access a vast library of educational content across multiple subjects and grade levels.',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Users,
    title: 'Collaborative Environment',
    description: 'Connect students, teachers, and administrators in a unified learning ecosystem.',
    color: 'from-green-500 to-green-600'
  },
  {
    icon: Award,
    title: 'Achievement Tracking',
    description: 'Monitor progress and celebrate achievements with our advanced analytics system.',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Target,
    title: 'Personalized Learning',
    description: 'Adaptive learning paths tailored to each student\'s unique needs and pace.',
    color: 'from-orange-500 to-orange-600'
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security ensuring your data is protected and always available.',
    color: 'from-red-500 to-red-600'
  },
  {
    icon: TrendingUp,
    title: 'Advanced Analytics',
    description: 'Gain insights into learning patterns and performance with detailed analytics.',
    color: 'from-indigo-500 to-indigo-600'
  }
];

const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    role: 'Principal, Greenwood High School',
    content: 'GGK Learning has transformed how we manage our educational programs. The platform is intuitive and our teachers love it.',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    name: 'Dr. Ahmed Al-Rashid',
    role: 'Education Director, Kuwait Ministry',
    content: 'The comprehensive analytics and reporting features have given us unprecedented insights into student performance.',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    name: 'Maria Rodriguez',
    role: 'Mathematics Teacher',
    content: 'My students are more engaged than ever. The interactive content and progress tracking make teaching so much more effective.',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  }
];

const STATS = [
  { number: '50,000+', label: 'Active Students' },
  { number: '2,500+', label: 'Educators' },
  { number: '150+', label: 'Schools' },
  { number: '98%', label: 'Satisfaction Rate' }
];

const NAV_ITEMS = [
  { label: 'Home', path: '/landing', id: 'home' },
  { label: 'Subjects', path: '/subjects', id: 'subjects' },
  { label: 'Resources', path: '/resources', id: 'resources' },
  { label: 'About', path: '/about', id: 'about' },
  { label: 'Contact', path: '/contact', id: 'contact' },
];

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };
  
  const handleLoginClick = () => {
    navigate('/signin');
  };

  // Handle navigation click with prevention of page refresh for current tab
  const handleNavClick = (item: typeof NAV_ITEMS[0], e: React.MouseEvent) => {
    // Check if user is already on this page
    if (location.pathname === item.path) {
      e.preventDefault();
      return;
    }
    // Allow normal navigation for other pages
  };

  // Determine which tab should be active (default to home for landing page)
  const getActiveTab = () => {
    if (location.pathname === '/landing' || location.pathname === '/') {
      return 'home';
    }
    
    const currentItem = NAV_ITEMS.find(item => location.pathname === item.path);
    return currentItem?.id || 'home';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Navigation */}
      <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm dark:shadow-gray-900/20 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/landing" className="flex items-center">
                <GraduationCap className="h-8 w-8 text-[#8CC63F]" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">GGK</span>
              </Link>
              <div className="hidden md:flex ml-10 space-x-8">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeTab === item.id;
                  const isCurrentPage = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={(e) => handleNavClick(item, e)}
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'text-[#8CC63F] border-b-2 border-[#8CC63F] cursor-default'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
                      } ${isCurrentPage ? 'pointer-events-none' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={toggleDarkMode}
                className="p-2 mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors duration-200"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              
              <Button
                variant="default"
                onClick={handleLoginClick}
                className="ml-4 bg-[#8CC63F] hover:bg-[#7AB32F]"
              >
                Login
              </Button>
              
              <button
                type="button"
                className="md:hidden ml-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#8CC63F] transition-colors duration-200"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <span className="sr-only">Toggle menu</span>
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-900 transition-colors duration-200">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                const isCurrentPage = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => {
                      handleNavClick(item, e);
                      setIsMenuOpen(false);
                    }}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                      isActive
                        ? 'text-[#8CC63F] bg-gray-50 dark:bg-gray-800 cursor-default'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                    } ${isCurrentPage ? 'pointer-events-none' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
              
              {/* Mobile Login Button */}
              <Button
                variant="default"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLoginClick();
                }}
                className="w-full mt-4 bg-[#8CC63F] hover:bg-[#7AB32F]"
              >
                Login
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%238CC63F" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Transform Education with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8CC63F] to-[#7AB32F]">
                  GGK Learning
                </span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Empower students, teachers, and institutions with our comprehensive learning management system. 
                Experience the future of education today.
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={handleLoginClick}
                  className="bg-[#8CC63F] hover:bg-[#7AB32F] text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Get Started Today
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/about')}
                  className="border-[#8CC63F] text-[#8CC63F] hover:bg-[#8CC63F] hover:text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                  leftIcon={<Play className="h-5 w-5" />}
                >
                  Watch Demo
                </Button>
              </div>
              
              <div className="mt-8 flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-[#8CC63F] mr-2" />
                  Free Trial Available
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-[#8CC63F] mr-2" />
                  No Setup Fees
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-[#8CC63F] mr-2" />
                  24/7 Support
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative z-10">
                <img
                  src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
                  alt="Students learning with technology"
                  className="rounded-2xl shadow-2xl dark:shadow-gray-900/50 w-full h-auto"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#8CC63F]/20 to-transparent"></div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-[#8CC63F] to-[#7AB32F] rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full opacity-10 animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose GGK Learning?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Our platform combines cutting-edge technology with proven educational methodologies 
              to deliver exceptional learning experiences.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg dark:shadow-gray-900/20 hover:shadow-xl dark:hover:shadow-gray-900/30 transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-gray-700"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Educators Worldwide
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See what our community has to say about their experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg dark:shadow-gray-900/20 hover:shadow-xl dark:hover:shadow-gray-900/30 transition-all duration-300 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center mb-6">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-[#8CC63F] to-[#7AB32F] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Educational Experience?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of educators and students who are already experiencing 
            the future of learning with GGK.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="xl"
              onClick={handleLoginClick}
              className="bg-white text-[#8CC63F] hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
              rightIcon={<Rocket className="h-5 w-5" />}
            >
              Start Your Journey
            </Button>
            
            <Button
              variant="outline"
              size="xl"
              onClick={() => navigate('/contact')}
              className="border-white text-white hover:bg-white hover:text-[#8CC63F] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
              leftIcon={<Heart className="h-5 w-5" />}
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <GraduationCap className="h-8 w-8 text-[#8CC63F]" />
                <span className="ml-2 text-xl font-bold">GGK Learning</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Empowering education through innovative technology and comprehensive learning solutions.
              </p>
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  Privacy Policy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  Terms of Service
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/subjects')}
                    className="text-gray-400 hover:text-white p-0 h-auto"
                  >
                    Subjects
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/resources')}
                    className="text-gray-400 hover:text-white p-0 h-auto"
                  >
                    Resources
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white p-0 h-auto"
                  >
                    Analytics
                  </Button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/contact')}
                    className="text-gray-400 hover:text-white p-0 h-auto"
                  >
                    Contact Us
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white p-0 h-auto"
                  >
                    Help Center
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white p-0 h-auto"
                  >
                    Documentation
                  </Button>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 GGK Learning Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}