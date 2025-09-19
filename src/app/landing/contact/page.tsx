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
  CheckCircle
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Textarea } from '../../../components/shared/FormField';
import { Navigation } from '../../../components/shared/Navigation';
import { toast } from '../../../components/shared/Toast';

const contactInfo = [
  {
    icon: Mail,
    title: 'Email Us',
    details: ['info@ggklearning.com', 'support@ggklearning.com'],
    description: 'Get in touch via email for general inquiries or support'
  },
  {
    icon: Phone,
    title: 'Call Us',
    details: ['+965 2XXX XXXX', '+965 9XXX XXXX'],
    description: 'Speak directly with our team during business hours'
  },
  {
    icon: MapPin,
    title: 'Visit Us',
    details: ['Kuwait City, Kuwait', 'Middle East Region'],
    description: 'Our headquarters in the heart of Kuwait'
  },
  {
    icon: Clock,
    title: 'Business Hours',
    details: ['Sunday - Thursday: 8:00 AM - 6:00 PM', 'Friday - Saturday: Closed'],
    description: 'We\'re here to help during these hours'
  }
];

const departments = [
  {
    name: 'General Inquiries',
    email: 'info@ggklearning.com',
    description: 'Questions about our platform and services'
  },
  {
    name: 'Technical Support',
    email: 'support@ggklearning.com',
    description: 'Help with technical issues and platform usage'
  },
  {
    name: 'Sales & Partnerships',
    email: 'sales@ggklearning.com',
    description: 'Licensing, partnerships, and business inquiries'
  },
  {
    name: 'Academic Support',
    email: 'academic@ggklearning.com',
    description: 'Curriculum questions and educational guidance'
  }
];

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    department: '',
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
      toast.success('Message sent successfully! We\'ll get back to you soon.');
      setFormData({
        name: '',
        email: '',
        subject: '',
        department: '',
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

        {/* Content */}
        <div className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center mb-6">
                <MessageSquare className="h-16 w-16 text-[#8CC63F]" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Contact Us
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                We're here to help! Reach out to us for any questions, support, or partnership opportunities
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Information */}
              <div className="space-y-8">
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    Get in Touch
                  </h2>
                  
                  <div className="space-y-6">
                    {contactInfo.map((info, index) => {
                      const IconComponent = info.icon;
                      return (
                        <div key={index} className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#8CC63F]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <IconComponent className="h-6 w-6 text-[#8CC63F]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-1">
                              {info.title}
                            </h3>
                            <div className="space-y-1 mb-2">
                              {info.details.map((detail, detailIndex) => (
                                <p key={detailIndex} className="text-gray-300">
                                  {detail}
                                </p>
                              ))}
                            </div>
                            <p className="text-sm text-gray-400">
                              {info.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Departments */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    Departments
                  </h2>
                  
                  <div className="space-y-4">
                    {departments.map((dept, index) => (
                      <div key={index} className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {dept.name}
                        </h3>
                        <p className="text-[#8CC63F] text-sm mb-2">
                          {dept.email}
                        </p>
                        <p className="text-gray-300 text-sm">
                          {dept.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Send us a Message
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormField
                    id="name"
                    label="Full Name"
                    required
                    labelClassName="text-gray-200"
                  >
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                      leftIcon={<User className="h-5 w-5 text-gray-400" />}
                    />
                  </FormField>

                  <FormField
                    id="email"
                    label="Email Address"
                    required
                    labelClassName="text-gray-200"
                  >
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email address"
                      className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                      leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                    />
                  </FormField>

                  <FormField
                    id="department"
                    label="Department"
                    labelClassName="text-gray-200"
                  >
                    <select
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F] rounded-md"
                    >
                      <option value="">Select a department</option>
                      {departments.map((dept, index) => (
                        <option key={index} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    id="subject"
                    label="Subject"
                    labelClassName="text-gray-200"
                  >
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Brief subject of your message"
                      className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                    />
                  </FormField>

                  <FormField
                    id="message"
                    label="Message"
                    required
                    labelClassName="text-gray-200"
                  >
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Tell us how we can help you..."
                      rows={6}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                    />
                  </FormField>

                  <Button
                    type="submit"
                    className="w-full bg-[#8CC63F] hover:bg-[#7AB635] text-white py-3"
                    disabled={isSubmitting}
                    rightIcon={isSubmitting ? null : <Send className="h-5 w-5" />}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Sending Message...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg">
                  <div className="flex items-center gap-2 text-[#8CC63F] mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Quick Response Guarantee</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    We typically respond to all inquiries within 24 hours during business days.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-16 text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Ready to Transform Education?
                </h2>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  Join educational institutions worldwide that trust GGK Learning to deliver exceptional learning experiences
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => navigate('/signin')}
                    className="bg-[#8CC63F] hover:bg-[#7AB635] text-white px-8 py-3"
                    rightIcon={<ArrowRight className="h-5 w-5" />}
                  >
                    Get Started
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/about')}
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 px-8 py-3"
                  >
                    Learn About Us
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}