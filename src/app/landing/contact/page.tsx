// ======================================
// ENHANCED CONTACT & ABOUT PAGES BUNDLE
// Complete IGCSE/Cambridge/Edexcel focused Contact and About pages
// ======================================

// ======================================
// ENHANCED CONTACT PAGE - /src/app/landing/contact/page.tsx
// ======================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  Send,
  User,
  MessageSquare,
  Building,
  Globe,
  ArrowRight,
  Clock,
  CheckCircle,
  Headphones,
  BookOpen,
  Users,
  Award,
  FileText
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Textarea } from '../../../components/shared/FormField';
import { Navigation } from '../../../components/shared/Navigation';
import { toast } from '../../../components/shared/Toast';

const contactInfo = [
  {
    icon: Mail,
    title: 'Email Support',
    details: [
      'support@ggklearning.com',
      'admissions@ggklearning.com',
      'teachers@ggklearning.com'
    ],
    description: 'Get help with IGCSE/A-Level queries within 24 hours'
  },
  {
    icon: Phone,
    title: 'Phone Support',
    details: [
      '+965 6767 1317 (Main)',
      '+965 9722 2711 (Admissions)',
      '+965 9495 1116 (Technical)'
    ],
    description: 'Speak with our IGCSE specialists during business hours'
  },
  {
    icon: MapPin,
    title: 'Regional Offices',
    details: [
      'Kuwait City, Kuwait (Headquarters)',
      'Dubai, UAE (Regional Office)',
      'Cairo, Egypt (Support Center)'
    ],
    description: 'Serving IGCSE students across the Middle East'
  },
  {
    icon: Clock,
    title: 'Support Hours',
    details: [
      'Sunday - Thursday: 8:00 AM - 8:00 PM',
      'Friday: 2:00 PM - 6:00 PM',
      'Saturday: 10:00 AM - 6:00 PM',
      '24/7 Emergency Exam Support'
    ],
    description: 'Extended hours during exam seasons'
  }
];

const departments = [
  {
    name: 'IGCSE Academic Support',
    email: 'academic@ggklearning.com',
    description: 'Cambridge & Edexcel syllabus queries, past papers help',
    responseTime: '2-4 hours'
  },
  {
    name: 'Technical Support',
    email: 'technical@ggklearning.com',
    description: 'Platform issues, video playback, download problems',
    responseTime: '1-2 hours'
  },
  {
    name: 'School Partnerships',
    email: 'schools@ggklearning.com',
    description: 'Institutional subscriptions, bulk licenses, teacher accounts',
    responseTime: '24 hours'
  },
  {
    name: 'Exam Preparation Help',
    email: 'exams@ggklearning.com',
    description: 'Mock exam queries, grade predictions, study plans',
    responseTime: '4-6 hours'
  },
  {
    name: 'Parent Support',
    email: 'parents@ggklearning.com',
    description: 'Progress tracking, subscription management, payment queries',
    responseTime: '24 hours'
  }
];

const supportFeatures = [
  {
    icon: Headphones,
    title: 'Live Chat Support',
    description: 'Instant help from IGCSE experts'
  },
  {
    icon: BookOpen,
    title: 'Study Guidance',
    description: 'Personalized exam preparation advice'
  },
  {
    icon: Users,
    title: 'Teacher Connect',
    description: 'Direct access to qualified teachers'
  },
  {
    icon: FileText,
    title: 'Resource Help',
    description: 'Assistance finding specific papers'
  }
];

export function EnhancedContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    school: '',
    subject: '',
    examBoard: '',
    department: '',
    urgency: 'normal',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast.success('Message sent! We\'ll respond within 24 hours.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        school: '',
        subject: '',
        examBoard: '',
        department: '',
        urgency: 'normal',
        message: ''
      });
      setIsSubmitting(false);
    }, 1500);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="relative">
        {/* Hero Section with Background */}
        <section className="relative bg-gradient-to-r from-[#8CC63F]/95 to-[#7AB635]/95 py-20">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.pexels.com/photos/3766218/pexels-photo-3766218.jpeg"
              alt="IGCSE Support Team"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center mb-6">
                <div className="w-20 h-20 bg-[#8CC63F] rounded-full flex items-center justify-center">
                  <MessageSquare className="h-10 w-10 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Get IGCSE & A-Level Support
              </h1>
              <p className="text-xl text-gray-200 max-w-3xl mx-auto">
                Connect with our Cambridge and Edexcel specialists for academic support, 
                technical help, or partnership opportunities
              </p>
              
              {/* Quick Stats */}
              <div className="flex items-center justify-center gap-8 mt-8">
                <div className="text-white">
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-sm opacity-90">Exam Support</div>
                </div>
                <div className="text-white">
                  <div className="text-2xl font-bold">2 Hours</div>
                  <div className="text-sm opacity-90">Avg Response</div>
                </div>
                <div className="text-white">
                  <div className="text-2xl font-bold">98%</div>
                  <div className="text-sm opacity-90">Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Contact Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column - Contact Information */}
            <div className="lg:col-span-1 space-y-8">
              {/* Support Features */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Support Features
                </h2>
                <div className="space-y-4">
                  {supportFeatures.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="h-5 w-5 text-[#8CC63F]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Contact Information
                </h2>
                <div className="space-y-6">
                  {contactInfo.map((info, index) => {
                    const IconComponent = info.icon;
                    return (
                      <div key={index}>
                        <div className="flex items-start gap-3">
                          <IconComponent className="h-5 w-5 text-[#8CC63F] mt-1" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                              {info.title}
                            </h3>
                            {info.details.map((detail, idx) => (
                              <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                                {detail}
                              </p>
                            ))}
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              {info.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department Contacts */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Department Contacts
                </h2>
                <div className="space-y-4">
                  {departments.map((dept, index) => (
                    <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {dept.name}
                      </h3>
                      <p className="text-[#8CC63F] text-sm">{dept.email}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {dept.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Response: {dept.responseTime}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Send us a Message
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Fill out the form below and our IGCSE specialists will get back to you within 24 hours
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      id="name"
                      label="Full Name"
                      required
                    >
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter your full name"
                        leftIcon={<User className="h-5 w-5 text-gray-400" />}
                      />
                    </FormField>

                    <FormField
                      id="email"
                      label="Email Address"
                      required
                    >
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                        leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                      />
                    </FormField>

                    <FormField
                      id="phone"
                      label="Phone Number"
                    >
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+965 XXXX XXXX"
                        leftIcon={<Phone className="h-5 w-5 text-gray-400" />}
                      />
                    </FormField>

                    <FormField
                      id="school"
                      label="School/Institution"
                    >
                      <Input
                        id="school"
                        value={formData.school}
                        onChange={(e) => handleInputChange('school', e.target.value)}
                        placeholder="Your school name"
                        leftIcon={<Building className="h-5 w-5 text-gray-400" />}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      id="examBoard"
                      label="Exam Board"
                    >
                      <select
                        id="examBoard"
                        value={formData.examBoard}
                        onChange={(e) => handleInputChange('examBoard', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select exam board</option>
                        <option value="cambridge">Cambridge International</option>
                        <option value="edexcel">Pearson Edexcel</option>
                        <option value="aqa">AQA</option>
                        <option value="ocr">OCR</option>
                        <option value="other">Other</option>
                      </select>
                    </FormField>

                    <FormField
                      id="subject"
                      label="Subject/Topic"
                    >
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        placeholder="e.g., IGCSE Physics 0625"
                        leftIcon={<BookOpen className="h-5 w-5 text-gray-400" />}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      id="department"
                      label="Department"
                    >
                      <select
                        id="department"
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select department</option>
                        {departments.map((dept, index) => (
                          <option key={index} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField
                      id="urgency"
                      label="Priority Level"
                    >
                      <select
                        id="urgency"
                        value={formData.urgency}
                        onChange={(e) => handleInputChange('urgency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High (Exam Soon)</option>
                        <option value="urgent">Urgent (Within 24 hrs)</option>
                      </select>
                    </FormField>
                  </div>

                  <FormField
                    id="message"
                    label="Your Message"
                    required
                  >
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Describe your query in detail. Include syllabus codes, paper numbers, or specific topics if applicable..."
                      rows={6}
                    />
                  </FormField>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="inline h-4 w-4 text-[#8CC63F] mr-1" />
                      We typically respond within 2-4 hours
                    </div>
                    <Button
                      type="submit"
                      className="bg-[#8CC63F] hover:bg-[#7AB635] text-white px-8 py-3"
                      disabled={isSubmitting}
                      rightIcon={isSubmitting ? null : <Send className="h-5 w-5" />}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* FAQ Quick Links */}
              <div className="mt-8 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Common Questions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a href="#" className="flex items-center text-[#8CC63F] hover:text-[#7AB635]">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    How to access past papers?
                  </a>
                  <a href="#" className="flex items-center text-[#8CC63F] hover:text-[#7AB635]">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    School subscription pricing
                  </a>
                  <a href="#" className="flex items-center text-[#8CC63F] hover:text-[#7AB635]">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Mock exam schedules
                  </a>
                  <a href="#" className="flex items-center text-[#8CC63F] hover:text-[#7AB635]">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Teacher account setup
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================================
// ENHANCED ABOUT PAGE - /src/app/landing/about/page.tsx
// ======================================

export function EnhancedAboutPage() {
  const navigate = useNavigate();

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
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-[#8CC63F]"></div>
            
            {/* Timeline items */}
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className="flex-1">
                    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${index % 2 === 0 ? 'mr-8' : 'ml-8'}`}>
                      <div className="text-[#8CC63F] font-bold text-xl mb-2">{milestone.year}</div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{milestone.event}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{milestone.detail}</p>
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-[#8CC63F] rounded-full border-4 border-white dark:border-gray-900 z-10"></div>
                  <div className="flex-1"></div>
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

// Export default for both pages
export default { EnhancedContactPage, EnhancedAboutPage };