// /home/project/src/app/landing/PlaceholderPages.tsx
// Placeholder pages for Resources, About, and Contact - with proper structure and Navigation

import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '../../components/shared/Navigation';
import { Button } from '../../components/shared/Button';
import { 
  FileText, Download, Book, Video, Clock, Award,
  Users, Mail, Phone, MapPin, MessageSquare, Send,
  GraduationCap, Target, Zap, CheckCircle
} from 'lucide-react';

// Resources Page
export const ResourcesPage = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <Navigation />
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Learning Resources
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Access thousands of past papers, study guides, video lessons, and practice materials for IGCSE, O-Level, and A-Level
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <Download className="w-12 h-12 text-[#8CC63F] mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Past Papers</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            15,000+ past papers from 2010-2024 with mark schemes and examiner reports
          </p>
          <Button variant="outline" size="sm" rounded="lg">
            Browse Papers
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <Video className="w-12 h-12 text-[#8CC63F] mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Video Lessons</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            3,000+ animated video explanations covering every topic in detail
          </p>
          <Button variant="outline" size="sm" rounded="lg">
            Watch Videos
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <Book className="w-12 h-12 text-[#8CC63F] mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Study Guides</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comprehensive revision notes and study guides for all subjects
          </p>
          <Button variant="outline" size="sm" rounded="lg">
            Access Guides
          </Button>
        </div>
      </div>

      <div className="text-center">
        <Button variant="default" size="lg" rounded="full" onClick={() => window.location.href = '/signin'}>
          Sign In to Access All Resources
        </Button>
      </div>
    </div>
  </div>
);

// About Page
export const AboutPage = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <Navigation />
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          About GGK Learning
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Your trusted partner for IGCSE, O-Level, and A-Level success. We're dedicated to helping students 
          achieve their academic goals through comprehensive resources and expert support.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            To provide world-class educational resources that make quality exam preparation accessible to 
            every student, regardless of their location or background.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#8CC63F] flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400">Official Cambridge & Edexcel Partner</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#8CC63F] flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400">95% Student Pass Rate</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#8CC63F] flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400">24/7 Learning Support</span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why Choose GGK?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-[#8CC63F] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Proven Results</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Over 50,000 students have achieved top grades with our resources
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-[#8CC63F] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Exam-Focused</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Content aligned with official Cambridge and Edexcel specifications
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-[#8CC63F] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Expert Teachers</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Learn from qualified IGCSE and A-Level teachers with years of experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#8CC63F] to-[#7AB635] rounded-2xl p-8 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Join Our Success Story</h2>
        <p className="text-xl mb-6 opacity-90">Start your journey to academic excellence today</p>
        <Button 
          variant="secondary" 
          size="lg" 
          rounded="full" 
          className="!bg-white !text-[#8CC63F] hover:!bg-gray-100"
          onClick={() => window.location.href = '/signin'}
        >
          Get Started Now
        </Button>
      </div>
    </div>
  </div>
);

// Contact Page
export const ContactPage = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <Navigation />
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Contact Us
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          We're here to help! Reach out to our support team for any questions about our courses, 
          resources, or technical support.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
        {/* Contact Information */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Get in Touch</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-[#8CC63F]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-semibold text-gray-900 dark:text-white">support@ggklearning.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-[#8CC63F]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="font-semibold text-gray-900 dark:text-white">+965 9722 2711</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-[#8CC63F]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                  <p className="font-semibold text-gray-900 dark:text-white">Kuwait City, Kuwait</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#8CC63F]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Support Hours</p>
                  <p className="font-semibold text-gray-900 dark:text-white">24/7 Support Available</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/subjects" className="block text-[#8CC63F] hover:text-[#7AB635] transition-colors">
                Browse Subjects →
              </Link>
              <Link to="/resources" className="block text-[#8CC63F] hover:text-[#7AB635] transition-colors">
                Learning Resources →
              </Link>
              <Link to="/signin" className="block text-[#8CC63F] hover:text-[#7AB635] transition-colors">
                Student Portal →
              </Link>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Send us a Message</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>General Inquiry</option>
                <option>Technical Support</option>
                <option>Course Information</option>
                <option>Partnership</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Tell us how we can help..."
              />
            </div>

            <Button
              variant="default"
              size="lg"
              rounded="lg"
              className="w-full"
              rightIcon={<Send />}
              onClick={(e) => {
                e.preventDefault();
                alert('Contact form submission would be handled here');
              }}
            >
              Send Message
            </Button>
          </form>
        </div>
      </div>
    </div>
  </div>
);

export default { ResourcesPage, AboutPage, ContactPage };