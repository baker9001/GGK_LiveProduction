/**
 * GGK Learning Platform - Landing Page with Fixed Footer Sizing
 * Reduced padding and spacing to fit content
 */

import React, { useState, useEffect, memo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Book, Users, BarChart3, MessageSquare, ChevronRight, ChevronDown, ChevronUp, PlayCircle, 
  Star, Quote, GraduationCap, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube,
  Award, CheckCircle, FileText, Video, Clock, Globe, Zap, Target
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Navigation } from '../../components/shared/Navigation';

// Fallback image for subjects
const FALLBACK_IMAGE = "https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg?auto=compress&cs=tinysrgb&w=600";

// Alternative image sources (using Pexels for reliability)
const IMAGE_SOURCES = {
  mathematics: "https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg?auto=compress&cs=tinysrgb&w=600",
  physics: "https://images.pexels.com/photos/256381/pexels-photo-256381.jpeg?auto=compress&cs=tinysrgb&w=600",
  chemistry: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=600",
  biology: "https://images.pexels.com/photos/2280568/pexels-photo-2280568.jpeg?auto=compress&cs=tinysrgb&w=600",
  english: "https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg?auto=compress&cs=tinysrgb&w=600",
  computerScience: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=600",
  economics: "https://images.pexels.com/photos/210574/pexels-photo-210574.jpeg?auto=compress&cs=tinysrgb&w=600",
  business: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=600",
  history: "https://images.pexels.com/photos/256431/pexels-photo-256431.jpeg?auto=compress&cs=tinysrgb&w=600",
  geography: "https://images.pexels.com/photos/269633/pexels-photo-269633.jpeg?auto=compress&cs=tinysrgb&w=600",
  french: "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=600",
  spanish: "https://images.pexels.com/photos/256408/pexels-photo-256408.jpeg?auto=compress&cs=tinysrgb&w=600",
  arabic: "https://images.pexels.com/photos/256450/pexels-photo-256450.jpeg?auto=compress&cs=tinysrgb&w=600",
  environmental: "https://images.pexels.com/photos/886521/pexels-photo-886521.jpeg?auto=compress&cs=tinysrgb&w=600"
};

// Simplified Image Cache Manager
class ImageCacheManager {
  private cache: Map<string, string> = new Map();
  
  async preloadImage(src: string): Promise<string> {
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, src);
        resolve(src);
      };
      img.onerror = () => {
        // Return fallback on error
        resolve(FALLBACK_IMAGE);
      };
      img.src = src;
    });
  }

  isCached(src: string): boolean {
    return this.cache.has(src);
  }
}

const imageCache = new ImageCacheManager();

// ORIGINAL SUBJECTS DATA - ALL 15 SUBJECTS MAINTAINED
const ALL_SUBJECTS = [
  // Core IGCSE Subjects (Priority)
  { 
    title: "IGCSE Mathematics", 
    image: IMAGE_SOURCES.mathematics,
    fallbackImage: FALLBACK_IMAGE,
    description: "Complete Cambridge & Edexcel IGCSE syllabus 0580/0606/4MA1",
    badges: ["Past Papers", "Video Solutions", "Mock Exams"],
    priority: true
  },
  { 
    title: "IGCSE Physics", 
    image: IMAGE_SOURCES.physics,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0625 & Edexcel 4PH1 complete coverage",
    badges: ["Lab Simulations", "Animated Concepts", "Past Papers"],
    priority: true
  },
  { 
    title: "IGCSE Chemistry", 
    image: IMAGE_SOURCES.chemistry,
    fallbackImage: FALLBACK_IMAGE,
    description: "Master Cambridge 0620 & Edexcel 4CH1 syllabi",
    badges: ["Virtual Labs", "3D Molecules", "Exam Practice"],
    priority: true
  },
  { 
    title: "IGCSE Biology", 
    image: IMAGE_SOURCES.biology,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0610 & Edexcel 4BI1 comprehensive resources",
    badges: ["Interactive Diagrams", "Video Lessons", "Topic Tests"],
    priority: true
  },
  { 
    title: "IGCSE English Language", 
    image: IMAGE_SOURCES.english,
    fallbackImage: FALLBACK_IMAGE,
    description: "First & Second Language 0500/0510 exam preparation",
    badges: ["Writing Guides", "Speaking Practice", "Model Answers"],
    priority: true
  },
  { 
    title: "IGCSE Computer Science", 
    image: IMAGE_SOURCES.computerScience,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0478 & Edexcel programming & theory",
    badges: ["Coding Practice", "Algorithm Visualizations", "Projects"],
    priority: true
  },
  { 
    title: "IGCSE Economics", 
    image: IMAGE_SOURCES.economics,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0455 micro & macro economics mastery",
    badges: ["Case Studies", "Data Response", "Essay Writing"],
    priority: true
  },
  { 
    title: "IGCSE Business Studies", 
    image: IMAGE_SOURCES.business,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0450 & Edexcel business concepts",
    badges: ["Real Cases", "Financial Analysis", "Marketing Plans"],
    priority: true
  },
  { 
    title: "IGCSE History", 
    image: IMAGE_SOURCES.history,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0470 20th century world history",
    badges: ["Source Analysis", "Essay Templates", "Timeline Tools"],
    priority: true
  },
  { 
    title: "IGCSE Geography", 
    image: IMAGE_SOURCES.geography,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0460 physical & human geography",
    badges: ["Map Skills", "Case Studies", "Fieldwork Guides"],
    priority: true
  },
  { 
    title: "IGCSE French", 
    image: IMAGE_SOURCES.french,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0520 French language mastery",
    badges: ["Audio Practice", "Grammar Drills", "Speaking Tests"],
    priority: true
  },
  { 
    title: "IGCSE Spanish", 
    image: IMAGE_SOURCES.spanish,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0530 Spanish comprehensive course",
    badges: ["Interactive Lessons", "Vocabulary Games", "Exam Prep"],
    priority: true
  },
  { 
    title: "IGCSE Arabic", 
    image: IMAGE_SOURCES.arabic,
    fallbackImage: FALLBACK_IMAGE,
    description: "First & Foreign Language Arabic 0508/0544",
    badges: ["Native Speakers", "Grammar Mastery", "Writing Skills"],
    priority: true
  },
  { 
    title: "IGCSE Additional Mathematics", 
    image: IMAGE_SOURCES.mathematics,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0606 advanced mathematics preparation",
    badges: ["Calculus", "Vectors", "A-Level Bridge"],
    priority: true
  },
  { 
    title: "IGCSE Environmental Management", 
    image: IMAGE_SOURCES.environmental,
    fallbackImage: FALLBACK_IMAGE,
    description: "Cambridge 0680 sustainability & environmental science",
    badges: ["Case Studies", "Field Work", "Project Ideas"],
    priority: true
  }
];

const PRIORITY_SUBJECTS = ALL_SUBJECTS.filter(s => s.priority);

// Enhanced Testimonials
const testimonials = [
  {
    name: "Sarah Johnson",
    role: "IGCSE Graduate - 9A*s",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400",
    content: "GGK Learning's past papers database and video solutions were instrumental in achieving straight A*s in my IGCSE exams. The Cambridge and Edexcel materials were perfectly aligned!",
    rating: 5,
    subject: "Cambridge IGCSE",
    results: "9 A* Grades"
  },
  {
    name: "Ahmed Al-Rashid",
    role: "A-Level Student",
    image: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400",
    content: "The animated chemistry videos and virtual lab simulations made complex topics crystal clear. Moving from IGCSE to A-Level was seamless with GGK's comprehensive resources.",
    rating: 5,
    subject: "Chemistry & Physics",
    results: "A* in Sciences"
  },
  {
    name: "Emma Thompson",
    role: "IGCSE Teacher - 10 Years",
    image: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400",
    content: "As an educator, I recommend GGK to all my students. The exam board-specific content, mock tests, and progress tracking have consistently improved my students' performance by 30%+.",
    rating: 5,
    subject: "Mathematics Teacher",
    results: "95% Pass Rate"
  }
];

// ORIGINAL Subject Card Component - MAINTAINED AS IS
const SubjectCard = memo(({ 
  title, 
  image, 
  fallbackImage,
  description,
  badges,
  priority = false 
}: { 
  title: string; 
  image: string; 
  fallbackImage: string;
  description: string;
  badges?: string[];
  priority?: boolean;
}) => {
  const [imgSrc, setImgSrc] = useState(image);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const handleImageError = () => {
    setImgSrc(fallbackImage);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="surface-card group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-elevated">
      <div className="relative h-48 w-full overflow-hidden bg-theme-subtle dark:bg-white/10">
        {isLoading && (
          <div className="absolute inset-0 animate-pulse bg-theme-subtle dark:bg-white/10" />
        )}
        <img
          src={imgSrc}
          alt={title}
          className={`h-full w-full object-cover transition-all duration-300 ${
            isLoading ? 'scale-95 opacity-0' : 'scale-100 opacity-100 group-hover:scale-105'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
        <div className="absolute right-3 top-3">
          <span className="badge-soft bg-[color:var(--color-action-primary)]/20 text-[color:var(--color-action-contrast)]">
            IGCSE
          </span>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <h3 className="text-xl font-semibold text-theme-primary">{title}</h3>
          <p className="mt-2 text-sm text-theme-secondary">{description}</p>
        </div>

        {badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, index) => (
              <span key={index} className="badge-soft">
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

SubjectCard.displayName = 'SubjectCard';

// Enhanced Feature Card
const FeatureCard = memo(({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string
}) => (
  <div className="surface-card rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-elevated">
    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-action-primary)]/12 text-[color:var(--color-action-primary)]">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-theme-primary">{title}</h3>
    <p className="mt-2 text-theme-secondary">{description}</p>
  </div>
));

FeatureCard.displayName = 'FeatureCard';

const SectionDivider = memo(() => (
  <div aria-hidden="true" className="relative w-full py-8">
    <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[color:var(--color-action-primary)]/25 to-transparent" />
    <div className="relative mx-auto h-12 w-full max-w-4xl rounded-full bg-[radial-gradient(circle,rgba(100,188,70,0.18),transparent_60%)] blur-xl opacity-70" />
  </div>
));

SectionDivider.displayName = 'SectionDivider';

// Main Landing Page Component
export default function LandingPage() {
  const navigate = useNavigate();
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  return (
    <div className="landing-surface transition-theme">
      <Navigation />

      {/* Hero Section */}
      <div className="relative min-h-[92vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="IGCSE Cambridge Edexcel Students Learning"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="landing-hero__overlay" />
          <div className="landing-hero__grid" />
        </div>
        <div className="relative flex h-full items-center">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-20 text-center text-white sm:px-6 lg:px-8">
            <div className="stat-bubble mb-6">
              Cambridge &amp; Edexcel Excellence
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
              Master IGCSE, O-Level &amp; A-Level
              <span className="mt-2 block font-display text-4xl sm:text-5xl">with GGK Learning</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/90 sm:text-xl">
              Complete exam preparation with 10+ years of past papers, cinematic video lessons,
              adaptive mock exams, and AI-powered personalised feedback.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                variant="default"
                size="lg"
                rounded="full"
                className="w-full min-w-[190px] sm:w-auto shadow-theme-elevated"
                onClick={() => navigate('/signin')}
                rightIcon={<ChevronRight />}
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                size="lg"
                rounded="full"
                className="w-full min-w-[190px] border-white text-white hover:bg-white/20 hover:text-white drop-shadow-lg sm:w-auto"
                leftIcon={<PlayCircle />}
              >
                Watch Demo
              </Button>
            </div>
            {/* Trust badges - FIXED WITH CORRECT NUMBERS */}
            <div className="mt-8 flex items-center justify-center gap-8">
              <div className="text-white drop-shadow-lg">
                <div className="text-3xl font-bold">+</div>
                <div className="text-sm opacity-95 font-semibold">Active Students</div>
              </div>
              <div className="text-white drop-shadow-lg">
                <div className="text-3xl font-bold">%</div>
                <div className="text-sm opacity-95 font-semibold">Pass Rate</div>
              </div>
              <div className="text-white drop-shadow-lg">
                <div className="text-3xl font-bold">+</div>
                <div className="text-sm opacity-95 font-semibold">Schools Trust Us</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionDivider />

      {/* Exam Boards Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="heading-2 text-3xl">
              Official Exam Board Coverage
            </h2>
            <p className="text-xl text-theme-secondary">
              Complete syllabus coverage for all major examination boards
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="surface-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-elevated">
              <Award className="mx-auto mb-3 h-12 w-12 text-[color:var(--color-action-primary)]" />
              <h3 className="font-semibold text-theme-primary">Cambridge</h3>
              <p className="mt-2 text-sm text-theme-secondary">IGCSE &amp; A-Level</p>
            </div>
            <div className="surface-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-elevated">
              <Award className="mx-auto mb-3 h-12 w-12 text-[color:var(--color-action-primary)]" />
              <h3 className="font-semibold text-theme-primary">Edexcel</h3>
              <p className="mt-2 text-sm text-theme-secondary">International GCSE</p>
            </div>
            <div className="surface-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-elevated">
              <Award className="mx-auto mb-3 h-12 w-12 text-[color:var(--color-action-primary)]" />
              <h3 className="font-semibold text-theme-primary">AQA</h3>
              <p className="mt-2 text-sm text-theme-secondary">GCSE &amp; A-Level</p>
            </div>
            <div className="surface-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-elevated">
              <Award className="mx-auto mb-3 h-12 w-12 text-[color:var(--color-action-primary)]" />
              <h3 className="font-semibold text-theme-primary">OCR</h3>
              <p className="mt-2 text-sm text-theme-secondary">GCSE &amp; A-Level</p>
            </div>
          </div>
        </div>
      </div>

      <SectionDivider />

      {/* Enhanced Feature Highlights */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="heading-2 text-3xl text-[color:var(--color-action-primary)] mb-4">
              Complete IGCSE & A-Level Success Platform
            </h2>
            <p className="text-xl text-theme-secondary">
              Everything you need to excel in Cambridge and Edexcel examinations
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<FileText className="h-8 w-8" />}
              title="10+ Years Past Papers"
              description="Complete database of Cambridge & Edexcel past papers with mark schemes and examiner reports"
            />
            <FeatureCard
              icon={<Video className="h-8 w-8" />}
              title="Animated Video Lessons"
              description="3000+ animated videos explaining complex concepts with visual clarity"
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="AI-Powered Mock Exams"
              description="Personalized mock tests that adapt to your learning level with instant feedback"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Expert Teacher Support"
              description="Direct access to qualified IGCSE & A-Level teachers for doubt resolution"
            />
          </div>
        </div>
      </div>

      <SectionDivider />

      {/* ORIGINAL SUBJECTS SECTION - MAINTAINED EXACTLY AS IT WAS */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="heading-2 text-3xl text-[color:var(--color-action-primary)] mb-4">
              IGCSE & A-Level Subjects We Offer
            </h2>
            <p className="text-xl text-theme-secondary mb-8">
              Complete Cambridge & Edexcel syllabus coverage with exam board-specific resources
            </p>
            <Button
              variant="default"
              size="lg"
              rounded="full"
              className="shadow-theme-elevated"
              onClick={() => navigate('/subjects')}
              rightIcon={<ChevronRight />}
            >
              View All Subjects
            </Button>
          </div>
          
          {/* DISPLAY FIRST 6 SUBJECTS IN GRID, THEN MORE ON CLICK */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {(showAllSubjects ? PRIORITY_SUBJECTS : PRIORITY_SUBJECTS.slice(0, 6)).map((subject) => (
              <SubjectCard 
                key={subject.title} 
                {...subject} 
                priority={true}
              />
            ))}
          </div>
          
          {/* Show More/Less Button */}
          {PRIORITY_SUBJECTS.length > 6 && (
            <div className="text-center mt-12">
              <Button
                variant="outline"
                size="lg"
                rounded="full"
                onClick={() => setShowAllSubjects(!showAllSubjects)}
                rightIcon={showAllSubjects ? <ChevronUp /> : <ChevronDown />}
              >
                {showAllSubjects ? 'Show Less Subjects' : `View ${PRIORITY_SUBJECTS.length - 6} More Subjects`}
              </Button>
            </div>
          )}
        </div>
      </div>

      <SectionDivider />

      {/* Enhanced Testimonials */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="heading-2 text-3xl text-[color:var(--color-action-primary)] mb-4">
              Success Stories from IGCSE & A-Level Students
            </h2>
            <p className="text-xl text-theme-secondary">
              Join thousands of students achieving top grades with GGK Learning
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="surface-card rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-elevated"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                  <span className="ml-auto rounded-full bg-[color:var(--color-action-primary)]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-action-primary)]">
                    {testimonial.results}
                  </span>
                </div>

                <div className="relative mb-6">
                  <Quote className="absolute -top-2 -left-2 h-8 w-8 text-[#8CC63F] opacity-20" />
                  <p className="pl-6 italic text-theme-secondary">
                    "{testimonial.content}"
                  </p>
                </div>

                <div className="flex items-center">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full object-cover mr-4"
                    loading="lazy"
                  />
                  <div>
                    <h4 className="font-semibold text-theme-primary">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-theme-secondary">
                      {testimonial.role}
                    </p>
                    <p className="text-xs font-medium text-[color:var(--color-action-primary)]">
                      {testimonial.subject}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionDivider />

      {/* Statistics Section - REDUCED PADDING */}
      <div className="py-12 bg-gradient-to-r from-[#8CC63F] to-[#7AB635]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Proven Results That Speak for Themselves
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="text-center text-white">
              <div className="font-display text-4xl font-semibold tracking-tight">15,000+</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/70">Past Papers Database</div>
            </div>
            <div className="text-center text-white">
              <div className="font-display text-4xl font-semibold tracking-tight">3,000+</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/70">Video Lessons</div>
            </div>
            <div className="text-center text-white">
              <div className="font-display text-4xl font-semibold tracking-tight">500+</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/70">Mock Exams</div>
            </div>
            <div className="text-center text-white">
              <div className="font-display text-4xl font-semibold tracking-tight">24/7</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/70">Learning Support</div>
            </div>
          </div>
        </div>
      </div>

      <SectionDivider />

      {/* Footer - REDUCED PADDING */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Company Info */}
            <div className="space-y-3">
              <div className="flex items-center">
                <GraduationCap className="h-7 w-7 text-[#8CC63F]" />
                <span className="ml-2 text-xl font-bold">GGK Learning</span>
              </div>
              <p className="text-gray-400 text-sm">
                Your trusted partner for IGCSE, O-Level, and A-Level success. 
                Official Cambridge and Edexcel exam preparation platform.
              </p>
              <div className="flex space-x-3">
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-base font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/subjects" className="text-gray-400 hover:text-white transition-colors text-sm">
                    IGCSE Subjects
                  </Link>
                </li>
                <li>
                  <Link to="/resources" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Past Papers
                  </Link>
                </li>
                <li>
                  <Link to="/mock-exams" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Mock Exams
                  </Link>
                </li>
                <li>
                  <Link to="/video-lessons" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Video Lessons
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Pricing Plans
                  </Link>
                </li>
              </ul>
            </div>

            {/* Exam Boards */}
            <div>
              <h3 className="text-base font-semibold mb-3">Exam Boards</h3>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/cambridge-igcse" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Cambridge IGCSE
                  </Link>
                </li>
                <li>
                  <Link to="/edexcel-igcse" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Edexcel International
                  </Link>
                </li>
                <li>
                  <Link to="/cambridge-a-level" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Cambridge A-Level
                  </Link>
                </li>
                <li>
                  <Link to="/edexcel-a-level" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Edexcel A-Level
                  </Link>
                </li>
                <li>
                  <Link to="/cambridge-o-level" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Cambridge O-Level
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-base font-semibold mb-3">Contact Us</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-[#8CC63F] mr-2" />
                  <span className="text-gray-400 text-sm">support@ggknowledge.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-[#8CC63F] mr-2" />
                  <span className="text-gray-400 text-sm">+965 9722 2711</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-[#8CC63F] mr-2" />
                  <span className="text-gray-400 text-sm">Kuwait City, Kuwait</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-xs">
                © 2025 GGK Learning Platform. Official Cambridge & Edexcel Partner.
              </p>
              <div className="flex space-x-4 mt-3 md:mt-0">
                <Link to="/privacy" className="text-gray-400 hover:text-white text-xs transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="text-gray-400 hover:text-white text-xs transition-colors">
                  Terms of Service
                </Link>
                <Link to="/cookies" className="text-gray-400 hover:text-white text-xs transition-colors">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}