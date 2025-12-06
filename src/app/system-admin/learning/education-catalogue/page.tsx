import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../../components/shared/Tabs";
import { LoadingSpinner } from '../../../../components/shared/LoadingSpinner';

// Import your new tables
import RegionsTable from './regions/RegionsTable';
import ProgramsTable from './programs/ProgramsTable';
import ProvidersTable from './providers/ProvidersTable';

// Lazy load all tab components
const SubjectsTable = lazy(() => import('./components/SubjectsTable'));
const UnitsTable = lazy(() => import('./components/UnitsTable'));
const TopicsTable = lazy(() => import('./components/TopicsTable'));
const SubtopicsTable = lazy(() => import('./components/SubtopicsTable'));
const ObjectivesTable = lazy(() => import('./components/ObjectivesTable'));
const ConceptsTable = lazy(() => import('./components/ConceptsTable'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner
      size="sm"
      message="Loading..."
      animation="hybrid"
      showLogo={false}
    />
  </div>
);

export default function EducationCataloguePage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get tab from URL query parameter or default to 'regions'
  const getQueryParam = () => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'regions';
  };
  
  const [activeTab, setActiveTab] = useState(getQueryParam());
  
  // Update URL when tab changes
  const syncQueryParam = (value: string) => {
    setActiveTab(value);
    navigate(`?tab=${value}`, { replace: true });
  };
  
  // Update tab state if URL changes
  useEffect(() => {
    setActiveTab(getQueryParam());
  }, [location.search]);

  // Redirect to regions tab if no tab is specified
  useEffect(() => {
    if (!location.search) {
      navigate('?tab=regions', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Education Catalogue</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage educational content structure</p>
      </div>

      <Tabs 
        defaultValue={activeTab} 
        value={activeTab} 
        onValueChange={syncQueryParam} 
        className="space-y-6"
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="subtopics">Subtopics</TabsTrigger>
          <TabsTrigger value="objectives">Objectives</TabsTrigger>
          <TabsTrigger value="concepts">Concepts</TabsTrigger>
        </TabsList>

        <TabsContent value="regions">
          <RegionsTable />
        </TabsContent>

        <TabsContent value="programs">
          <ProgramsTable />
        </TabsContent>

        <TabsContent value="providers">
          <ProvidersTable />
        </TabsContent>

        <TabsContent value="subjects">
          <Suspense fallback={<LoadingFallback />}>
            <SubjectsTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="units">
          <Suspense fallback={<LoadingFallback />}>
            <UnitsTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="topics">
          <Suspense fallback={<LoadingFallback />}>
            <TopicsTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="subtopics">
          <Suspense fallback={<LoadingFallback />}>
            <SubtopicsTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="objectives">
          <Suspense fallback={<LoadingFallback />}>
            <ObjectivesTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="concepts">
          <Suspense fallback={<LoadingFallback />}>
            <ConceptsTable />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}