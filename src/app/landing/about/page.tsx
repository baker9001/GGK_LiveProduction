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
  TrendingUp
} from 'lucide-react';
import { Navigation } from '../../../components/shared/Navigation';

const values = [
  {
    icon: Target,
    title: 'Excellence',
    description: 'We strive for the highest standards in educational quality and student outcomes.'
  },
  {
    icon: Heart,
    title: 'Care',
    description: 'Every student matters. We provide personalized attention and support for individual growth.'
  },
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'We embrace cutting-edge technology and modern teaching methodologies.'
  },
  {
    icon: Globe,
    title: 'Global Perspective',
    description: 'Preparing students for success in an interconnected world with diverse perspectives.'
  }
];

const achievements = [
  {
    number: '50,000+',
    label: 'Students Educated',
    icon: Users
  },
  {
    number: '500+',
    label: 'Expert Teachers',
    icon: Award
  },
  {
    number: '25+',
    label: 'Countries Served',
    icon: Globe
  },
  {
    number: '98%',
    label: 'Success Rate',
    icon: TrendingUp
  }
];

const teamMembers = [
  {
    name: 'Dr. Sarah Johnson',
    role: 'Chief Academic Officer',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: '20+ years in educational leadership and curriculum development'
  },
  {
    name: 'Prof. Ahmed Al-Rashid',
    role: 'Director of Innovation',
    image: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Expert in educational technology and digital learning platforms'
  },
  {
    name: 'Dr. Maria Rodriguez',
    role: 'Head of Student Success',
    image: 'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Specialist in student engagement and academic performance optimization'
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/shutterstock_2475380851.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL3NodXR0ZXJzdG9ja18yNDc1MzgwODUxLmpwZyIsImlhdCI6MTc1NjA2MDQ1OSwiZXhwIjo0ODc4MTI0NDU5fQ.vmQTU-G_jb0V6yz8TGg2-WP-mqnxYD-5A8VIzatHizI"
          alt="Educational background"
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
      </div>

      {/* Navigation */}
      <div className="relative z-10">
        <Navigation />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center mb-6">
              <GraduationCap className="h-16 w-16 text-[#8CC63F]" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-6">
              About GGK Learning
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Empowering minds, shaping futures. We are dedicated to providing world-class education 
              that prepares students for success in an ever-evolving global landscape.
            </p>
          </div>

          {/* Mission Statement */}
          <div className="bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-8 mb-16">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed">
                To revolutionize education by combining traditional academic excellence with innovative 
                technology, creating personalized learning experiences that inspire curiosity, foster 
                critical thinking, and prepare students to become confident, capable leaders of tomorrow.
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const IconComponent = value.icon;
                return (
                  <div
                    key={index}
                    className="bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-6 text-center hover:bg-gray-800/60 transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="w-16 h-16 bg-[#8CC63F] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#7AB635] transition-colors">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-[#8CC63F] transition-colors">
                      {value.title}
                    </h3>
                    <p className="text-gray-300 text-sm">
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {achievements.map((achievement, index) => {
                const IconComponent = achievement.icon;
                return (
                  <div
                    key={index}
                    className="bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-6 text-center hover:bg-gray-800/60 transition-all duration-300"
                  >
                    <IconComponent className="h-8 w-8 text-[#8CC63F] mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-2">
                      {achievement.number}
                    </div>
                    <div className="text-sm text-gray-300">
                      {achievement.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leadership Team */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Leadership Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-6 text-center hover:bg-gray-800/60 transition-all duration-300 hover:scale-105 group"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4 border-[#8CC63F] group-hover:border-[#7AB635] transition-colors">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-[#8CC63F] transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-[#8CC63F] font-medium mb-3">
                    {member.role}
                  </p>
                  <p className="text-gray-300 text-sm">
                    {member.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action Section */}
          <div className="text-center bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Join Our Educational Community
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Become part of a global learning community that values excellence, innovation, and student success. 
              Start your educational journey with us today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signin"
                className="bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="border border-gray-600 hover:border-[#8CC63F] text-white hover:text-[#8CC63F] font-medium py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}