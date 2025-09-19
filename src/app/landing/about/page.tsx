import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  Target, 
  Award, 
  Globe, 
  Heart,
  ArrowRight,
  CheckCircle,
  Star,
  BookOpen,
  Lightbulb,
  Zap
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';
import { Button } from '../../../components/shared/Button';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-[#8CC63F]/10 via-white to-[#7AB635]/5 dark:from-[#8CC63F]/20 dark:via-gray-900 dark:to-[#7AB635]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center shadow-lg">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              About <span className="text-[#8CC63F]">GGK Learning</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              Empowering educational institutions with comprehensive learning management solutions 
              that transform how students learn and educators teach.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-[#8CC63F] hover:bg-[#7AB635]">
                <BookOpen className="h-5 w-5 mr-2" />
                Explore Features
              </Button>
              <Button variant="outline" size="lg">
                <Users className="h-5 w-5 mr-2" />
                Meet Our Team
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-[#8CC63F]/20 rounded-lg flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-[#8CC63F]" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                To revolutionize education by providing innovative, accessible, and comprehensive 
                learning management solutions that empower educators and inspire students to reach 
                their full potential.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-[#7AB635]/20 rounded-lg flex items-center justify-center mb-6">
                <Lightbulb className="h-6 w-6 text-[#7AB635]" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Vision</h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                To be the leading global platform that bridges the gap between traditional education 
                and modern technology, creating personalized learning experiences for every student 
                worldwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              The principles that guide everything we do and shape our commitment to educational excellence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Heart className="h-8 w-8" />,
                title: "Student-Centered",
                description: "Every decision we make prioritizes student success and learning outcomes.",
                color: "text-red-500"
              },
              {
                icon: <Zap className="h-8 w-8" />,
                title: "Innovation",
                description: "We continuously evolve our platform with cutting-edge educational technology.",
                color: "text-yellow-500"
              },
              {
                icon: <Users className="h-8 w-8" />,
                title: "Collaboration",
                description: "We believe in the power of community and collaborative learning environments.",
                color: "text-blue-500"
              },
              {
                icon: <Award className="h-8 w-8" />,
                title: "Excellence",
                description: "We strive for the highest quality in everything we deliver to our users.",
                color: "text-purple-500"
              },
              {
                icon: <Globe className="h-8 w-8" />,
                title: "Accessibility",
                description: "Education should be accessible to everyone, regardless of location or background.",
                color: "text-green-500"
              },
              {
                icon: <CheckCircle className="h-8 w-8" />,
                title: "Integrity",
                description: "We operate with transparency, honesty, and ethical practices in all our interactions.",
                color: "text-indigo-500"
              }
            ].map((value, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className={`${value.color} mb-4`}>
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-400">
                <p className="text-lg">
                  GGK Learning was founded with a simple yet powerful vision: to make quality education 
                  accessible and engaging for students around the world. What started as a small team 
                  of passionate educators and technologists has grown into a comprehensive platform 
                  serving thousands of institutions globally.
                </p>
                <p>
                  Our journey began when we recognized the gap between traditional teaching methods 
                  and the digital-native generation of students. We set out to create a platform 
                  that would bridge this gap while maintaining the human connection that makes 
                  education truly meaningful.
                </p>
                <p>
                  Today, GGK Learning serves educational institutions of all sizes, from small 
                  community schools to large university systems, providing them with the tools 
                  they need to deliver exceptional educational experiences.
                </p>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-2xl p-8 text-white">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">10K+</div>
                    <div className="text-sm opacity-90">Students Served</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">500+</div>
                    <div className="text-sm opacity-90">Institutions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">50+</div>
                    <div className="text-sm opacity-90">Countries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">99%</div>
                    <div className="text-sm opacity-90">Satisfaction Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A diverse group of educators, technologists, and innovators working together 
              to transform education.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Dr. Sarah Johnson",
                role: "Chief Executive Officer",
                image: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400",
                bio: "Former university dean with 20+ years in educational leadership."
              },
              {
                name: "Michael Chen",
                role: "Chief Technology Officer",
                image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400",
                bio: "Tech innovator specializing in educational software and AI."
              },
              {
                name: "Dr. Emily Rodriguez",
                role: "Head of Curriculum",
                image: "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400",
                bio: "Curriculum design expert with expertise in personalized learning."
              }
            ].map((member, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {member.name}
                </h3>
                <p className="text-[#8CC63F] font-medium mb-3">
                  {member.role}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-[#8CC63F] to-[#7AB635]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Educational Institution?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of educators who are already using GGK Learning to create 
            exceptional educational experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-[#8CC63F] hover:bg-gray-100"
              onClick={() => window.location.href = '/contact'}
            >
              Get Started Today
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white/10"
              onClick={() => window.location.href = '/signin'}
            >
              Sign In to Your Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <GraduationCap className="h-8 w-8 text-[#8CC63F] mr-2" />
                <span className="text-2xl font-bold">GGK Learning</span>
              </div>
              <p className="text-gray-400 mb-4">
                Transforming education through innovative technology and personalized learning experiences.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Users className="h-5 w-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/subjects" className="text-gray-400 hover:text-white transition-colors">Subjects</Link></li>
                <li><Link to="/resources" className="text-gray-400 hover:text-white transition-colors">Resources</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Community</a></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact Support</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 GGK Learning. All rights reserved. Built with passion for education.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}