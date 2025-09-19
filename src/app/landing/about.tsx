import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Target, 
  Heart, 
  Users, 
  Award, 
  Globe, 
  BookOpen, 
  Lightbulb,
  ArrowRight,
  CheckCircle,
  Star,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';
import { Navigation } from '../../components/shared/Navigation';

const values = [
  {
    icon: Target,
    title: 'Excellence in Education',
    description: 'We strive for the highest standards in educational content and delivery'
  },
  {
    icon: Heart,
    title: 'Student-Centered Approach',
    description: 'Every decision we make puts student success and wellbeing first'
  },
  {
    icon: Lightbulb,
    title: 'Innovation & Technology',
    description: 'Leveraging cutting-edge technology to enhance learning experiences'
  },
  {
    icon: Globe,
    title: 'Global Accessibility',
    description: 'Making quality education accessible to students worldwide'
  }
];

const stats = [
  { number: '50,000+', label: 'Active Students', icon: Users },
  { number: '2,500+', label: 'Certified Teachers', icon: GraduationCap },
  { number: '150+', label: 'Partner Schools', icon: BookOpen },
  { number: '25+', label: 'Countries Served', icon: Globe }
];

const team = [
  {
    name: 'Dr. Sarah Johnson',
    role: 'Chief Education Officer',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: '20+ years in educational technology and curriculum development'
  },
  {
    name: 'Michael Chen',
    role: 'Head of Technology',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Former Google engineer specializing in educational platforms'
  },
  {
    name: 'Dr. Amira Hassan',
    role: 'Director of Curriculum',
    image: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Educational psychologist with expertise in learning methodologies'
  }
];

const milestones = [
  { year: '2018', event: 'GGK Learning founded with a vision to transform education' },
  { year: '2019', event: 'Launched our first digital learning platform' },
  { year: '2020', event: 'Expanded to serve 10,000+ students during global challenges' },
  { year: '2021', event: 'Introduced AI-powered personalized learning paths' },
  { year: '2022', event: 'Reached 25,000+ students across 15 countries' },
  { year: '2023', event: 'Launched comprehensive teacher training programs' },
  { year: '2024', event: 'Achieved 50,000+ active students milestone' }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#8CC63F] to-[#7AB635] text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                About GGK Learning
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-green-100 max-w-4xl mx-auto">
                Empowering educators and inspiring students through innovative educational technology 
                and comprehensive learning solutions since 2018.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  Our Mission
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                  To democratize access to quality education by providing innovative, 
                  technology-enhanced learning solutions that adapt to every student's 
                  unique needs and learning style.
                </p>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  We believe that every student deserves access to world-class education, 
                  regardless of their location, background, or circumstances.
                </p>
              </div>
              <div className="relative">
                <img
                  src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Students learning together"
                  className="rounded-xl shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#8CC63F]/20 to-transparent rounded-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Our Core Values
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => {
                const IconComponent = value.icon;
                return (
                  <div key={index} className="text-center group">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {value.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Our Impact
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Numbers that reflect our commitment to educational excellence
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {stat.number}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 font-medium">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Our Journey
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Key milestones in our mission to transform education
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-[#8CC63F] rounded-full" />
              
              <div className="space-y-12">
                {milestones.map((milestone, index) => (
                  <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-[#8CC63F] mb-2">
                          {milestone.year}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">
                          {milestone.event}
                        </p>
                      </div>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="w-4 h-4 bg-[#8CC63F] rounded-full border-4 border-white dark:border-gray-900" />
                    </div>
                    
                    <div className="w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Leadership Team
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Meet the experts driving innovation in education
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <div key={index} className="text-center group">
                  <div className="relative mb-6">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-32 h-32 rounded-full mx-auto object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#8CC63F]/20 to-transparent rounded-full" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {member.name}
                  </h3>
                  <div className="text-[#8CC63F] font-medium mb-3">
                    {member.role}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {member.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join Our Educational Community
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Be part of a global community dedicated to transforming education for the better
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signin"
                className="bg-[#8CC63F] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#7AB635] transition-colors inline-flex items-center"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/contact"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-colors inline-flex items-center justify-center"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}