import React from 'react';
import { BookOpen, FileText, Video, Target, Library, BookMarked, Layers3, Sparkles } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/shared/Card';
import { Badge } from '../../../components/shared/Badge';

const learningTiles = [
  {
    title: 'Lesson Plans',
    description: 'Build standards-aligned lesson plans with objectives, resources, and formative checks.',
    icon: BookMarked,
    status: { label: 'In Discovery', variant: 'info' as const },
  },
  {
    title: 'Resource Library',
    description: 'Curate school-approved resources with rich tagging and quick sharing to classes.',
    icon: Library,
    status: { label: 'Coming Soon', variant: 'warning' as const },
  },
  {
    title: 'Course Materials',
    description: 'Upload files, readings, and assignments with secure delivery to your students.',
    icon: FileText,
    status: { label: 'Available', variant: 'success' as const },
  },
  {
    title: 'Video Lessons',
    description: 'Stream high-quality instructional videos with watermarking and access controls.',
    icon: Video,
    status: { label: 'Available', variant: 'success' as const },
  },
  {
    title: 'Learning Objectives',
    description: 'Align objectives with assessments, track mastery, and scaffold personalised pathways.',
    icon: Target,
    status: { label: 'Designing', variant: 'default' as const },
  },
  {
    title: 'Curriculum Mapping',
    description: 'Visualise curriculum coverage and identify gaps across terms, grades, and subjects.',
    icon: BookOpen,
    status: { label: 'Planning', variant: 'default' as const },
  },
];

export default function LearningManagementPage() {
  return (
    <div className="mx-auto max-w-7xl px-20 py-20 space-y-24">
      <PageHeader
        title="Learning Management"
        subtitle="The learning experience at your fingertips. Upload resources, craft lessons, and align objectives with a modern interface that mirrors the GGK design system."
      />

      <Card variant="elevated" className="relative overflow-hidden bg-gradient-to-br from-ggk-primary-50 via-ggk-neutral-0 to-ggk-neutral-50">
        <div className="absolute left-[-10%] top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-ggk-primary-200/50 blur-3xl" aria-hidden="true" />
        <CardContent className="grid gap-24 md:grid-cols-[1.3fr_1fr] items-start">
          <div className="space-y-10">
            <Badge variant="primary" size="sm" className="uppercase tracking-wide">Instructional design toolkit</Badge>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">
                Craft lessons with confidence
              </h2>
              <p className="text-sm leading-relaxed text-ggk-neutral-600 dark:text-ggk-neutral-300">
                We rebuilt the experience with our design tokens—expect polished typography, generous spacing, and focus states that keep lesson prep calm and productive.
              </p>
            </div>
            <div className="grid gap-12 sm:grid-cols-2">
              <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/50">
                <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Smarter organisation</h3>
                <p className="mt-4 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
                  Drag-and-drop units, reuse objectives, and keep everything aligned to your scope and sequence.
                </p>
              </div>
              <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/50">
                <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Insightful reflections</h3>
                <p className="mt-4 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
                  Reflect on lesson impact with quick notes, student feedback loops, and analytics tie-ins.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-12 rounded-ggk-2xl border border-ggk-neutral-200/70 bg-white/90 p-20 shadow-ggk-lg dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/60">
            <div className="flex items-center gap-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ggk-primary-500/10 text-ggk-primary-600">
                <Layers3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-500">From plan to practice</p>
                <h3 className="text-lg font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Integrated learning journeys</h3>
              </div>
            </div>
            <ul className="space-y-8 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-300">
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Design tokens keep buttons, tables, and forms consistent with the materials workspace.</span>
              </li>
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Dark mode refinements ensure grading and planning are gentle on your eyes.</span>
              </li>
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Upcoming AI-assisted lesson starters will accelerate prep and differentiation.</span>
              </li>
            </ul>
            <div className="rounded-ggk-xl border border-ggk-primary-200/70 bg-ggk-primary-50/80 p-16 text-sm text-ggk-primary-800 dark:border-ggk-primary-800/60 dark:bg-ggk-primary-900/30 dark:text-ggk-primary-200">
              <div className="flex items-center gap-8">
                <Sparkles className="h-4 w-4" />
                <span>Material uploads, previews, and metadata tagging already use this refreshed foundation.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader accent>
          <CardTitle className="text-lg">Learning workflows</CardTitle>
          <CardDescription className="mt-6">
            Explore what&apos;s live today and what&apos;s launching next as the teacher experience evolves across the GGK design system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-16 md:grid-cols-2 xl:grid-cols-3">
            {learningTiles.map((tile) => (
              <div key={tile.title} className="flex h-full flex-col justify-between rounded-ggk-xl border border-ggk-neutral-200/70 bg-ggk-neutral-50/70 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/40">
                <div className="space-y-8">
                  <div className="flex items-center justify-between gap-12">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ggk-primary-100 text-ggk-primary-700">
                      <tile.icon className="h-5 w-5" />
                    </div>
                    <Badge variant={tile.status.variant} size="sm">{tile.status.label}</Badge>
                  </div>
                  <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">{tile.title}</h3>
                  <p className="text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">{tile.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
