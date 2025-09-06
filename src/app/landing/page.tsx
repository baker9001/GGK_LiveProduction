import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Users, BarChart3, MessageSquare, ChevronRight, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Navigation } from '../../components/shared/Navigation';
import { supabase } from '../../lib/supabase';
import { setAuthenticatedUser, type User, type UserRole } from '../../lib/auth';

// ========================================
// IMAGE CACHE MANAGER - Keeps images in memory
// ========================================
class ImageCacheManager {
  private cache: Map<string, string> = new Map();
  private preloadQueue: Set<string> = new Set();
  private loading: Set<string> = new Set();

  // Preload an image and store in cache
  async preloadImage(src: string): Promise<string> {
    // If already cached, return immediately
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    // If already loading, wait for it
    if (this.loading.has(src)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.cache.has(src)) {
            clearInterval(checkInterval);
            resolve(this.cache.get(src)!);
          }
        }, 50);
      });
    }

    // Start loading
    this.loading.add(src);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, src);
        this.loading.delete(src);
        resolve(src);
      };
      img.onerror = () => {
        this.loading.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }

  // Preload multiple images
  async preloadImages(srcs: string[]): Promise<void> {
    await Promise.allSettled(srcs.map(src => this.preloadImage(src)));
  }

  // Check if image is cached
  isCached(src: string): boolean {
    return this.cache.has(src);
  }

  // Get cached image or null
  getCached(src: string): string | null {
    return this.cache.get(src) || null;
  }
}

// Create singleton instance
const imageCache = new ImageCacheManager();

// ========================================
// BLURHASH PLACEHOLDERS - Better loading experience
// ========================================
const PLACEHOLDER_SHIMMER = `data:image/svg+xml;base64,${btoa(`
  <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g">
        <stop stop-color="#e5e7eb" offset="20%" />
        <stop stop-color="#f3f4f6" offset="50%" />
        <stop stop-color="#e5e7eb" offset="70%" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="#f3f4f6" />
    <rect id="r" width="400" height="300" fill="url(#g)">
      <animate attributeName="x" from="-400" to="400" dur="1s" repeatCount="indefinite" />
    </rect>
  </svg>
`)}`;

// Complete subject data with blur placeholders
const SUBJECT_CATEGORIES = [
  {
    title: "Sciences & Mathematics",
    subjects: [
      { 
        title: "Mathematics", 
        image: "https://images.pexels.com/photos/6238050/pexels-photo-6238050.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Master algebra, geometry, statistics, and calculus" 
      },
      { 
        title: "Physics", 
        image: "https://images.pexels.com/photos/714699/pexels-photo-714699.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Explore mechanics, electricity, waves, and atomic physics" 
      },
      { 
        title: "Chemistry", 
        image: "https://images.pexels.com/photos/8326738/pexels-photo-8326738.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Study chemical reactions, organic chemistry, and analysis" 
      },
      { 
        title: "Biology", 
        image: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Understand living organisms, ecology, and genetics" 
      },
      { 
        title: "Environmental Management", 
        image: "https://images.pexels.com/photos/2990650/pexels-photo-2990650.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Sustainability and environmental science" 
      },
      { 
        title: "Agriculture", 
        image: "https://images.pexels.com/photos/2132250/pexels-photo-2132250.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
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
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Develop reading, writing, speaking, and listening skills" 
      },
      { 
        title: "English Literature", 
        image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Analyze poetry, prose, and drama from various periods" 
      },
      { 
        title: "French", 
        image: "https://images.pexels.com/photos/1850619/pexels-photo-1850619.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Learn French language and francophone culture" 
      },
      { 
        title: "Spanish", 
        image: "https://images.pexels.com/photos/4491461/pexels-photo-4491461.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Master Spanish communication and Hispanic culture" 
      },
      { 
        title: "Arabic", 
        image: "https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Master Arabic script and communication" 
      },
      { 
        title: "English as a Second Language", 
        image: "https://images.pexels.com/photos/4145153/pexels-photo-4145153.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
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
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Study world history from ancient to modern times" 
      },
      { 
        title: "Geography", 
        image: "https://images.pexels.com/photos/7412095/pexels-photo-7412095.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Explore physical and human geography" 
      },
      { 
        title: "Economics", 
        image: "https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Understand micro and macroeconomic principles" 
      },
      { 
        title: "Business Studies", 
        image: "https://images.pexels.com/photos/7413915/pexels-photo-7413915.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Learn business concepts and entrepreneurship" 
      },
      { 
        title: "Sociology", 
        image: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Study society, culture, and human behavior" 
      },
      { 
        title: "Psychology", 
        image: "https://images.pexels.com/photos/3825527/pexels-photo-3825527.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
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
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Programming, algorithms, and computational thinking" 
      },
      { 
        title: "Information Technology", 
        image: "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Digital literacy and practical IT skills" 
      },
      { 
        title: "Design & Technology", 
        image: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Product design and manufacturing processes" 
      },
      { 
        title: "Digital Media", 
        image: "https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Create and edit digital content" 
      },
      { 
        title: "Accounting", 
        image: "https://images.pexels.com/photos/6863332/pexels-photo-6863332.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Financial accounting and bookkeeping" 
      },
      { 
        title: "Enterprise", 
        image: "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
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
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Develop artistic skills and creative expression" 
      },
      { 
        title: "Music", 
        image: "https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Music theory, performance, and composition" 
      },
      { 
        title: "Drama", 
        image: "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Theatre studies and performance arts" 
      },
      { 
        title: "Photography", 
        image: "https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Digital photography and image composition" 
      },
      { 
        title: "Physical Education", 
        image: "https://images.pexels.com/photos/3764011/pexels-photo-3764011.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Sports science and physical fitness" 
      },
      { 
        title: "Food & Nutrition", 
        image: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Nutritional science and food preparation" 
      }
    ]
  }
];

// ========================================
// OPTIMIZED SUBJECT CARD WITH CACHING
// ========================================
const SubjectCard = memo(({ 
  title, 
  image, 
  placeholder,
  description, 
  priority = false 
}: { 
  title: string; 
  image: string; 
  placeholder?: string;
  description: string; 
  priority?: boolean;
}) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(placeholder || PLACEHOLDER_SHIMMER);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Check if image is already cached
        if (imageCache.isCached(image)) {
          setCurrentSrc(image);
          setImageStatus('loaded');
          return;
        }

        // For priority images, load immediately
        if (priority) {
          await imageCache.preloadImage(image);
          setCurrentSrc(image);
          setImageStatus('loaded');
          return;
        }

        // For non-priority, use intersection observer
        observerRef.current = new IntersectionObserver(
          async ([entry]) => {
            if (entry.isIntersecting) {
              try {
                await imageCache.preloadImage(image);
                setCurrentSrc(image);
                setImageStatus('loaded');
              } catch (error) {
                setImageStatus('error');
              }
              observerRef.current?.disconnect();
            }
          },
          { 
            rootMargin: '100px', // Start loading 100px before visible
            threshold: 0.01 
          }
        );

        const element = document.getElementById(`subject-${title.replace(/\s+/g, '-')}`);
        if (element) {
          observerRef.current.observe(element);
        }
      } catch (error) {
        console.error('Error loading image:', error);
        setImageStatus('error');
      }
    };

    loadImage();

    return () => {
      observerRef.current?.disconnect();
    };
  }, [image, title, priority, placeholder]);

  return (
    <div 
      id={`subject-${title.replace(/\s+/g, '-')}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200 will-change-transform"
    >
      <div className="h-48 w-full overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
        {imageStatus === 'error' ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
            <span className="text-gray-500 dark:text-gray-400">Failed to load image</span>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={currentSrc}
            alt={title}
            className={`w-full h-full object-cover transform hover:scale-105 transition-all duration-300 ${
              imageStatus === 'loaded' ? 'opacity-100' : 'opacity-90'
            }`}
            loading="lazy"
            decoding="async"
          />
        )}
        {imageStatus === 'loading' && currentSrc === placeholder && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
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

// ========================================
// SUBJECT SECTION WITH PRELOADING
// ========================================
const SubjectSection = ({ category, index }: { category: any; index: number }) => {
  const [isVisible, setIsVisible] = useState(index === 0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // First section always visible and preload its images
    if (index === 0) {
      const images = category.subjects.map((s: any) => s.image);
      imageCache.preloadImages(images);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Preload next section's images
          if (index < SUBJECT_CATEGORIES.length - 1) {
            const nextImages = SUBJECT_CATEGORIES[index + 1].subjects.map(s => s.image);
            setTimeout(() => imageCache.preloadImages(nextImages), 500);
          }
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [index, category]);

  return (
    <div ref={sectionRef} id={`section-${index}`} className="mb-12">
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

// ========================================
// OPTIMIZED FEATURE CARD
// ========================================
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

// ========================================
// TESTIMONIAL CARD
// ========================================
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

// ========================================
// MAIN LANDING PAGE COMPONENT
// ========================================
export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload hero image and first 3 subject images on mount
  useEffect(() => {
    const preloadCriticalImages = async () => {
      const criticalImages = [
        "https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg", // Hero image
        ...SUBJECT_CATEGORIES[0].subjects.slice(0, 3).map(s => s.image) // First 3 subjects
      ];
      await imageCache.preloadImages(criticalImages);
    };
    preloadCriticalImages();
  }, []);

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const bcryptModule = process.env.NODE_ENV === 'development' 
        ? await import('bcryptjs/dist/bcrypt.min')
        : null;

      if (!bcryptModule) {
        throw new Error('Dev login only available in development mode');
      }

      const bcrypt = bcryptModule.default || bcryptModule;

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
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('dev_password', salt);

        const { data: ssaRole, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'Super Admin')
          .single();

        if (roleError || !ssaRole) {
          throw new Error('Super Admin role not found');
        }

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
          name: newUser.raw_user_meta_data?.name || 'Baker R.',
          email: newUser.email,
          role: 'SSA'
        };

        setAuthenticatedUser(authenticatedUser);
      } else {
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

      {/* Hero Section */}
      <div className="relative h-screen">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg"
            alt="IGCSE Teacher with Students"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
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

      {/* Popular Subjects with Enhanced Caching */}
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

      {/* Testimonials - Using imported component */}
      <TestimonialsSection />

      {/* Footer - Using imported component */}
      <Footer />
    </div>
  );
}

// Add shimmer animation to your global CSS
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer { animation: shimmer 1s ease-in-out infinite; }