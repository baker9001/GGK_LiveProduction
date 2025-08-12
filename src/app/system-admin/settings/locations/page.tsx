import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/shared/Tabs';
import RegionsTab from './tabs/RegionsTab';
import CountriesTab from './tabs/CountriesTab';
import CitiesTab from './tabs/CitiesTab';

export default function LocationsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locations</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage geographical locations across your organization</p>
      </div>

      <Tabs defaultValue="regions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="cities">Cities</TabsTrigger>
        </TabsList>

        <TabsContent value="regions">
          <RegionsTab />
        </TabsContent>

        <TabsContent value="countries">
          <CountriesTab />
        </TabsContent>

        <TabsContent value="cities">
          <CitiesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}