import React, { lazy, Suspense, useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Users, BarChart3, MessageSquare, ChevronRight, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Navigation } from '../../components/shared/Navigation';
import { supabase } from '../../lib/supabase';
import { setAuthenticatedUser, type User, type UserRole } from '../../lib/auth';
// Remove bcrypt from top-level import - will import dynamically

// Lazy load heavy components
const TestimonialsSection = lazy(() => import('./components/TestimonialsSection'));
const Footer = lazy(() => import('./components/Footer'));

// Subject data moved to separate constant to enable future code splitting
const SUBJECT_CATEGORIES = [
  {
    title: "Sciences & Mathematics",
    subjects: [
      { title: "Mathematics", image: "/images/subjects/mathematics.webp", description: "Master algebra, geometry, statistics, and calculus" },
      { title: "Physics", image: "/images/subjects/physics.webp", description: "Explore mechanics, electricity, waves, and atomic physics" },
      { title: "Chemistry", image: "/images/subjects/chemistry.webp", description: "Study chemical reactions, organic chemistry, and analysis" },
      { title: "Biology", image: "/images/subjects/biology.webp", description: "Understand living organisms, ecology, and genetics" },
      { title: "Environmental Management", image: "/images/subjects/environmental.webp", description: "Sustainability and environmental science" },
      { title: "Agriculture", image: "/images/subjects/agriculture.webp", description: "Agricultural science and farming practices" }
    ]
  },
  {
    title: "Languages",
    subjects: [
      { title: "English Language", image: "/images/subjects/english-lang.webp", description: "Develop reading, writing, speaking, and listening skills" },
      { title: "English Literature", image: "/images/subjects/english-lit.webp", description: "Analyze poetry, prose, and drama from various periods" },
      { title: "French", image: "/images/subjects/french.webp", description: "Learn French language and francophone culture" },
      { title: "Spanish", image: "/images/subjects/spanish.webp", description: "Master Spanish communication and Hispanic culture" },
      { title: "Arabic", image: "/images/subjects/arabic.webp", description: "Master Arabic script and communication" },
      { title: "English as a Second Language", image: "/images/subjects/esl.webp", description: "English proficiency for non-native speakers" }
    ]
  },
  // Additional categories...
];

// Memoized SubjectCard for better performance
const SubjectCard = memo(({ 
  title, 
  image, 
  description, 
  priority = false 
}: { 
  title: string; 
  image: string; 
  description: string; 
  priority?: boolean;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    // Use Intersection Observer for lazy loading
    if ('IntersectionObserver' in window && !priority) {
      const imageLoader = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setImageSrc(image);
            imageLoader.disconnect();
          }
        });
      }, { rootMargin: '50px' });

      const element = document.getElementById(`subject-${title}`);
      if (element) imageLoader.observe(element);

      return () => imageLoader.disconnect();
    } else {
      setImageSrc(image);
    }
  }, [image, title, priority]);

  return (
    <div 
      id={`subject-${title}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200"
    >
      <div className="h-48 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transform hover:scale-105 transition-transform duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <div className="w-full h-full animate-pulse bg-gray-300 dark:bg-gray-600" />
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
});

SubjectCard.displayName = 'SubjectCard';

// Lazy loaded subject section
const SubjectSection = ({ category, index }: { category: any; index: number }) => {
  const [isVisible, setIsVisible] = useState(index === 0); // First section always visible

  useEffect(() => {
    if (index === 0) return; // Skip first section

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    const element = document.getElementById(`section-${index}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [index]);

  return (
    <div id={`section-${index}`} className="mb-12 min-h-[400px]">
      {isVisible ? (
        <>
          <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            {category.title}
          </h3>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {category.subjects.map((subject: any, idx: number) => (
              <SubjectCard 
                key={subject.title} 
                {...subject} 
                priority={index === 0 && idx < 3} // Priority load first 3 cards
              />
            ))}
          </div>
        </>
      ) : (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Memoized Feature Card
const FeatureCard = memo(({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string 
}) => (
  <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200">
    <div className="h-16 w-16 bg-[#8CC63F] bg-opacity-10 dark:bg-opacity-20 text-[#8CC63F] rounded-2xl flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400">{description}</p>
  </div>
));

FeatureCard.displayName = 'FeatureCard';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Dynamically import bcrypt only when needed
      const bcrypt = process.env.NODE_ENV === 'development' 
        ? await import('bcryptjs/dist/bcrypt.min')
        : null;

      if (!bcrypt) {
        throw new Error('Dev login only available in development mode');
      }

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

        // Create user
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
          .select(`id, email, user_type, raw_user_meta_data`)
          .single();

        if (userInsertError) throw userInsertError;

        // Create admin entry
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

        const authenticatedUser: User = {
          id: newUser.id,
          name: 'Baker R.',
          email: newUser.email,
          role: 'SSA'
        };

        setAuthenticatedUser(authenticatedUser);
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

        const authenticatedUser: User = {
          id: user.id,
          name: user.raw_user_meta_data?.name || 'Baker R.',
          email: user.email,
          role: userRole
        };

        setAuthenticatedUser(authenticatedUser);
      }

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

      {/* Hero Section - Priority Load */}
      <div className="relative h-screen">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="/images/hero-bg.webp" // Use optimized local image
            alt="IGCSE Teacher with Students"
            className="w-full h-full object-cover"
            loading="eager" // Priority load hero image
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

      {/* Popular Subjects with Lazy Loading */}
      <div className="py-24 bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#8CC63F] mb-4">IGCSE Subjects We Offer</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Comprehensive coverage of all IGCSE subjects</p>
          </div>
          
          {SUBJECT_CATEGORIES.map((category, index) => (
            <SubjectSection key={category.title} category={category} index={index} />
          ))}
        </div>
      </div>

      {/* Lazy load testimonials and footer */}
      <Suspense fallback={
        <div className="py-24 bg-white dark:bg-gray-900 animate-pulse">
          <div className="max-w-7xl mx-auto px-4">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      }>
        <TestimonialsSection />
      </Suspense>

      <Suspense fallback={
        <div className="bg-gray-900 dark:bg-gray-950 h-64 animate-pulse"></div>
      }>
        <Footer />
      </Suspense>
    </div>
  );
}