// ======================================
// ABOUT PAGE - /src/app/landing/about/page.tsx
// Complete IGCSE/Cambridge/Edexcel focused About page
// ======================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  Target, 
  Globe, 
  Heart,
  ArrowRight,
  CheckCircle,
  Star,
  BookOpen,
  Lightbulb,
  Zap,
  Award,
  Eye,
  Building,
  Video,
  FileText,
  MessageSquare
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';
import { Button } from '../../../components/shared/Button';

const milestones = [
  { year: '2015', event: 'GGK Learning founded in Kuwait', detail: 'Started with IGCSE Mathematics' },
  { year: '2017', event: 'Cambridge Partnership', detail: 'Official Cambridge resource partner' },
  { year: '2019', event: 'Edexcel Collaboration', detail: 'Added Pearson Edexcel content' },
  { year: '2021', event: '10,000+ Students', detail: 'Reached major milestone' },
  { year: '2023', event: 'AI Integration', detail: 'Launched AI-powered mock exams' },
  { year: '2024', event: '50,000+ Students', detail: 'Serving 500+ schools globally' }
];

const teamMembers = [
  {
    name: 'Dr. Sarah Johnson',
    role: 'CEO & Founder',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Former Cambridge examiner with 20+ years in IGCSE education',
    expertise: ['Curriculum Development', 'Educational Technology', 'IGCSE Standards']
  },
  {
    name: 'Michael Chen',
    role: 'Chief Technology Officer',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'EdTech innovator specializing in AI-powered learning systems',
    expertise: ['AI/ML', 'Platform Architecture', 'Learning Analytics']
  },
  {
    name: 'Dr. Emily Rodriguez',
    role: 'Head of Curriculum',
    image: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Cambridge & Edexcel curriculum specialist with expertise in exam preparation',
    expertise: ['IGCSE Curriculum', 'Assessment Design', 'Teacher Training']
  },
  {
    name: 'Ahmed Al-Kuwait',
    role: 'Regional Director MENA',
    image: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Leading educational transformation across Middle East schools',
    expertise: ['School Partnerships', 'Regional Education', 'Student Success']
  }
];

const achievements = [
  { number: '50,000+', label: 'Active Students', icon: Users },
  { number: '500+', label: 'Partner Schools', icon: Building },
  { number: '95%', label: 'Pass Rate', icon: Award },
  { number: '15,000+', label: 'Past Papers', icon: FileText },
  { number: '3,000+', label: 'Video Lessons', icon: Video },
  { number: '30+', label: 'Subjects Covered', icon: BookOpen }
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#8CC63F]/95 to-[#7AB635]/95 py-20">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg"
            alt="GGK Learning Team"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-white/10 backdrop-blur rounded-full flex items-center justify-center">
                <GraduationCap className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Transforming IGCSE & A-Level Education
            </h1>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto mb-8">
              GGK Learning is the Middle East's leading platform for Cambridge and Edexcel 
              exam preparation, empowering students to achieve academic excellence
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-[#8CC63F] hover:bg-gray-100 font-semibold"
                onClick={() => navigate('/subjects')}
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Explore Our Curriculum
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white/10 font-semibold"
                onClick={() => navigate('/contact')}
              >
                <Users className="h-5 w-5 mr-2" />
                Partner With Us
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-[#8CC63F]/20 rounded-lg flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-[#8CC63F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h2>
              <p className="text-gray-600 dark:text-gray-400">
                To democratize access to world-class IGCSE and A-Level education through 
                innovative technology, comprehensive resources, and expert guidance.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-[#7AB635]/20 rounded-lg flex items-center justify-center mb-6">
                <Eye className="h-6 w-6 text-[#7AB635]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Vision</h2>
              <p className="text-gray-600 dark:text-gray-400">
                To be the global standard for Cambridge and Edexcel exam preparation, 
                enabling every student to achieve their full academic potential.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-[#8CC63F]/20 rounded-lg flex items-center justify-center mb-6">
                <Heart className="h-6 w-6 text-[#8CC63F]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Values</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Excellence in education, innovation in technology, integrity in service, 
                and commitment to student success.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Journey Timeline */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Journey to Excellence
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From a small startup to the region's leading IGCSE platform
            </p>
          </div>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-[#8CC63F] hidden md:block"></div>
            
            {/* Timeline items */}
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex flex-col md:flex-row items-center ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className="flex-1">
                    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${index % 2 === 0 ? 'md:mr-8' : 'md:ml-8'}`}>
                      <div className="text-[#8CC63F] font-bold text-xl mb-2">{milestone.year}</div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{milestone.event}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{milestone.detail}</p>
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-[#8CC63F] rounded-full border-4 border-white dark:border-gray-900 z-10 my-4 md:my-0"></div>
                  <div className="flex-1 hidden md:block"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="py-20 bg-gradient-to-r from-[#8CC63F] to-[#7AB635]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Our Impact in Numbers
            </h2>
            <p className="text-xl text-white/90">
              Measurable success across all metrics
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {achievements.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                  <div className="text-sm text-white/90">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Leadership Team
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Education experts and technology innovators working together
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {member.name}
                  </h3>
                  <p className="text-[#8CC63F] font-medium mb-3">
                    {member.role}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {member.bio}
                  </p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {member.expertise.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Join the GGK Learning Community
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Experience the future of IGCSE and A-Level education today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-[#8CC63F] hover:bg-[#7AB635] text-white font-semibold"
              onClick={() => navigate('/signin')}
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-gray-900 dark:border-white text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold"
              onClick={() => navigate('/contact')}
            >
              Contact Our Team
              <MessageSquare className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}