import React from 'react';
import { Navigation } from '../../../components/shared/Navigation';
import { 
  Atom, 
  FlaskConical, 
  Microscope, 
  Globe, 
  BookOpen, 
  Calculator, 
  Computer, 
  Languages, 
  Palette,
  Music,
  Trophy,
  Users,
  Building,
  TrendingUp,
  MapPin,
  Clock,
  Award,
  CheckCircle,
  Star
} from 'lucide-react';

const subjectCategories = [
  {
    title: "Sciences",
    description: "Comprehensive scientific education with practical laboratory work",
    icon: <Atom className="h-8 w-8" />,
    color: "from-blue-500 to-cyan-500",
    subjects: [
      {
        name: "Physics",
        code: "0625",
        description: "Explore the fundamental principles of matter, energy, and their interactions. Covers mechanics, waves, electricity, magnetism, and atomic physics.",
        keyTopics: ["Mechanics", "Thermal Physics", "Waves", "Electricity & Magnetism", "Atomic Physics"],
        icon: <Atom className="h-5 w-5" />
      },
      {
        name: "Chemistry",
        code: "0620",
        description: "Study the composition, structure, and properties of matter. Includes organic chemistry, inorganic chemistry, and physical chemistry.",
        keyTopics: ["Atomic Structure", "Chemical Bonding", "Organic Chemistry", "Acids & Bases", "Metals"],
        icon: <FlaskConical className="h-5 w-5" />
      },
      {
        name: "Biology",
        code: "0610",
        description: "Investigate living organisms and life processes. Covers cell biology, genetics, ecology, and human physiology.",
        keyTopics: ["Cell Biology", "Human Physiology", "Plants", "Ecology", "Genetics & Evolution"],
        icon: <Microscope className="h-5 w-5" />
      },
      {
        name: "Co-ordinated Sciences (Double Award)",
        code: "0654",
        description: "Integrated approach to Physics, Chemistry, and Biology for students seeking broad scientific knowledge.",
        keyTopics: ["Integrated Sciences", "Practical Skills", "Scientific Method", "Environmental Science"],
        icon: <Star className="h-5 w-5" />
      }
    ]
  },
  {
    title: "Mathematics & Computing",
    description: "Develop analytical thinking and problem-solving skills",
    icon: <Calculator className="h-8 w-8" />,
    color: "from-green-500 to-emerald-500",
    subjects: [
      {
        name: "Mathematics",
        code: "0580",
        description: "Core mathematical concepts including number, algebra, geometry, and statistics. Essential foundation for further studies.",
        keyTopics: ["Number", "Algebra", "Geometry", "Mensuration", "Trigonometry", "Statistics", "Probability"],
        icon: <Calculator className="h-5 w-5" />
      },
      {
        name: "Additional Mathematics",
        code: "0606",
        description: "Advanced mathematical concepts for students planning to pursue mathematics, sciences, or engineering at A-Level.",
        keyTopics: ["Functions", "Quadratic Functions", "Equations", "Inequalities", "Indices & Surds", "Factors", "Simultaneous Equations"],
        icon: <TrendingUp className="h-5 w-5" />
      },
      {
        name: "Computer Science",
        code: "0478",
        description: "Programming, computational thinking, and understanding of computer systems and networks.",
        keyTopics: ["Programming", "Algorithms", "Data Representation", "Hardware & Software", "Networks"],
        icon: <Computer className="h-5 w-5" />
      }
    ]
  },
  {
    title: "Languages",
    description: "Develop communication skills in multiple languages",
    icon: <Languages className="h-8 w-8" />,
    color: "from-purple-500 to-pink-500",
    subjects: [
      {
        name: "English First Language",
        code: "0500",
        description: "Develop advanced reading, writing, speaking, and listening skills in English for native or near-native speakers.",
        keyTopics: ["Reading Comprehension", "Creative Writing", "Summary Writing", "Language Analysis", "Speaking & Listening"],
        icon: <BookOpen className="h-5 w-5" />
      },
      {
        name: "English as a Second Language",
        code: "0510/0511",
        description: "Build English language proficiency for non-native speakers across all four language skills.",
        keyTopics: ["Listening Skills", "Reading Skills", "Writing Skills", "Speaking Skills", "Grammar & Vocabulary"],
        icon: <Languages className="h-5 w-5" />
      },
      {
        name: "Arabic First Language",
        code: "0508",
        description: "Comprehensive Arabic language study including literature, composition, and linguistic analysis.",
        keyTopics: ["Arabic Literature", "Composition", "Grammar", "Poetry Analysis", "Modern Arabic"],
        icon: <BookOpen className="h-5 w-5" />
      },
      {
        name: "French Foreign Language",
        code: "0520",
        description: "Develop practical communication skills in French for everyday situations and academic contexts.",
        keyTopics: ["Conversation", "Reading Comprehension", "Written Expression", "Grammar", "Cultural Studies"],
        icon: <Globe className="h-5 w-5" />
      }
    ]
  },
  {
    title: "Humanities & Social Sciences",
    description: "Understand human society, culture, and historical development",
    icon: <Globe className="h-8 w-8" />,
    color: "from-orange-500 to-red-500",
    subjects: [
      {
        name: "History",
        code: "0470",
        description: "Study significant historical events, developments, and their impact on the modern world.",
        keyTopics: ["19th Century History", "20th Century History", "International Relations", "Social & Economic History"],
        icon: <Clock className="h-5 w-5" />
      },
      {
        name: "Geography",
        code: "0460",
        description: "Explore physical and human geography, environmental issues, and geographical skills.",
        keyTopics: ["Physical Geography", "Human Geography", "Environmental Management", "Geographical Skills"],
        icon: <MapPin className="h-5 w-5" />
      },
      {
        name: "Economics",
        code: "0455",
        description: "Understand economic principles, market systems, and global economic issues.",
        keyTopics: ["Basic Economic Problem", "Allocation of Resources", "Microeconomic Decision Makers", "Government & Macroeconomy"],
        icon: <TrendingUp className="h-5 w-5" />
      },
      {
        name: "Business Studies",
        code: "0450",
        description: "Learn about business operations, entrepreneurship, and commercial decision-making.",
        keyTopics: ["Business Activity", "People in Business", "Marketing", "Operations Management", "Financial Information"],
        icon: <Building className="h-5 w-5" />
      },
      {
        name: "Sociology",
        code: "0495",
        description: "Examine social structures, institutions, and processes that shape human behavior and society.",
        keyTopics: ["Family", "Education", "Crime & Deviance", "Media", "Social Stratification"],
        icon: <Users className="h-5 w-5" />
      }
    ]
  },
  {
    title: "Creative & Practical Arts",
    description: "Express creativity and develop practical skills",
    icon: <Palette className="h-8 w-8" />,
    color: "from-pink-500 to-rose-500",
    subjects: [
      {
        name: "Art & Design",
        code: "0400",
        description: "Develop artistic skills, creativity, and visual communication through various media and techniques.",
        keyTopics: ["Drawing", "Painting", "Printmaking", "3D Design", "Photography", "Digital Art"],
        icon: <Palette className="h-5 w-5" />
      },
      {
        name: "Music",
        code: "0410",
        description: "Study music theory, composition, and performance across various musical styles and traditions.",
        keyTopics: ["Music Theory", "Composition", "Performance", "Listening & Analysis", "World Music"],
        icon: <Music className="h-5 w-5" />
      },
      {
        name: "Physical Education",
        code: "0413",
        description: "Develop physical skills, understanding of sports science, and knowledge of health and fitness.",
        keyTopics: ["Practical Performance", "Exercise Physiology", "Skill Acquisition", "Sports Psychology", "Health & Fitness"],
        icon: <Trophy className="h-5 w-5" />
      }
    ]
  }
];

const features = [
  {
    icon: <Award className="h-6 w-6" />,
    title: "Cambridge Certified",
    description: "All our IGCSE courses are aligned with Cambridge International curriculum standards"
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Expert Teachers",
    description: "Qualified educators with extensive IGCSE teaching experience and subject expertise"
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Comprehensive Resources",
    description: "Access to textbooks, past papers, practical equipment, and digital learning materials"
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Proven Results",
    description: "Consistent high achievement rates in IGCSE examinations with excellent university placement"
  }
];

export default function SubjectsPage() {
  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed relative"
      style={{
        backgroundImage: 'url("https://images.pexels.com/photos/5212329/pexels-photo-5212329.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop")'
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-900/75 to-gray-900/85" />
      
      {/* Content */}
      <div className="relative z-10">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="text-center mb-16 backdrop-blur-sm bg-white/10 dark:bg-gray-900/20 rounded-2xl p-8 border border-white/20">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              IGCSE Subjects We Offer
            </h1>
            <p className="text-xl text-gray-100 max-w-3xl mx-auto leading-relaxed">
              Our comprehensive IGCSE curriculum is designed to provide students with a broad, balanced education 
              that develops critical thinking, creativity, and practical skills. All subjects follow the Cambridge 
              International IGCSE syllabus, ensuring global recognition and excellent preparation for A-Levels.
            </p>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="w-12 h-12 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-[#8CC63F]">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Subject Categories */}
          <div className="space-y-12">
            {subjectCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Category Header */}
                <div className={`bg-gradient-to-r ${category.color} p-6 text-white`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                      {category.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{category.title}</h2>
                      <p className="text-white/90">{category.description}</p>
                    </div>
                  </div>
                </div>

                {/* Subjects Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {category.subjects.map((subject, subjectIndex) => (
                      <div key={subjectIndex} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-[#8CC63F]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <div className="text-[#8CC63F]">
                              {subject.icon}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {subject.name}
                              </h3>
                              <span className="px-2 py-1 bg-[#8CC63F]/10 text-[#8CC63F] text-xs font-medium rounded-full">
                                {subject.code}
                              </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                              {subject.description}
                            </p>
                            
                            {/* Key Topics */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Key Topics:
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {subject.keyTopics.map((topic, topicIndex) => (
                                  <span 
                                    key={topicIndex}
                                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Assessment Information */}
          <div className="mt-16 bg-gradient-to-r from-[#8CC63F]/10 to-[#7AB635]/10 dark:from-[#8CC63F]/20 dark:to-[#7AB635]/20 rounded-xl p-8 border border-[#8CC63F]/30 dark:border-[#8CC63F]/40">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                IGCSE Assessment & Certification
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Cambridge IGCSE qualifications are recognized by universities and employers worldwide. 
                Our assessment approach ensures students are well-prepared for examinations and future academic success.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#8CC63F]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-[#8CC63F]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Continuous Assessment
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Regular coursework, practical assessments, and mock examinations to track progress
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-[#8CC63F]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-[#8CC63F]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  External Examinations
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Cambridge International examinations held in May/June and October/November sessions
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-[#8CC63F]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8 text-[#8CC63F]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Global Recognition
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Internationally recognized qualifications accepted by top universities worldwide
                </p>
              </div>
            </div>
          </div>

          {/* Subject Selection Guidance */}
          <div className="mt-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Subject Selection Guidance
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Core Subjects (Recommended for All Students)
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-[#8CC63F]" />
                    English First Language or English as a Second Language
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-[#8CC63F]" />
                    Mathematics
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-[#8CC63F]" />
                    At least two Sciences
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-[#8CC63F]" />
                    One Humanities subject
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Popular Subject Combinations
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">Science Track</h4>
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      Mathematics, Physics, Chemistry, Biology, English, Additional Mathematics
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100 text-sm">Business Track</h4>
                    <p className="text-green-700 dark:text-green-300 text-xs">
                      Mathematics, Economics, Business Studies, English, Geography
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100 text-sm">Humanities Track</h4>
                    <p className="text-purple-700 dark:text-purple-300 text-xs">
                      English, History, Geography, Sociology, Foreign Language
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <section className="mt-16 text-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Begin Your IGCSE Journey?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Our academic advisors are here to help you choose the right combination of subjects 
              based on your interests, strengths, and future career aspirations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-[#8CC63F] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#7AB635] transition-colors">
                Schedule Consultation
              </button>
              <button className="border-2 border-[#8CC63F] text-[#8CC63F] px-8 py-3 rounded-lg font-semibold hover:bg-[#8CC63F]/10 transition-colors">
                Download Prospectus
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}