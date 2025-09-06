import React, { useState, useEffect, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Book, Users, BarChart3, MessageSquare, ChevronRight, PlayCircle, 
  AlertCircle, Loader2, Star, Quote, GraduationCap, Mail, Phone, 
  MapPin, Facebook, Twitter, Instagram, Youtube 
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Navigation } from '../../components/shared/Navigation';
import { supabase } from '../../lib/supabase';
import { setAuthenticatedUser, type User, type UserRole } from '../../lib/auth';

// ========================================
// IMAGE CACHE MANAGER
// ========================================
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

// ========================================
// PLACEHOLDER SHIMMER
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

// ========================================
// SUBJECT DATA - ALL 30 SUBJECTS
// ========================================
const SUBJECT_CATEGORIES = [
  {
    title: "Sciences & Mathematics",
    subjects: [
      { 
        title: "Mathematics", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Mathematics.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL01hdGhlbWF0aWNzLmpwZWciLCJpYXQiOjE3NTcxODIxNDQsImV4cCI6NDg3OTI0NjE0NH0.w7Q-3w4eGp9ZOrsdT1wrHnIKM49bam4S8j4IJJGwx5w",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Master algebra, geometry, statistics, and calculus" 
      },
      { 
        title: "Physics", 
        image: "https://images.pexels.com/photos/714699/pexels-photo-714699.jpeg", // MISSING - keeping original
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Explore mechanics, electricity, waves, and atomic physics" 
      },
      { 
        title: "Chemistry", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Chemistry.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0NoZW1pc3RyeS5qcGVnIiwiaWF0IjoxNzU3MTgxNzUwLCJleHAiOjQ4NzkyNDU3NTB9.e9o2dalCXd6Ya9YTNt54ofkEBU0dJahxvlG5Vd_pwdE",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Study chemical reactions, organic chemistry, and analysis" 
      },
      { 
        title: "Biology", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Biology.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0Jpb2xvZ3kuanBlZyIsImlhdCI6MTc1NzE4MTY5OSwiZXhwIjo0ODc5MjQ1Njk5fQ.NHzAJ2D9yz9j2JnpyE1xnqyzaFTQoq-9fZ5quqUTgYg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Understand living organisms, ecology, and genetics" 
      },
      { 
        title: "Environmental Management", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Environmental%20Management.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0Vudmlyb25tZW50YWwgTWFuYWdlbWVudC5qcGVnIiwiaWF0IjoxNzU3MTgxOTk2LCJleHAiOjQ4NzkyNDU5OTZ9.fJ0dfwGrKlsTjJSU0HMNH5DeCntgYAwrE7Ptagbwa7k",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Sustainability and environmental science" 
      },
      { 
        title: "Agriculture", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Agriculture.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0FncmljdWx0dXJlLmpwZWciLCJpYXQiOjE3NTcxODE1NDQsImV4cCI6NDg3OTI0NTU0NH0.y_OcVwtOIu9hjP1zN0vuGiire0E6dDFpp7CCxl6LxsU",
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
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/English.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0VuZ2xpc2gucG5nIiwiaWF0IjoxNzU3MTgxOTM3LCJleHAiOjQ4NzkyNDU5Mzd9.syR1ubxW9E9Xy597c3OD76eoC1vrX_Lsucqr5gda7iM",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Develop reading, writing, speaking, and listening skills" 
      },
      { 
        title: "English Literature", 
        image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg", // MISSING - keeping original
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Analyze poetry, prose, and drama from various periods" 
      },
      { 
        title: "French", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/French.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0ZyZW5jaC5qcGVnIiwiaWF0IjoxNzU3MTgyMDUwLCJleHAiOjQ4NzkyNDYwNTB9.2R8Mz7mCBOS8nQXcXBYJEZw3OsgI6J5vsTicBQE2mCU",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Learn French language and francophone culture" 
      },
      { 
        title: "Spanish", 
        image: "https://images.pexels.com/photos/4491461/pexels-photo-4491461.jpeg", // MISSING - keeping original
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Master Spanish communication and Hispanic culture" 
      },
      { 
        title: "Arabic", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Arabic.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0FyYWJpYy5qcGVnIiwiaWF0IjoxNzU3MTgxNjQ5LCJleHAiOjQ4NzkyNDU2NDl9.ur8Qotm170I9eebfqcOxaiJN35gYQQfsWMVhsny-op4",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Master Arabic script and communication" 
      },
      { 
        title: "English as a Second Language", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/English%20as%20a%20Second%20Language.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0VuZ2xpc2ggYXMgYSBTZWNvbmQgTGFuZ3VhZ2UuanBlZyIsImlhdCI6MTc1NzE4MTg2NiwiZXhwIjo0ODc5MjQ1ODY2fQ.TDB5KcfKpfSK9ksEaMeP6RBAznIJGQZJSMvCocPxgyM",
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
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/History.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0hpc3RvcnkucG5nIiwiaWF0IjoxNzU3MTgzODc2LCJleHAiOjQ4NzkyNDc4NzZ9.ykwDKXS0eYP4MO2q5rI_as9Hb9df9o2JeQrRAZOOSK8",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Study world history from ancient to modern times" 
      },
      { 
        title: "Geography", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Geography.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0dlb2dyYXBoeS5qcGVnIiwiaWF0IjoxNzU3MTgyMDY3LCJleHAiOjQ4NzkyNDYwNjd9.A-Z1TYSbd3LSeAGCpcGvd0lRC--qGBs01JNDznyVChQ",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Explore physical and human geography" 
      },
      { 
        title: "Economics", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Economics.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0Vjb25vbWljcy5qcGVnIiwiaWF0IjoxNzU3MTgxODQ5LCJleHAiOjQ4NzkyNDU4NDl9.sEkTCUXXKnb2cEyZO8Z0NVZpEMENeGsf9IOUrVfi4jg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Understand micro and macroeconomic principles" 
      },
      { 
        title: "Business Studies", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Business%20Studies.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0J1c2luZXNzIFN0dWRpZXMuanBlZyIsImlhdCI6MTc1NzE4MTczMiwiZXhwIjo0ODc5MjQ1NzMyfQ.nDexafDNQFi37-abTKtXY6UIGaaXL6RIzqXLb-0LEc4",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Learn business concepts and entrepreneurship" 
      },
      { 
        title: "Sociology", 
        image: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg", // MISSING - keeping original
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Study society, culture, and human behavior" 
      },
      { 
        title: "Psychology", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Psychology.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL1BzeWNob2xvZ3kuanBlZyIsImlhdCI6MTc1NzE4MjI3NywiZXhwIjo0ODc5MjQ2Mjc3fQ.DZRyExA9r5sXEqsMOIPFEO2Rqy8sVNf6hXBmAU2eoS4",
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
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Computer%20Science.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0NvbXB1dGVyIFNjaWVuY2UuanBlZyIsImlhdCI6MTc1NzE4MTc3MSwiZXhwIjo0ODc5MjQ1NzcxfQ.FiJAFWfiJZSXbc6wmxgeQyNx4GmJjzN_RKp5WdixjT0",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Programming, algorithms, and computational thinking" 
      },
      { 
        title: "Information Technology", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Information%20Technology.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0luZm9ybWF0aW9uIFRlY2hub2xvZ3kuanBlZyIsImlhdCI6MTc1NzE4MjA4NywiZXhwIjo0ODc5MjQ2MDg3fQ.cDC2Rf7KMJGAPqsE-N43G9UzpPnYPR73gNnsBr13s4I",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Digital literacy and practical IT skills" 
      },
      { 
        title: "Design & Technology", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Design%20&%20Technology.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0Rlc2lnbiAmIFRlY2hub2xvZ3kuanBlZyIsImlhdCI6MTc1NzE4MTc4NywiZXhwIjo0ODc5MjQ1Nzg3fQ.OmwKvX_QGhzKXF4J2cEnTarodc9vsMLU-uAtpSPsiSM",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Product design and manufacturing processes" 
      },
      { 
        title: "Digital Media", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Digital%20Media.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0RpZ2l0YWwgTWVkaWEuanBlZyIsImlhdCI6MTc1NzE4MTgwNywiZXhwIjo0ODc5MjQ1ODA3fQ.2wovoPH8hIHfPauWMFKI2fnQezvBvg051IfXFzZPja4",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Create and edit digital content" 
      },
      { 
        title: "Accounting", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Accounting.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0FjY291bnRpbmcuanBlZyIsImlhdCI6MTc1NzE4MTQ2NiwiZXhwIjo0ODc5MjQ1NDY2fQ.HsbSmFiOvA0ohatzjxzeoDkuNTCgXEdWCwvH3GZRJ_Q",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Financial accounting and bookkeeping" 
      },
      { 
        title: "Enterprise", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Enterprise.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0VudGVycHJpc2UuanBlZyIsImlhdCI6MTc1NzE4MTk2MCwiZXhwIjo0ODc5MjQ1OTYwfQ.jSf3V3vNF6UR2MUCNlFMsgu-c-ogNkLAjn49cP-pXjE",
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
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Art%20&%20Design.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0FydCAmIERlc2lnbi5qcGVnIiwiaWF0IjoxNzU3MTgxNjcwLCJleHAiOjQ4NzkyNDU2NzB9.Dp9tiJPJwb1zm2KHORL15J1MHhkVUhveyVU5P0eCscg",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Develop artistic skills and creative expression" 
      },
      { 
        title: "Music", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Music.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL011c2ljLmpwZWciLCJpYXQiOjE3NTcxODIxNjQsImV4cCI6NDg3OTI0NjE2NH0.Rwk_fLYQrKD5QBV995wcMpZdfvVVVc1tN3hx47CXdU4",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Music theory, performance, and composition" 
      },
      { 
        title: "Drama", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Drama.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0RyYW1hLmpwZWciLCJpYXQiOjE3NTcxODE4MjcsImV4cCI6NDg3OTI0NTgyN30.-Was6tX7ZVvkXf533Gdy9U7v2GuqSsBC0Fn8jgYf9ow",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Theatre studies and performance arts" 
      },
      { 
        title: "Photography", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Photography.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL1Bob3RvZ3JhcGh5LmpwZWciLCJpYXQiOjE3NTcxODIyMzcsImV4cCI6NDg3OTI0NjIzN30.7qYaop17AaeJl0LXOkHd7Kb9YcDqNi-w2vOPi7mZR7k",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Digital photography and image composition" 
      },
      { 
        title: "Physical Education", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Physical%20Education.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL1BoeXNpY2FsIEVkdWNhdGlvbi5qcGVnIiwiaWF0IjoxNzU3MTgyMjU2LCJleHAiOjQ4NzkyNDYyNTZ9.pRe_tDs7z-vO2b1jT_ztrNvbY04R1_A4QZCwWEDhLRY",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Sports science and physical fitness" 
      },
      { 
        title: "Food & Nutrition", 
        image: "https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/Food%20&%20Nutrition.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL0Zvb2QgJiBOdXRyaXRpb24uanBlZyIsImlhdCI6MTc1NzE4MjAwOSwiZXhwIjo0ODc5MjQ2MDA5fQ.j3eaCfzMpM7m1FEABPx4poOlM0VvELS2HRUkS3ZpxmI",
        placeholder: PLACEHOLDER_SHIMMER,
        description: "Nutritional science and food preparation" 
      }
    ]
  }
];

// ========================================
// TESTIMONIALS DATA
// ========================================
const testimonials = [
  {
    name: "Sarah Johnson",
    role: "IGCSE Student",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
    content: "GGK Learning helped me achieve A* grades in Mathematics and Physics. The interactive lessons and practice exams were incredibly helpful!",
    rating: 5,
    subject: "Mathematics & Physics"
  },
  {
    name: "Ahmed Al-Rashid",
    role: "IGCSE Student",
    image: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg",
    content: "The chemistry section is amazing! The visual explanations and step-by-step solutions made complex topics easy to understand.",
    rating: 5,
    subject: "Chemistry"
  },
  {
    name: "Emma Thompson",
    role: "Parent",
    image: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg",
    content: "As a parent, I love being able to track my daughter's progress. The platform provides excellent insights into her learning journey.",
    rating: 5,
    subject: "Parent Portal"
  }
];

// ========================================
// OPTIMIZED SUBJECT CARD
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
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200"
    >
      <div className="h-48 w-full overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
        {imageStatus === 'error' ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
            <span className="text-gray-500 dark:text-gray-400">Failed to load image</span>
          </div>
        ) : (
          <img
            src={currentSrc}
            alt={title}
            className={`w-full h-full object-cover transform hover:scale-105 transition-all duration-300 ${
              imageStatus === 'loaded' ? 'opacity-100' : 'opacity-90'
            }`}
            loading="lazy"
            decoding="async"
          />
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
// SUBJECT SECTION WITH LAZY LOADING
// ========================================
const SubjectSection = ({ category, index }: { category: any; index: number }) => {
  const [isVisible, setIsVisible] = useState(index === 0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (index === 0) {
      const images = category.subjects.map((s: any) => s.image);
      imageCache.preloadImages(images);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
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
// FEATURE CARD
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
// TESTIMONIALS SECTION
// ========================================
function TestimonialsSection() {
  return (
    <div className="py-24 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#8CC63F] mb-4">What Our Students Say</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Real success stories from IGCSE students and parents
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
  );
}

// ========================================
// FOOTER COMPONENT
// ========================================
function Footer() {
  return (
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
              Your comprehensive IGCSE learning platform. Master every subject with interactive lessons, 
              practice exams, and personalized feedback.
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
                  All Subjects
                </a>
              </li>
              <li>
                <a href="/resources" className="text-gray-400 hover:text-white transition-colors">
                  Learning Resources
                </a>
              </li>
              <li>
                <a href="/practice-exams" className="text-gray-400 hover:text-white transition-colors">
                  Practice Exams
                </a>
              </li>
              <li>
                <a href="/progress-tracking" className="text-gray-400 hover:text-white transition-colors">
                  Progress Tracking
                </a>
              </li>
              <li>
                <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Subjects */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Popular Subjects</h3>
            <ul className="space-y-2">
              <li>
                <a href="/subjects/mathematics" className="text-gray-400 hover:text-white transition-colors">
                  Mathematics
                </a>
              </li>
              <li>
                <a href="/subjects/physics" className="text-gray-400 hover:text-white transition-colors">
                  Physics
                </a>
              </li>
              <li>
                <a href="/subjects/chemistry" className="text-gray-400 hover:text-white transition-colors">
                  Chemistry
                </a>
              </li>
              <li>
                <a href="/subjects/biology" className="text-gray-400 hover:text-white transition-colors">
                  Biology
                </a>
              </li>
              <li>
                <a href="/subjects/english-literature" className="text-gray-400 hover:text-white transition-colors">
                  English Literature
                </a>
              </li>
              <li>
                <a href="/subjects/computer-science" className="text-gray-400 hover:text-white transition-colors">
                  Computer Science
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
              © 2025 GGK Learning Platform. All rights reserved.
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
  );
}

// ========================================
// MAIN LANDING PAGE COMPONENT
// ========================================
export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload critical images on mount
  useEffect(() => {
    const preloadCriticalImages = async () => {
      const criticalImages = [
        "https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg",
        ...SUBJECT_CATEGORIES[0].subjects.slice(0, 3).map(s => s.image)
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

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}