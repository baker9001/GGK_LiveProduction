import React from 'react';
import { GraduationCap, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-[#8CC63F]" />
              <span className="ml-2 text-2xl font-bold">GGK Learning</span>
            </div>
            <p className="text-gray-400">
              Your comprehensive IGCSE learning platform. Master every subject with interactive lessons, 
              practice exams, and personalized feedback.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/subjects" className="text-gray-400 hover:text-white transition-colors">
                  All Subjects
                </a>
              </li>
              <li>
                <a href="/resources" className="text-gray-400 hover:text-white transition-colors">
                  Learning Resources
                </a>
              </li>
              <li>
                <a href="/practice-exams" className="text-gray-400 hover:text-white transition-colors">
                  Practice Exams
                </a>
              </li>
              <li>
                <a href="/progress-tracking" className="text-gray-400 hover:text-white transition-colors">
                  Progress Tracking
                </a>
              </li>
              <li>
                <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Subjects */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Popular Subjects</h3>
            <ul className="space-y-2">
              <li>
                <a href="/subjects/mathematics" className="text-gray-400 hover:text-white transition-colors">
                  Mathematics
                </a>
              </li>
              <li>
                <a href="/subjects/physics" className="text-gray-400 hover:text-white transition-colors">
                  Physics
                </a>
              </li>
              <li>
                <a href="/subjects/chemistry" className="text-gray-400 hover:text-white transition-colors">
                  Chemistry
                </a>
              </li>
              <li>
                <a href="/subjects/biology" className="text-gray-400 hover:text-white transition-colors">
                  Biology
                </a>
              </li>
              <li>
                <a href="/subjects/english-literature" className="text-gray-400 hover:text-white transition-colors">
                  English Literature
                </a>
              </li>
              <li>
                <a href="/subjects/computer-science" className="text-gray-400 hover:text-white transition-colors">
                  Computer Science
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-[#8CC63F] mr-3" />
                <span className="text-gray-400">support@ggklearning.com</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-[#8CC63F] mr-3" />
                <span className="text-gray-400">+965 2XXX XXXX</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-[#8CC63F] mr-3" />
                <span className="text-gray-400">Kuwait City, Kuwait</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 GGK Learning Platform. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </a>
              <a href="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}