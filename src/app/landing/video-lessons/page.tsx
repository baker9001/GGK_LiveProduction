import React from 'react';
import { PlayCircle, Sparkles, Lightbulb } from 'lucide-react';
import { SimpleInfoPage } from '../common/SimpleInfoPage';

const VideoLessonsPage = () => (
  <SimpleInfoPage
    title="Video Lessons Library"
    description="Stream short, exam-aligned explanations created by experienced Cambridge and Edexcel teachers."
    icon={PlayCircle}
    status="In development"
    highlights={[
      { title: 'Curriculum aligned', description: 'Organised by syllabus statements for every subject.' },
      { title: 'Bite-sized episodes', description: '5-10 minute walkthroughs with downloadable summaries.' }
    ]}
    primaryLink={{ label: 'Explore sample topics', to: '/subjects' }}
    secondaryLink={{ label: 'Get notified at launch', to: '/contact' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
        <Lightbulb className="w-5 h-5 text-[#8CC63F]" />
        <span>Concept-first explanations with exam tips</span>
      </div>
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
        <Sparkles className="w-5 h-5 text-[#8CC63F]" />
        <span>Animated diagrams that make tricky topics stick</span>
      </div>
    </div>
  </SimpleInfoPage>
);

export default VideoLessonsPage;
