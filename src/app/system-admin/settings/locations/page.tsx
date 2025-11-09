import React from 'react';
import ModulePageShell from '../../../../components/layout/ModulePageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/shared/Tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/shared/Card';
import RegionsTab from './tabs/RegionsTab';
import CountriesTab from './tabs/CountriesTab';
import CitiesTab from './tabs/CitiesTab';

export default function LocationsPage() {
  return (
    <ModulePageShell
      title="Locations"
      subtitle="Manage the global region, country, and city taxonomy powering tenant assignments."
    >
      <Card variant="outlined" className="bg-card/95 backdrop-blur-sm">
        <CardHeader accent>
          <CardTitle>Location Library</CardTitle>
          <CardDescription>Use the tabs to maintain every geographic layer in one cohesive workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-24">
          <Tabs defaultValue="regions" className="space-y-16">
            <TabsList className="bg-card-elevated border border-filter rounded-ggk-full p-6 gap-8 shadow-theme-soft">
              <TabsTrigger value="regions">Regions</TabsTrigger>
              <TabsTrigger value="countries">Countries</TabsTrigger>
              <TabsTrigger value="cities">Cities</TabsTrigger>
            </TabsList>

            <TabsContent value="regions" className="mt-12">
              <RegionsTab />
            </TabsContent>

            <TabsContent value="countries" className="mt-12">
              <CountriesTab />
            </TabsContent>

            <TabsContent value="cities" className="mt-12">
              <CitiesTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </ModulePageShell>
  );
}