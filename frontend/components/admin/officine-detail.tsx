'use client';

import { FileText, UserPlus } from 'lucide-react';

import { OfficineInfoForm } from '@/components/admin/officine-info-form';
import { OfficineTeam } from '@/components/admin/officine-team';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PharmacyDetail } from '@/lib/auth';

const TAB_LIST =
  'h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0';
const TAB_TRIGGER =
  'flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 text-sm text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';

export function OfficineDetail({ pharmacy }: { pharmacy: PharmacyDetail }) {
  return (
    <Tabs defaultValue="informations" className="gap-6">
      <TabsList className={TAB_LIST}>
        <TabsTrigger value="informations" className={TAB_TRIGGER}>
          <FileText className="h-4 w-4" />
          Informations
        </TabsTrigger>
        <TabsTrigger value="equipes" className={TAB_TRIGGER}>
          <UserPlus className="h-4 w-4" />
          Équipes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="informations" className="pt-2">
        <OfficineInfoForm pharmacy={pharmacy} />
      </TabsContent>

      <TabsContent value="equipes" className="pt-2">
        <OfficineTeam
          pharmacyId={pharmacy.pharmacy_id}
          preparateurs={pharmacy.preparateurs}
        />
      </TabsContent>
    </Tabs>
  );
}
