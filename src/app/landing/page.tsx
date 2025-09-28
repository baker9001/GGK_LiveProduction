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
  Trophy,
  Clock,
  BarChart3,
  UserCheck,
  BookMarked,
  Sparkles
} from 'lucide-react';
import { Navigation } from '../../components/shared/Navigation';
import { Button } from '../../components/shared/Button';

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('home');

  // Set default active section to 'home' when landing on the page
  useEffect(() => {
    // Check if we're on the root landing page or /landing
    if (location.pathname === '/' || location.pathname === '/landing') {
      setActiveSection('home');
    }
  }, [location.pathname]);

  // Handle navigation with prevention of page refresh for same tab
  const handleNavigation = (section: string, path: string) => {
    // If user clicks on the same tab they're already on, prevent navigation
    if (activeSection === section && (location.pathname === path || 
        (section === 'home' && (location.pathname === '/' || location.pathname === '/landing')))) {
      return; // Do nothing - prevent page refresh
    }
    
    setActiveSection(section);
    navigate(path);
  };

  // Check if a tab is currently active
  const isTabActive = (section: string, path: string) => {
    if (section === 'home') {
      return location.pathname === '/' || location.pathname === '/landing';
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#8CC63F]/10 to-blue-500/10 dark:from-[#8CC63F]/20 dark:to-blue-500/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-[#8CC63F]/20 blur-3xl rounded-full"></div>
                <GraduationCap className="relative h-24 w-24 text-[#8CC63F] mx-auto" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Transform Education with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8CC63F] to-blue-600">
                GGK Learning
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Comprehensive learning management system designed for modern educational institutions. 
              Empower students, support teachers, and streamline administration.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={() => navigate('/signin')}
                className="bg-[#8CC63F] hover:bg-[#7AB635] text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                Login
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleNavigation('about', '/about')}
                className="border-2 border-[#8CC63F] text-[#8CC63F] hover:bg-[#8CC63F] hover:text-white px-8 py-4 text-lg font-semibold transition-all duration-300"
                rightIcon={<Play className="h-5 w-5" />}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'home', label: 'Home', path: '/landing' },
              { id: 'subjects', label: 'Subjects', path: '/subjects' },
              { id: 'resources', label: 'Resources', path: '/resources' },
              { id: 'about', label: 'About', path: '/about' },
              { id: 'contact', label: 'Contact', path: '/contact' }
            ].map((tab) => {
              const isActive = isTabActive(tab.id, tab.path);
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavigation(tab.id, tab.path)}
                  disabled={isActive} // Disable if already active
                  className={`
                    inline-flex items-center px-1 pt-4 pb-4 text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'text-[#8CC63F] border-b-2 border-[#8CC63F] cursor-default'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
                    }
                    ${isActive ? 'pointer-events-none' : ''}
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for Modern Education
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything you need to create engaging learning experiences and manage educational operations efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Student Management */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Student Management</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Comprehensive student profiles, enrollment tracking, and academic progress monitoring.
              </p>
              <Button
                variant="outline"
                onClick={() => handleNavigation('about', '/about')}
                className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Learn More
              </Button>
            </div>

            {/* Learning Analytics */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F] to-green-600 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Learning Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Data-driven insights into student performance, learning patterns, and educational outcomes.
              </p>
              <Button
                variant="outline"
                onClick={() => handleNavigation('about', '/about')}
                className="w-full border-[#8CC63F] text-[#8CC63F] hover:bg-[#8CC63F] hover:text-white"
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Explore Analytics
              </Button>
            </div>

            {/* Content Library */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Content Library</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Rich multimedia content, interactive lessons, and comprehensive curriculum resources.
              </p>
              <Button
                variant="outline"
                onClick={() => handleNavigation('resources', '/resources')}
                className="w-full border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Browse Library
              </Button>
            </div>

            {/* Assessment Tools */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assessment Tools</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Create, distribute, and grade assessments with automated scoring and detailed feedback.
              </p>
              <Button
                variant="outline"
                onClick={() => handleNavigation('about', '/about')}
                className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                View Tools
              </Button>
            </div>

            {/* Communication Hub */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Communication Hub</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Seamless communication between students, teachers, and parents with real-time updates.
              </p>
              <Button
                variant="outline"
                onClick={() => handleNavigation('contact', '/contact')}
                className="w-full border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white"
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Get Connected
              </Button>
            </div>

            {/* Smart Scheduling */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Smart Scheduling</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Intelligent timetable management with conflict detection and resource optimization.
              </p>
              <Button
                variant="outline"
                onClick={() => handleNavigation('about', '/about')}
                className="w-full border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-white"
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                See Scheduling
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose GGK Learning?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Join thousands of educational institutions worldwide who trust GGK Learning to deliver exceptional educational experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-[#8CC63F]/20 to-[#8CC63F]/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-10 w-10 text-[#8CC63F]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Optimized performance ensures smooth operation even with thousands of concurrent users.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Secure & Reliable</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Enterprise-grade security with 99.9% uptime guarantee and comprehensive data protection.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Target className="h-10 w-10 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Precision Focused</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Tailored solutions that adapt to your institution's unique needs and educational goals.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-10 w-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Proven Results</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Measurable improvements in student engagement, learning outcomes, and operational efficiency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-gradient-to-r from-[#8CC63F] to-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by Educational Leaders
            </h2>
            <p className="text-xl text-green-100 max-w-3xl mx-auto">
              Our platform serves educational institutions across the globe, delivering measurable impact.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">500+</div>
              <div className="text-green-100">Educational Institutions</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">50K+</div>
              <div className="text-green-100">Active Students</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">5K+</div>
              <div className="text-green-100">Educators</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">99.9%</div>
              <div className="text-green-100">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Real feedback from educators and administrators using GGK Learning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "GGK Learning has revolutionized how we manage our institution. The intuitive interface and powerful features have improved our efficiency by 40%."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  SM
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Sarah Mitchell</div>
                  <div className="text-gray-600 dark:text-gray-400">Principal, Greenwood Academy</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "The analytics dashboard provides incredible insights into student performance. We can now identify and support struggling students much earlier."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#8CC63F] to-green-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  DR
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Dr. Robert Chen</div>
                  <div className="text-gray-600 dark:text-gray-400">Academic Director, Tech Institute</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "Our teachers love the content creation tools. They can easily develop engaging lessons and track student progress in real-time."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  MJ
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Maria Johnson</div>
                  <div className="text-gray-600 dark:text-gray-400">Head of Curriculum, Valley School</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Educational Institution?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join the revolution in educational technology. Start your journey with GGK Learning today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/signin')}
                className="bg-[#8CC63F] hover:bg-[#7AB635] text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                rightIcon={<Rocket className="h-5 w-5" />}
              >
                Get Started Now
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleNavigation('contact', '/contact')}
                className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 text-lg font-semibold transition-all duration-300"
                rightIcon={<Heart className="h-5 w-5" />}
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6">
                <GraduationCap className="h-8 w-8 text-[#8CC63F] mr-3" />
                <span className="text-2xl font-bold">GGK Learning</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Empowering educational institutions with cutting-edge technology to create exceptional learning experiences and drive student success.
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
              <h3 className="text-lg font-semibold mb-6">Platform</h3>
              <ul className="space-y-3">
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation('subjects', '/subjects')}
                    className="text-gray-400 hover:text-white p-0 h-auto font-normal justify-start"
                  >
                    Subjects
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation('resources', '/resources')}
                    className="text-gray-400 hover:text-white p-0 h-auto font-normal justify-start"
                  >
                    Resources
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white p-0 h-auto font-normal justify-start"
                  >
                    Analytics
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white p-0 h-auto font-normal justify-start"
                  >
                    Assessments
                  </Button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-6">Support</h3>
              <ul className="space-y-3">
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation('about', '/about')}
                    className="text-gray-400 hover:text-white p-0 h-auto font-normal justify-start"
                  >
                    About Us
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation('contact', '/contact')}
                    className="text-gray-400 hover:text-white p-0 h-auto font-normal justify-start"
                  >
                    Contact
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white p-0 h-auto font-normal justify-start"
                  >
                    Help Center
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white p-0 h-auto font-normal justify-start"
                  >
                    Documentation
                  </Button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 GGK Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}