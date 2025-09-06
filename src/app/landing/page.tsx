import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Users, BarChart3, MessageSquare, ChevronRight, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Navigation } from '../../components/shared/Navigation';
import { supabase } from '../../lib/supabase';
import { setAuthenticatedUser, type User, type UserRole } from '../../lib/auth';

// Complete subject data - ALL 30 SUBJECTS PRESERVED
const SUBJECT_CATEGORIES = [
  {
    title: "Sciences & Mathematics",
    subjects: [
      { 
        title: "Mathematics", 
        image: "https://images.pexels.com/photos/6238050/pexels-photo-6238050.jpeg", 
        description: "Master algebra, geometry, statistics, and calculus" 
      },
      { 
        title: "Physics", 
        image: "https://images.pexels.com/photos/714699/pexels-photo-714699.jpeg", 
        description: "Explore mechanics, electricity, waves, and atomic physics" 
      },
      { 
        title: "Chemistry", 
        image: "https://images.pexels.com/photos/8326738/pexels-photo-8326738.jpeg", 
        description: "Study chemical reactions, organic chemistry, and analysis" 
      },
      { 
        title: "Biology", 
        image: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg", 
        description: "Understand living organisms, ecology, and genetics" 
      },
      { 
        title: "Environmental Management", 
        image: "https://images.pexels.com/photos/2990650/pexels-photo-2990650.jpeg", 
        description: "Sustainability and environmental science" 
      },
      { 
        title: "Agriculture", 
        image: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg", 
        description: "Agricultural science and farming practices" 
      }
    ]
  },
  {
    title: "Languages",
    subjects: [
      { 
        title: "English Language", 
        image: "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg", 
        description: "Develop reading, writing, speaking, and listening skills" 
      },
      { 
        title: "English Literature", 
        image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg", 
        description: "Analyze poetry, prose, and drama from various periods" 
      },
      { 
        title: "French", 
        image: "https://images.pexels.com/photos/1850619/pexels-photo-1850619.jpeg", 
        description: "Learn French language and francophone culture" 
      },
      { 
        title: "Spanish", 
        image: "https://images.pexels.com/photos/4491461/pexels-photo-4491461.jpeg", 
        description: "Master Spanish communication and Hispanic culture" 
      },
      { 
        title: "Arabic", 
        image: "https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg", 
        description: "Master Arabic script and communication" 
      },
      { 
        title: "English as a Second Language", 
        image: "https://images.pexels.com/photos/4145153/pexels-photo-4145153.jpeg", 
        description: "English proficiency for non-native speakers" 
      }
    ]
  },
  {
    title: "Humanities & Social Sciences",
    subjects: [
      { 
        title: "History", 
        image: "https://images.pexels.com/photos/5063451/pexels-photo-5063451.jpeg", 
        description: "Study world history from ancient to modern times" 
      },
      { 
        title: "Geography", 
        image: "https://images.pexels.com/photos/7412095/pexels-photo-7412095.jpeg", 
        description: "Explore physical and human geography" 
      },
      { 
        title: "Economics", 
        image: "https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg", 
        description: "Understand micro and macroeconomic principles" 
      },
      { 
        title: "Business Studies", 
        image: "https://images.pexels.com/photos/7413915/pexels-photo-7413915.jpeg", 
        description: "Learn business concepts and entrepreneurship" 
      },
      { 
        title: "Sociology", 
        image: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg", 
        description: "Study society, culture, and human behavior" 
      },
      { 
        title: "Psychology", 
        image: "https://images.pexels.com/photos/3825527/pexels-photo-3825527.jpeg", 
        description: "Explore human mind and behavior" 
      }
    ]
  },
  {
    title: "Technology & Business",
    subjects: [
      { 
        title: "Computer Science", 
        image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg", 
        description: "Programming, algorithms, and computational thinking" 
      },
      { 
        title: "Information Technology", 
        image: "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg", 
        description: "Digital literacy and practical IT skills" 
      },
      { 
        title: "Design & Technology", 
        image: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg", 
        description: "Product design and manufacturing processes" 
      },
      { 
        title: "Digital Media", 
        image: "https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg", 
        description: "Create and edit digital content" 
      },
      { 
        title: "Accounting", 
        image: "https://images.pexels.com/photos/6863332/pexels-photo-6863332.jpeg", 
        description: "Financial accounting and bookkeeping" 
      },
      { 
        title: "Enterprise", 
        image: "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg", 
        description: "Develop entrepreneurial skills and business innovation" 
      }
    ]
  },
  {
    title: "Creative Arts & Physical Education",
    subjects: [
      { 
        title: "Art & Design", 
        image: "https://images.pexels.com/photos/1646953/pexels-photo-1646953.jpeg", 
        description: "Develop artistic skills and creative expression" 
      },
      { 
        title: "Music", 
        image: "https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg", 
        description: "Music theory, performance, and composition" 
      },
      { 
        title: "Drama", 
        image: "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg", 
        description: "Theatre studies and performance arts" 
      },
      { 
        title: "Photography", 
        image: "https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg", 
        description: "Digital photography and image composition" 
      },
      { 
        title: "Physical Education", 
        image: "https://images.pexels.com/photos/3764011/pexels-photo-3764011.jpeg", 
        description: "Sports science and physical fitness" 
      },
      { 
        title: "Food & Nutrition", 
        image: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg", 
        description: "Nutritional science and food preparation" 
      }
    ]
  }
];

// Optimized SubjectCard with lazy loading
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
  const [isVisible, setIsVisible] = useState(priority);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    const element = document.getElementById(`subject-card-${title.replace(/\s+/g, '-')}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [title, priority]);

  return (
    <div 
      id={`subject-card-${title.replace(/\s+/g, '-')}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200"
    >
      <div className="h-48 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        {isVisible ? (
          <img
            src={image}
            alt={title}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transform hover:scale-105 transition-all duration-300 ${
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

// Optimized FeatureCard
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

// TestimonialCard component - PRESERVED FROM ORIGINAL
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

// Subject Section with lazy loading
const SubjectSection = ({ category, index }: { category: any; index: number }) => {
  const [isVisible, setIsVisible] = useState(index === 0);

  useEffect(() => {
    if (index === 0) return;

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
    <div id={`section-${index}`} className="mb-12">
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
                priority={index === 0 && idx < 3}
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

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Dynamically import bcrypt only in development
      const bcryptModule = process.env.NODE_ENV === 'development' 
        ? await import('bcryptjs/dist/bcrypt.min')
        : null;

      if (!bcryptModule) {
        throw new Error('Dev login only available in development mode');
      }

      const bcrypt = bcryptModule.default || bcryptModule;

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
            loading="eager"
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

      {/* Popular Subjects - ENHANCED VERSION WITH LAZY LOADING */}
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

      {/* Testimonials - COMPLETE FROM ORIGINAL */}
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

      {/* Footer - COMPLETE FROM ORIGINAL */}
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