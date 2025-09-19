import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Target, 
  Eye, 
  Heart, 
  Users, 
  Award, 
  Globe, 
  Lightbulb, 
  BookOpen,
  ArrowRight,
  CheckCircle,
  Star,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

const values = [
  {
    icon: Target,
    title: 'Excellence in Education',
    description: 'We strive for the highest standards in educational content and delivery'
  },
  {
    icon: Heart,
    title: 'Student-Centered Approach',
    description: 'Every decision we make puts student success and wellbeing at the center'
  },
  {
    icon: Lightbulb,
    title: 'Innovation & Technology',
    description: 'Leveraging cutting-edge technology to enhance the learning experience'
  },
  {
    icon: Globe,
    title: 'Global Accessibility',
    description: 'Making quality education accessible to students worldwide'
  },
  {
    icon: Users,
    title: 'Collaborative Learning',
    description: 'Fostering community and collaboration among students and educators'
  },
  {
    icon: Shield,
    title: 'Trust & Security',
    description: 'Maintaining the highest standards of data security and privacy'
  }
];

const achievements = [
  {
    icon: Users,
    number: '50,000+',
    label: 'Active Students',
    description: 'Students learning with our platform'
  },
  {
    icon: BookOpen,
    number: '500+',
    label: 'Educational Institutions',
    description: 'Schools and organizations trust us'
  },
  {
    icon: Globe,
    number: '25+',
    label: 'Countries',
    description: 'Global reach and impact'
  },
  {
    icon: Award,
    number: '98%',
    label: 'Satisfaction Rate',
    description: 'Student and teacher satisfaction'
  }
];

const team = [
  {
    name: 'Dr. Sarah Ahmed',
    role: 'Chief Education Officer',
    description: 'Former UNESCO education specialist with 20+ years in curriculum development',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    name: 'Prof. Michael Chen',
    role: 'Head of Technology',
    description: 'MIT graduate leading our educational technology innovations',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    name: 'Dr. Fatima Al-Rashid',
    role: 'Director of Content',
    description: 'Oxford-educated expert in multilingual educational content',
    image: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400'
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#8CC63F] via-[#7AB635] to-[#6DA52F] text-white py-20">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            About GGK Learning
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
            Empowering minds, transforming futures through innovative educational technology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signin"
              className="inline-flex items-center px-8 py-4 bg-white text-[#8CC63F] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Join Our Mission
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-8 h-8 text-[#8CC63F]" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                To democratize access to quality education by providing innovative, technology-driven learning solutions that adapt to every student's unique needs and learning style.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#8CC63F]" />
                  <span className="text-gray-700 dark:text-gray-300">Personalized learning experiences</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#8CC63F]" />
                  <span className="text-gray-700 dark:text-gray-300">Evidence-based teaching methods</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#8CC63F]" />
                  <span className="text-gray-700 dark:text-gray-300">Continuous innovation and improvement</span>
                </li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Eye className="w-8 h-8 text-[#8CC63F]" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Our Vision</h2>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                To become the world's leading educational platform, where every learner can achieve their full potential through engaging, accessible, and effective learning experiences.
              </p>
              <div className="bg-[#8CC63F]/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Looking Ahead to 2030
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We envision a world where geographical and economic barriers to quality education are eliminated, 
                  and every student has access to world-class learning resources.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-[#8CC63F]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
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

      {/* Achievements Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Impact
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Measurable results that speak to our commitment
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => {
              const IconComponent = achievement.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-[#8CC63F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-[#8CC63F]" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-[#8CC63F] mb-2">
                    {achievement.number}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {achievement.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {achievement.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Meet Our Leadership Team
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Experienced educators and technologists driving innovation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="aspect-w-3 aspect-h-3">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-64 object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {member.name}
                  </h3>
                  <div className="text-[#8CC63F] font-semibold mb-3">
                    {member.role}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {member.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#8CC63F] to-[#7AB635]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Join the GGK Learning Community
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Be part of our mission to transform education and empower learners worldwide
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signin"
              className="inline-flex items-center px-8 py-4 bg-white text-[#8CC63F] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}