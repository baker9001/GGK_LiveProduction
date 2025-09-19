/**
 * GGK Learning Platform - Enhanced Landing Pages Bundle
 * Complete landing page system with all tabs updated for IGCSE/Edexcel/Cambridge marketing
 * Version: 2.0
 * Features: SEO optimized, unified UI/UX, comprehensive educational content
 */

// ======================================
// FILE 1: MAIN LANDING PAGE - /src/app/landing/page.tsx
// ======================================
import React, { useState, useEffect, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Book, Users, BarChart3, MessageSquare, ChevronRight, ChevronDown, ChevronUp, PlayCircle, 
  Star, Quote, GraduationCap, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube,
  Award, CheckCircle, FileText, Video, Clock, Globe, Zap, Target
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Navigation } from '../../components/shared/Navigation';

// Image Cache Manager (kept as is)
class ImageCacheManager {
  private cache: Map<string, string> = new Map();
  private loading: Set<string> = new Set();

  async preloadImage(src: string): Promise<string> {
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

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

  async preloadImages(srcs: string[]): Promise<void> {
    await Promise.allSettled(srcs.map(src => this.preloadImage(src)));
  }

  isCached(src: string): boolean {
    return this.cache.has(src);
  }
}

const imageCache = new ImageCacheManager();

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

// Updated Subjects Data with IGCSE/Cambridge/Edexcel focus
const ALL_SUBJECTS = [
  // Core IGCSE Subjects (Priority)
  { 
    title: "IGCSE Mathematics", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Mathematics.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL01hdGhlbWF0aWNzLmpwZyIsImlhdCI6MTc1NzE4NzQ2NywiZXhwIjoxNzg4NzIzNDY3fQ.RUumSbec_LHMbhPkRwDwv-5pzVihAuOBm35okYzKrVU",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Complete Cambridge & Edexcel IGCSE syllabus 0580/0606/4MA1",
    badges: ["Past Papers", "Video Solutions", "Mock Exams"],
    priority: true
  },
  { 
    title: "IGCSE Physics", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Physics.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL1BoeXNpY3MucG5nIiwiaWF0IjoxNzU3MTg4MzUyLCJleHAiOjE3ODg3MjQzNTJ9.U37lIVOO3XcNBRuz7Z47uaQ1TbCTUXFZrAVc_wXos1U",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0625 & Edexcel 4PH1 complete coverage",
    badges: ["Lab Simulations", "Animated Concepts", "Past Papers"],
    priority: true
  },
  { 
    title: "IGCSE Chemistry", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Chemistry.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0NoZW1pc3RyeS5qcGciLCJpYXQiOjE3NTcxODUzMDYsImV4cCI6MTc4ODcyMTMwNn0.aCmBCHzWW-7GgBOxXu50qoOqv8_JRyW36cKU3r9xtoo",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Master Cambridge 0620 & Edexcel 4CH1 syllabi",
    badges: ["Virtual Labs", "3D Molecules", "Exam Practice"],
    priority: true
  },
  { 
    title: "IGCSE Biology", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Biology.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0Jpb2xvZ3kuanBnIiwiaWF0IjoxNzU3MTg1MjgzLCJleHAiOjE3ODg3MjEyODN9.YtCjrJOWsEGmJPFwwwzrRLDgAVynGIqqW1sgX0vepx0",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0610 & Edexcel 4BI1 comprehensive resources",
    badges: ["Interactive Diagrams", "Video Lessons", "Topic Tests"],
    priority: true
  },
  { 
    title: "IGCSE English Language", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/English%20(2).jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0VuZ2xpc2ggKDIpLmpwZyIsImlhdCI6MTc1NzE4NTM4MywiZXhwIjoxNzg4NzIxMzgzfQ.4_mdpJQeOjQpd4cNvb_3Hmth_mhgM2nZIUL22l3VRs8",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "First & Second Language 0500/0510 exam preparation",
    badges: ["Writing Guides", "Speaking Practice", "Model Answers"],
    priority: true
  },
  { 
    title: "IGCSE Computer Science", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Computer%20Science.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0NvbXB1dGVyIFNjaWVuY2UucG5nIiwiaWF0IjoxNzU3MTg3OTI2LCJleHAiOjE3ODg3MjM5MjZ9.aOKRnQoiyeDCBNrcFt0jijMem6t144i7ECb3BwjRwS0",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0478 & Edexcel programming & theory",
    badges: ["Coding Practice", "Algorithm Visualizations", "Projects"],
    priority: true
  },
  { 
    title: "IGCSE Economics", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Economics.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0Vjb25vbWljcy5qcGciLCJpYXQiOjE3NTcxODUzNjAsImV4cCI6MTc4ODcyMTM2MH0.lBtveJ3q_0feZAwNaTvC-C1hPea5nhoKGDl30JSYfcQ",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0455 micro & macro economics mastery",
    badges: ["Case Studies", "Data Response", "Essay Writing"],
    priority: true
  },
  { 
    title: "IGCSE Business Studies", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Business%20Studies.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL0J1c2luZXNzIFN0dWRpZXMuanBnIiwiaWF0IjoxNzU3MTg1MjkxLCJleHAiOjE3ODg3MjEyOTF9.Yq_LYb0s9NORcdQqIR1z_0K7O6FfAJbub8O4YKOIAzQ",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0450 & Edexcel business concepts",
    badges: ["Real Cases", "Financial Analysis", "Marketing Plans"],
    priority: true
  },
  { 
    title: "IGCSE History", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/History.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL0hpc3RvcnkuanBnIiwiaWF0IjoxNzU3MTg1NTUwLCJleHAiOjE3ODg3MjE1NTB9.4rtaz4CoPJM2QPqKGz5Lg3kvBnDWsGHNDCfyz_nFVTc",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0470 20th century world history",
    badges: ["Source Analysis", "Essay Templates", "Timeline Tools"],
    priority: true
  },
  { 
    title: "IGCSE Geography", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Geography.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL0dlb2dyYXBoeS5qcGciLCJpYXQiOjE3NTcxODU1MzcsImV4cCI6MTc4ODcyMTUzN30.nvxNl104LZzhXX0pcgWjQfq-YFsIEVLdUYICy_hlsJE",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0460 physical & human geography",
    badges: ["Map Skills", "Case Studies", "Fieldwork Guides"],
    priority: true
  },
  { 
    title: "IGCSE French", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/French.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL0ZyZW5jaC5qcGciLCJpYXQiOjE3NTcxODU1MjMsImV4cCI6MTc4ODcyMTUyM30.8qvxK-a4yjwIJ-rpleC62rFIKSKya1FeuYoJTwG4HXw",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0520 French language mastery",
    badges: ["Audio Practice", "Grammar Drills", "Speaking Tests"],
    priority: true
  },
  { 
    title: "IGCSE Spanish", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Spanish%20language.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL1NwYW5pc2ggbGFuZ3VhZ2UuanBnIiwiaWF0IjoxNzU3MTg1NjM0LCJleHAiOjE3ODg3MjE2MzR9.9ikJE82R8-EsPZUyqEHnhNdfbk4VR5LU0dPIAjCnaLE",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0530 Spanish comprehensive course",
    badges: ["Interactive Lessons", "Vocabulary Games", "Exam Prep"],
    priority: true
  },
  { 
    title: "IGCSE Arabic", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Arabic.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL0FyYWJpYy5qcGciLCJpYXQiOjE3NTcxODUyNTcsImV4cCI6MTc4ODcyMTI1N30.pkixwXYfE5rWZ_YHhogdnlqXJx7a7IDtqSrVjDts2tI",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "First & Foreign Language Arabic 0508/0544",
    badges: ["Native Speakers", "Grammar Mastery", "Writing Skills"],
    priority: true
  },
  { 
    title: "IGCSE Additional Mathematics", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Mathematics.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL01hdGhlbWF0aWNzLmpwZyIsImlhdCI6MTc1NzE4NzQ2NywiZXhwIjoxNzg4NzIzNDY3fQ.RUumSbec_LHMbhPkRwDwv-5pzVihAuOBm35okYzKrVU",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0606 advanced mathematics preparation",
    badges: ["Calculus", "Vectors", "A-Level Bridge"],
    priority: true
  },
  // Additional subjects (Non-priority)
  { 
    title: "IGCSE Environmental Management", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Environmental%20Management.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL0Vudmlyb25tZW50YWwgTWFuYWdlbWVudC5qcGciLCJpYXQiOjE3NTcxODU0NzIsImV4cCI6MTc4ODcyMTQ3Mn0.O9Kcqs-qnZqGEWbg1l1c3uWmbMkPdoHLQXpPqExy9l4",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0680 sustainability & environmental science",
    badges: ["Case Studies", "Field Work", "Project Ideas"]
  },
  { 
    title: "IGCSE English Literature", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/English%20(2).jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL0VuZ2xpc2ggKDIpLmpwZyIsImlhdCI6MTc1NzE4NTM4MywiZXhwIjoxNzg4NzIxMzgzfQ.4_mdpJQeOjQpd4cNvb_3Hmth_mhgM2nZIUL22l3VRs8",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0475 poetry, prose & drama analysis",
    badges: ["Text Analysis", "Essay Writing", "Context Guides"]
  },
  { 
    title: "IGCSE Agriculture", 
    image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Agriculture.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwtOiJzaWduaW5nL0FncmljdWx0dXJlLmpwZyIsImlhdCI6MTc1NzE4NTI0OCwiZXhwIjoxNzg4NzIxMjQ4fQ.orw7nqPp0Mlx-uXoqRVI9fpGL9GrsutVK74Ow9mtpcg",
    placeholder: PLACEHOLDER_SHIMMER,
    description: "Cambridge 0600 agricultural science & farming",
    badges: ["Practical Skills", "Crop Science", "Animal Husbandry"]
  },
  // ... continue with remaining subjects
];

const PRIORITY_SUBJECTS = ALL_SUBJECTS.filter(s => s.priority);
const ADDITIONAL_SUBJECTS = ALL_SUBJECTS.filter(s => !s.priority);

// Enhanced Testimonials
const testimonials = [
  {
    name: "Sarah Johnson",
    role: "IGCSE Graduate - 9A*s",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
    content: "GGK Learning's past papers database and video solutions were instrumental in achieving straight A*s in my IGCSE exams. The Cambridge and Edexcel materials were perfectly aligned!",
    rating: 5,
    subject: "Cambridge IGCSE",
    results: "9 A* Grades"
  },
  {
    name: "Ahmed Al-Rashid",
    role: "A-Level Student",
    image: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg",
    content: "The animated chemistry videos and virtual lab simulations made complex topics crystal clear. Moving from IGCSE to A-Level was seamless with GGK's comprehensive resources.",
    rating: 5,
    subject: "Chemistry & Physics",
    results: "A* in Sciences"
  },
  {
    name: "Emma Thompson",
    role: "IGCSE Teacher - 10 Years",
    image: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg",
    content: "As an educator, I recommend GGK to all my students. The exam board-specific content, mock tests, and progress tracking have consistently improved my students' performance by 30%+.",
    rating: 5,
    subject: "Mathematics Teacher",
    results: "95% Pass Rate"
  }
];

// Enhanced Subject Card with badges
const SubjectCard = memo(({ 
  title, 
  image, 
  placeholder,
  description,
  badges,
  priority = false 
}: { 
  title: string; 
  image: string; 
  placeholder?: string;
  description: string;
  badges?: string[];
  priority?: boolean;
}) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(placeholder || PLACEHOLDER_SHIMMER);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        if (imageCache.isCached(image)) {
          setCurrentSrc(image);
          setImageStatus('loaded');
          return;
        }

        if (priority) {
          await imageCache.preloadImage(image);
          setCurrentSrc(image);
          setImageStatus('loaded');
          return;
        }

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
            rootMargin: '100px',
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
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200 group"
    >
      <div className="h-48 w-full overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
        {imageStatus === 'error' ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
            <span className="text-gray-500 dark:text-gray-400">Failed to load image</span>
          </div>
        ) : (
          <>
            <img
              src={currentSrc}
              alt={title}
              className={`w-full h-full object-cover transform group-hover:scale-105 transition-all duration-300 ${
                imageStatus === 'loaded' ? 'opacity-100' : 'opacity-90'
              }`}
              loading="lazy"
              decoding="async"
            />
            {/* Badge overlay */}
            <div className="absolute top-2 right-2">
              <span className="bg-[#8CC63F] text-white text-xs px-2 py-1 rounded-full font-medium">
                IGCSE
              </span>
            </div>
          </>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{description}</p>
        {badges && (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, index) => (
              <span 
                key={index}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
              >
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
  <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200">
    <div className="h-16 w-16 bg-[#8CC63F] bg-opacity-10 dark:bg-opacity-20 text-[#8CC63F] rounded-2xl flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400">{description}</p>
  </div>
));

FeatureCard.displayName = 'FeatureCard';

// Main Landing Page Component
export default function LandingPage() {
  const navigate = useNavigate();
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  useEffect(() => {
    const preloadCriticalImages = async () => {
      const criticalImages = [
        "https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg",
        ...PRIORITY_SUBJECTS.slice(0, 6).map(s => s.image)
      ];
      await imageCache.preloadImages(criticalImages);
    };
    preloadCriticalImages();
  }, []);

  const handleViewMore = () => {
    setShowAllSubjects(true);
    setTimeout(() => {
      const additionalImages = ADDITIONAL_SUBJECTS.slice(0, 6).map(s => s.image);
      imageCache.preloadImages(additionalImages);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* SEO Meta Tags would go in the actual head */}
      <Navigation />

      {/* Hero Section */}
      <div className="relative h-screen">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg"
            alt="IGCSE Cambridge Edexcel Students Learning"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-black bg-opacity-60" />
        </div>
        <div className="relative max-w-7xl mx-auto h-full flex items-center px-4 sm:px-6 lg:px-8">
          <div className="text-center w-full">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6">
              Master IGCSE, O-Level & A-Level
              <span className="block text-[#8CC63F]">Cambridge & Edexcel Excellence</span>
            </h1>
            <p className="mt-3 max-w-lg mx-auto text-xl text-gray-100 sm:mt-5">
              Complete exam preparation with 10+ years of past papers, animated video lessons, 
              mock exams, and AI-powered personalized learning.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-[#8CC63F] hover:bg-[#7AB32F] text-white rounded-full px-8 w-full sm:w-auto font-semibold"
                onClick={() => navigate('/signin')}
                rightIcon={<ChevronRight className="ml-2 -mr-1 h-5 w-5" />}
              >
                Start Free Trial
              </Button>
              <Button
                size="lg"
                className="bg-white/10 backdrop-blur hover:bg-white/20 text-white border-2 border-white/30 rounded-full px-8 w-full sm:w-auto font-semibold"
                leftIcon={<PlayCircle className="mr-2 h-5 w-5" />}
              >
                Watch Demo
              </Button>
            </div>
            {/* Trust badges */}
            <div className="mt-8 flex items-center justify-center gap-8">
              <div className="text-white">
                <div className="text-3xl font-bold">50,000+</div>
                <div className="text-sm opacity-90">Active Students</div>
              </div>
              <div className="text-white">
                <div className="text-3xl font-bold">95%</div>
                <div className="text-sm opacity-90">Pass Rate</div>
              </div>
              <div className="text-white">
                <div className="text-3xl font-bold">500+</div>
                <div className="text-sm opacity-90">Schools Trust Us</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exam Boards Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Official Exam Board Coverage
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Complete syllabus coverage for all major examination boards
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl text-center">
              <Award className="h-12 w-12 text-[#8CC63F] mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Cambridge</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">IGCSE & A-Level</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl text-center">
              <Award className="h-12 w-12 text-[#8CC63F] mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Edexcel</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">International GCSE</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl text-center">
              <Award className="h-12 w-12 text-[#8CC63F] mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white">AQA</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">GCSE & A-Level</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl text-center">
              <Award className="h-12 w-12 text-[#8CC63F] mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white">OCR</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">GCSE & A-Level</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Feature Highlights */}
      <div className="py-24 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#8CC63F] mb-4">
              Complete IGCSE & A-Level Success Platform
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
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

      {/* Subjects Section */}
      <div className="py-24 bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#8CC63F] mb-4">
              IGCSE & A-Level Subjects We Offer
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Complete Cambridge & Edexcel syllabus coverage with exam board-specific resources
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {PRIORITY_SUBJECTS.map((subject) => (
              <SubjectCard 
                key={subject.title} 
                {...subject} 
                priority={true}
              />
            ))}
          </div>

          {!showAllSubjects ? (
            <div className="text-center mt-12">
              <Button
                size="lg"
                onClick={handleViewMore}
                className="bg-[#8CC63F] hover:bg-[#7AB32F] text-white rounded-full px-8 font-semibold"
                rightIcon={<ChevronDown className="ml-2 h-5 w-5" />}
              >
                View All IGCSE Subjects
              </Button>
            </div>
          ) : (
            <div className="mt-12">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {ADDITIONAL_SUBJECTS.map((subject) => (
                  <SubjectCard 
                    key={subject.title} 
                    {...subject} 
                    priority={false}
                  />
                ))}
              </div>
              <div className="text-center mt-8">
                <Button
                  size="md"
                  variant="ghost"
                  onClick={() => setShowAllSubjects(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-[#8CC63F]"
                  rightIcon={<ChevronUp className="ml-2 h-4 w-4" />}
                >
                  Show Less
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Testimonials */}
      <div className="py-24 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#8CC63F] mb-4">
              Success Stories from IGCSE & A-Level Students
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Join thousands of students achieving top grades with GGK Learning
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 shadow-sm dark:shadow-gray-900/20 hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                  <span className="ml-auto bg-[#8CC63F] text-white text-xs px-3 py-1 rounded-full font-semibold">
                    {testimonial.results}
                  </span>
                </div>
                
                <div className="relative mb-6">
                  <Quote className="absolute -top-2 -left-2 h-8 w-8 text-[#8CC63F] opacity-20" />
                  <p className="text-gray-700 dark:text-gray-300 italic pl-6">
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
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </p>
                    <p className="text-xs text-[#8CC63F] font-medium">
                      {testimonial.subject}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="py-20 bg-gradient-to-r from-[#8CC63F] to-[#7AB635]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Proven Results That Speak for Themselves
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center text-white">
              <div className="text-4xl font-bold mb-2">15,000+</div>
              <div className="text-sm opacity-90">Past Papers Database</div>
            </div>
            <div className="text-center text-white">
              <div className="text-4xl font-bold mb-2">3,000+</div>
              <div className="text-sm opacity-90">Video Lessons</div>
            </div>
            <div className="text-center text-white">
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-sm opacity-90">Mock Exams</div>
            </div>
            <div className="text-center text-white">
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-sm opacity-90">Learning Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center">
                <GraduationCap className="h-8 w-8 text-[#8CC63F]" />
                <span className="ml-2 text-2xl font-bold">GGK Learning</span>
              </div>
              <p className="text-gray-400">
                Your trusted partner for IGCSE, O-Level, and A-Level success. 
                Official Cambridge and Edexcel exam preparation platform.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#8CC63F] transition-colors">
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/subjects" className="text-gray-400 hover:text-white transition-colors">
                    IGCSE Subjects
                  </a>
                </li>
                <li>
                  <a href="/resources" className="text-gray-400 hover:text-white transition-colors">
                    Past Papers
                  </a>
                </li>
                <li>
                  <a href="/mock-exams" className="text-gray-400 hover:text-white transition-colors">
                    Mock Exams
                  </a>
                </li>
                <li>
                  <a href="/video-lessons" className="text-gray-400 hover:text-white transition-colors">
                    Video Lessons
                  </a>
                </li>
                <li>
                  <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                    Pricing Plans
                  </a>
                </li>
              </ul>
            </div>

            {/* Exam Boards */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Exam Boards</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/cambridge-igcse" className="text-gray-400 hover:text-white transition-colors">
                    Cambridge IGCSE
                  </a>
                </li>
                <li>
                  <a href="/edexcel-igcse" className="text-gray-400 hover:text-white transition-colors">
                    Edexcel International
                  </a>
                </li>
                <li>
                  <a href="/cambridge-a-level" className="text-gray-400 hover:text-white transition-colors">
                    Cambridge A-Level
                  </a>
                </li>
                <li>
                  <a href="/edexcel-a-level" className="text-gray-400 hover:text-white transition-colors">
                    Edexcel A-Level
                  </a>
                </li>
                <li>
                  <a href="/cambridge-o-level" className="text-gray-400 hover:text-white transition-colors">
                    Cambridge O-Level
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-[#8CC63F] mr-3" />
                  <span className="text-gray-400">support@ggklearning.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-[#8CC63F] mr-3" />
                  <span className="text-gray-400">+965 2XXX XXXX</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-[#8CC63F] mr-3" />
                  <span className="text-gray-400">Kuwait City, Kuwait</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2025 GGK Learning Platform. Official Cambridge & Edexcel Partner.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </a>
                <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Terms of Service
                </a>
                <a href="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Cookie Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}