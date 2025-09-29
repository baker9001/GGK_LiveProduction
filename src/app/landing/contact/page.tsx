// ======================================
// CONTACT PAGE - /src/app/landing/contact/page.tsx
// Complete IGCSE/Cambridge/Edexcel focused Contact page
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

// NOTE: Copy updates require marketing and legal review prior to publication.

const contactInfo = [
  {
    icon: Mail,
    title: 'Email Support',
    details: ['support@ggklearning.com'],
    description: 'Monitored Sunday to Thursday with next-business-day responses'
  },
  {
    icon: Phone,
    title: 'Phone & WhatsApp',
    details: ['+965 9722 2711'],
    description: 'Available 9:00 AM – 7:00 PM (AST); voicemail after hours'
  },
  {
    icon: MapPin,
    title: 'Service Regions',
    details: [
      'Kuwait City, Kuwait (Headquarters)',
      'Remote support for GCC schools'
    ],
    description: 'Virtual consultations scheduled upon request'
  },
  {
    icon: Clock,
    title: 'Support Hours',
    details: [
      'Sunday - Thursday: 9:00 AM - 7:00 PM',
      'Friday & Saturday: By appointment during exam seasons'
    ],
    description: 'Response windows extend during peak assessment periods'
  }
];

const departments = [
  {
    name: 'Learner Support',
    email: 'support@ggklearning.com',
    description: 'Cambridge & Edexcel syllabus questions, study planning, revision pathways',
    responseTime: 'Within 1 business day'
  },
  {
    name: 'Technical Assistance',
    email: 'support@ggklearning.com',
    description: 'Platform access, video playback, or resource download issues',
    responseTime: 'Same day during service hours'
  },
  {
    name: 'School Partnerships',
    email: 'partnerships@ggklearning.com',
    description: 'Institutional subscriptions, onboarding workshops, co-branded resources',
    responseTime: '2 business days'
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

export default function ContactPage() {
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
      toast.success('Message sent! We\'ll respond during our posted service hours.');
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
              <div className="flex items-center justify-center gap-8 mt-8 text-white text-sm">
                <div className="max-w-[140px]">
                  <div className="font-semibold">Exam window coverage</div>
                  <div className="opacity-90">On-call support during key assessment weeks</div>
                </div>
                <div className="max-w-[140px]">
                  <div className="font-semibold">Timely replies</div>
                  <div className="opacity-90">Messages triaged within posted service hours</div>
                </div>
                <div className="max-w-[140px]">
                  <div className="font-semibold">Feedback loop</div>
                  <div className="opacity-90">Monthly reviews with parents & teachers</div>
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
                  Fill out the form below and our IGCSE specialists will get back to you during the service windows listed
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
                      We respond during the service hours noted above
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

    <div className="px-4 sm:px-6 lg:px-8 pb-12 max-w-5xl mx-auto text-xs text-gray-500 dark:text-gray-400 space-y-1">
      <p>
        Our support commitments are aligned with <a href="https://www.cambridgeinternational.org/support-and-training-for-schools/" className="underline" target="_blank" rel="noopener noreferrer">Cambridge International</a> and <a href="https://qualifications.pearson.com/en/support.html" className="underline" target="_blank" rel="noopener noreferrer">Pearson Edexcel</a> service period updates so families can plan ahead.
      </p>
      <p>
        Testimonials referenced in enquiries are verified and stored securely for partner and legal review upon request.
      </p>
    </div>
  );
}
