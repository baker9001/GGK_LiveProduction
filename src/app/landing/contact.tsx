import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  MessageSquare, 
  HelpCircle,
  Building,
  Globe,
  ArrowRight,
  CheckCircle,
  User,
  MessageCircle
} from 'lucide-react';
import { Navigation } from '../../components/shared/Navigation';
import { Button } from '../../components/shared/Button';
import { FormField, Input, Select, Textarea } from '../../components/shared/FormField';
import { toast } from '../../components/shared/Toast';

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get help via email within 24 hours',
    contact: 'support@ggklearning.com',
    action: 'Send Email',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Phone,
    title: 'Phone Support',
    description: 'Speak with our support team directly',
    contact: '+1 (555) 123-4567',
    action: 'Call Now',
    color: 'from-green-500 to-green-600'
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Chat with us in real-time',
    contact: 'Available 9 AM - 6 PM EST',
    action: 'Start Chat',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: HelpCircle,
    title: 'Help Center',
    description: 'Browse our comprehensive FAQ',
    contact: 'Self-service support',
    action: 'Visit Help Center',
    color: 'from-orange-500 to-orange-600'
  }
];

const offices = [
  {
    city: 'New York',
    address: '123 Education Ave, Suite 500, New York, NY 10001',
    phone: '+1 (555) 123-4567',
    email: 'ny@ggklearning.com'
  },
  {
    city: 'London',
    address: '45 Learning Street, London EC1A 1BB, United Kingdom',
    phone: '+44 20 7123 4567',
    email: 'london@ggklearning.com'
  },
  {
    city: 'Kuwait City',
    address: 'Al-Salam Tower, Floor 15, Kuwait City, Kuwait',
    phone: '+965 2123 4567',
    email: 'kuwait@ggklearning.com'
  }
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiry_type: 'general'
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
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        inquiry_type: 'general'
      });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#8CC63F] to-[#7AB635] text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Get in Touch
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-green-100">
                We're here to help you succeed. Reach out to us anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                How Can We Help?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Choose the best way to reach us
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactMethods.map((method, index) => {
                const IconComponent = method.icon;
                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${method.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {method.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {method.description}
                    </p>
                    
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      {method.contact}
                    </div>
                    
                    <button className="text-[#8CC63F] font-medium text-sm hover:text-[#7AB635] transition-colors flex items-center">
                      {method.action}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  Send us a Message
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Full Name" required>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter your full name"
                        leftIcon={<User className="h-4 w-4" />}
                      />
                    </FormField>

                    <FormField label="Email Address" required>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                        leftIcon={<Mail className="h-4 w-4" />}
                      />
                    </FormField>
                  </div>

                  <FormField label="Inquiry Type">
                    <Select
                      value={formData.inquiry_type}
                      onChange={(e) => handleInputChange('inquiry_type', e.target.value)}
                    >
                      <option value="general">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="sales">Sales & Pricing</option>
                      <option value="partnership">Partnership</option>
                      <option value="feedback">Feedback</option>
                    </Select>
                  </FormField>

                  <FormField label="Subject">
                    <Input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Brief subject line"
                      leftIcon={<MessageCircle className="h-4 w-4" />}
                    />
                  </FormField>

                  <FormField label="Message" required>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Tell us how we can help you..."
                      rows={6}
                    />
                  </FormField>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Contact Information */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  Contact Information
                </h2>
                
                <div className="space-y-8">
                  {/* Business Hours */}
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Business Hours
                      </h3>
                      <div className="text-gray-600 dark:text-gray-400 space-y-1">
                        <p>Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                        <p>Saturday: 10:00 AM - 4:00 PM EST</p>
                        <p>Sunday: Closed</p>
                      </div>
                    </div>
                  </div>

                  {/* Global Offices */}
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#8CC63F] to-[#7AB635] rounded-lg flex items-center justify-center mr-4">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Global Offices
                      </h3>
                    </div>
                    
                    <div className="space-y-6 ml-16">
                      {offices.map((office, index) => (
                        <div key={index} className="border-l-2 border-[#8CC63F] pl-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {office.city}
                          </h4>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <p className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                              {office.address}
                            </p>
                            <p className="flex items-center">
                              <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                              {office.phone}
                            </p>
                            <p className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                              {office.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Quick answers to common questions
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  question: 'How do I get started with GGK Learning?',
                  answer: 'Simply sign up for an account, choose your subscription plan, and start exploring our comprehensive curriculum. Our onboarding process will guide you through setting up your profile and selecting appropriate courses.'
                },
                {
                  question: 'What subjects and grade levels do you cover?',
                  answer: 'We offer comprehensive coverage for K-12 education across all major subjects including Mathematics, Science, English Language Arts, Social Studies, and more. Our content is aligned with international educational standards.'
                },
                {
                  question: 'Can I try GGK Learning before purchasing?',
                  answer: 'Yes! We offer a 14-day free trial that gives you full access to our platform. No credit card required to start your trial.'
                },
                {
                  question: 'Do you offer support for teachers and schools?',
                  answer: 'Absolutely! We provide dedicated support for educators including training sessions, curriculum guides, and administrative tools for classroom management.'
                },
                {
                  question: 'Is GGK Learning available internationally?',
                  answer: 'Yes, GGK Learning is available globally. We currently serve students in over 25 countries and support multiple languages and regional curriculum standards.'
                }
              ].map((faq, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 text-[#8CC63F] mr-3 flex-shrink-0" />
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 ml-8">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}