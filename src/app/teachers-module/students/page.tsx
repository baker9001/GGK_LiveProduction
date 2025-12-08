import React from 'react';
import { Users, UserPlus, Search, Filter, GraduationCap } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/shared/Card';
import { Badge } from '../../../components/shared/Badge';

const studentTiles = [
  {
    title: 'Student Roster',
    description: 'View class rosters and rich learner profiles with attendance, guardians, and support flags.',
    icon: Users,
    status: { label: 'In Discovery', variant: 'info' as const },
  },
  {
    title: 'Search Students',
    description: 'Quickly find learners by name, cohort, or unique ID and jump straight into their profile.',
    icon: Search,
    status: { label: 'Coming Soon', variant: 'warning' as const },
  },
  {
    title: 'Filter & Sort',
    description: 'Filter by performance bands, attendance trends, or intervention plans to focus support.',
    icon: Filter,
    status: { label: 'Planning', variant: 'default' as const },
  },
  {
    title: 'Student Progress',
    description: 'Track mastery, growth targets, and feedback conversations across every subject.',
    icon: UserPlus,
    status: { label: 'Coming Soon', variant: 'warning' as const },
  },
];

export default function StudentsPage() {
  return (
    <div className="mx-auto max-w-7xl px-20 py-20 space-y-24">
      <PageHeader
        title="Students"
        subtitle="A single hub for understanding every learner. Monitor progress, coordinate interventions, and keep families informed with an interface tuned for the classroom."
      />

      <Card variant="elevated" className="relative overflow-hidden bg-gradient-to-br from-ggk-primary-50 via-ggk-neutral-0 to-ggk-neutral-50">
        <div className="absolute inset-y-0 right-[-15%] w-80 bg-ggk-primary-200/50 blur-3xl" aria-hidden="true" />
        <CardContent className="grid gap-20 md:grid-cols-[1.4fr_1fr] items-start">
          <div className="space-y-10">
            <Badge variant="primary" size="sm" className="uppercase tracking-wide">Student experience refresh</Badge>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">
                Clarity and calm for every roster
              </h2>
              <p className="text-sm leading-relaxed text-ggk-neutral-600 dark:text-ggk-neutral-300">
                Student insights will roll out progressively with the new design system foundations. Expect consistent typography, breathing room, and actionable summaries that help you focus on the next learner conversation.
              </p>
            </div>
            <div className="grid gap-12 sm:grid-cols-2">
              <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/50">
                <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Wellbeing snapshots</h3>
                <p className="mt-4 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
                  Attendance, behaviour, and pastoral notes surface together for quick triage.
                </p>
              </div>
              <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/50">
                <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Family communication</h3>
                <p className="mt-4 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
                  Consistent messaging templates keep guardians in the loop without extra admin.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-12 rounded-ggk-2xl border border-ggk-neutral-200/70 bg-white/90 p-20 shadow-ggk-lg dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/60">
            <div className="flex items-center gap-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ggk-primary-500/10 text-ggk-primary-600">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-500">Current focus</p>
                <h3 className="text-lg font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Learner success rituals</h3>
              </div>
            </div>
            <ul className="space-y-8 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-300">
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Guided check-ins help you capture wellbeing notes at the end of every class.</span>
              </li>
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Design tokens ensure accessibility with dyslexia-friendly typography.</span>
              </li>
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Upcoming analytics will spotlight students who need a quick celebration or intervention.</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader accent>
          <CardTitle className="text-lg">Student workspace roadmap</CardTitle>
          <CardDescription className="mt-6">
            The teacher module now uses the GGK design language. Features below are staged for iterative release with user testing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-16 md:grid-cols-2 xl:grid-cols-4">
            {studentTiles.map((tile) => (
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
