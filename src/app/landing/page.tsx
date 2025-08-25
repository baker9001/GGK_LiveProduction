///home/project/src/app/landing/page.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Users, BarChart3, MessageSquare, ChevronRight, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Navigation } from '../../components/shared/Navigation';
import { supabase } from '../../lib/supabase';
import { setAuthenticatedUser, type User, type UserRole } from '../../lib/auth';
import bcrypt from 'bcryptjs';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if dev user exists in users table
      const { data: user, error: queryError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          password_hash,
          user_type,
          is_active,
          raw_user_meta_data
        `)
        .eq('email', 'bakir.alramadi@gmail.com')
        .eq('user_type', 'system')
        .maybeSingle();

      if (queryError) {
        throw new Error('Failed to check dev user');
      }

      if (!user) {
        // Check if admin user already exists
        const { data: existingAdminUser, error: adminQueryError } = await supabase
          .from('admin_users')
          .select('id, name, email, roles!inner(name)')
          .eq('email', 'bakir.alramadi@gmail.com')
          .maybeSingle();

        if (adminQueryError) {
          throw new Error('Failed to check admin user');
        }

        if (existingAdminUser) {
          // Admin user exists, use it
          const roleMapping: Record<string, UserRole> = {
            'Super Admin': 'SSA',
            'Support Admin': 'SUPPORT',
            'Viewer': 'VIEWER'
          };

          const userRole = roleMapping[existingAdminUser.roles?.name] || 'SSA';

          const authenticatedUser: User = {
            id: existingAdminUser.id,
            name: existingAdminUser.name || 'Baker R.',
            email: existingAdminUser.email,
            role: userRole
          };

          setAuthenticatedUser(authenticatedUser);
        } else {
          // Create dev user if it doesn't exist
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash('dev_password', salt);

          // Get SSA role ID
          const { data: ssaRole, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'Super Admin')
            .single();

          if (roleError || !ssaRole) {
            throw new Error('Super Admin role not found');
          }

          // First create user in users table
          const { data: newUser, error: userInsertError } = await supabase
            .from('users')
            .insert([{
              email: 'bakir.alramadi@gmail.com',
              password_hash: hashedPassword,
              user_type: 'system',
              is_active: true,
              email_verified: true,
              raw_user_meta_data: { name: 'Baker R.' }
            }])
            .select(`
              id,
              email,
              user_type,
              raw_user_meta_data
            `)
            .single();

          if (userInsertError) throw userInsertError;

          // Then create admin_users entry
          const { error: adminInsertError } = await supabase
            .from('admin_users')
            .insert([{
              id: newUser.id,
              name: 'Baker R.',
              email: 'bakir.alramadi@gmail.com',
              role_id: ssaRole.id,
              status: 'active'
            }]);

          if (adminInsertError) throw adminInsertError;

          // Create user object for new user
          const authenticatedUser: User = {
            id: newUser.id,
            name: newUser.raw_user_meta_data?.name || 'Baker R.',
            email: newUser.email,
            role: 'SSA'
          };

          setAuthenticatedUser(authenticatedUser);
        }
      } else {
        // Get admin user details for existing user
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('roles!inner(name)')
          .eq('id', user.id)
          .single();

        const roleMapping: Record<string, UserRole> = {
          'Super Admin': 'SSA',
          'Support Admin': 'SUPPORT',
          'Viewer': 'VIEWER'
        };

        const userRole = roleMapping[adminUser?.roles?.name] || 'SSA';

        // Create user object for existing user
        const authenticatedUser: User = {
          id: user.id,
          name: user.raw_user_meta_data?.name || 'Baker R.',
          email: user.email,
          role: userRole
        };

        setAuthenticatedUser(authenticatedUser);
      }

      // Redirect to admin dashboard
      navigate('/app/system-admin/dashboard', { replace: true });
    } catch (err) {
      console.error('Dev login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <Navigation />

      {/* Hero Section with Image Background */}
      <div className="relative h-screen">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg"
            alt="IGCSE Teacher with Students"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-60" />
        </div>
        <div className="relative max-w-7xl mx-auto h-full flex items-center px-4 sm:px-6 lg:px-8">
          <div className="text-center w-full">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6">
              Your One-Stop
              <span className="block text-[#8CC63F]">IGCSE Learning Platform</span>
            </h1>
            <p className="mt-3 max-w-lg mx-auto text-xl text-gray-100 sm:mt-5">
              Interactive lessons, structured topics, performance tracking, and real-time exams.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-[#8CC63F] hover:bg-[#7AB32F] text-gray-700 rounded-full px-8 w-full sm:w-auto"
                onClick={() => navigate('/signin')}
                rightIcon={<ChevronRight className="ml-2 -mr-1 h-5 w-5" />}
              >
                Get Started
              </Button>
              <Button
                size="lg"
                className="bg-[#8CC63F] hover:bg-[#7AB32F] text-gray-700 rounded-full px-8 w-full sm:w-auto"
                leftIcon={<PlayCircle className="mr-2 h-5 w-5" />}
              >
                Watch Demo
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-white/20 w-full sm:w-auto"
                  onClick={handleDevLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    '🔧 Dev Login (Baker R.)'
                  )}
                </Button>
              )}
            </div>
            {error && (
              <div className="mt-4 flex items-center justify-center text-red-400 bg-red-900/50 backdrop-blur-sm rounded-lg p-2">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}
            {process.env.NODE_ENV === 'development' && (
              <p className="mt-4 text-sm text-yellow-300 bg-yellow-900/50 backdrop-blur-sm rounded-lg p-2 inline-block">
                ⚠️ Dev Login — for development use only. Will be removed before production.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="py-24 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#8CC63F] mb-4">Why Choose GGK?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Everything you need to excel in your IGCSE journey</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Book className="h-8 w-8" />}
              title="Self-paced Learning"
              description="Learn at your own pace with structured content and interactive materials"
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Personalized Exams"
              description="Practice with custom exams tailored to your learning progress"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Progress Tracking"
              description="Monitor your improvement with detailed performance analytics"
            />
            <FeatureCard
              icon={<MessageSquare className="h-8 w-8" />}
              title="Teacher Feedback"
              description="Get personalized feedback and guidance from experienced teachers"
            />
          </div>
        </div>
      </div>

      {/* Popular Subjects */}
      <div className="py-24 bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#8CC63F] mb-4">Popular IGCSE Subjects</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Comprehensive coverage of core subjects</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <SubjectCard
              title="Mathematics"
              image="https://images.pexels.com/photos/3768126/pexels-photo-3768126.jpeg"
              description="Master key concepts in algebra, geometry, and calculus"
            />
            <SubjectCard
              title="Biology"
              image="https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg"
              description="Explore life sciences with interactive experiments"
            />
            <SubjectCard
              title="Physics"
              image="https://images.pexels.com/photos/60582/pexels-photo-60582.jpeg"
              description="Understand fundamental laws of the universe"
            />
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-24 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#8CC63F] mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Join thousands of satisfied students and teachers</p>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <TestimonialCard
              quote="GGK has transformed how I prepare for my IGCSE exams. The structured approach and practice tests have boosted my confidence significantly."
              author="Sarah Chen"
              role="IGCSE Student"
            />
            <TestimonialCard
              quote="As a teacher, I appreciate how easy it is to track my students' progress and identify areas where they need additional support."
              author="David Thompson"
              role="Biology Teacher"
            />
            <TestimonialCard
              quote="The interactive learning materials and instant feedback have made studying more engaging and effective for me."
              author="Mohammed Al-Rahman"
              role="IGCSE Student"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white transition-colors duration-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center">
                <span className="text-xl font-bold text-[#8CC63F]">GGK</span>
              </div>
              <p className="mt-4 text-sm text-gray-300 dark:text-gray-400">
                Empowering IGCSE students and teachers with comprehensive learning tools.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 dark:text-gray-400 tracking-wider uppercase">Legal</h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <a href="#" className="text-base text-gray-300 dark:text-gray-400 hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-base text-gray-300 dark:text-gray-400 hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 dark:text-gray-400 tracking-wider uppercase">Support</h3>
              <ul className="mt-4 space-y-4">
                <li>
                  <a href="#" className="text-base text-gray-300 dark:text-gray-400 hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-base text-gray-300 dark:text-gray-400 hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8">
            <p className="text-base text-gray-300 dark:text-gray-400 text-center">
              © 2025 Go Green Knowledge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SubjectCard({ title, image, description }: { title: string; image: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200">
      <div className="h-48 w-full overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-200"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200">
      <div className="h-16 w-16 bg-[#8CC63F] bg-opacity-10 dark:bg-opacity-20 text-[#8CC63F] rounded-2xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors duration-200">
      <p className="text-gray-600 dark:text-gray-400 italic mb-6">{quote}</p>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white">{author}</p>
        <p className="text-sm text-[#8CC63F]">{role}</p>
      </div>
    </div>
  );
}