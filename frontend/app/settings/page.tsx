import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'

export default function SettingsPage() {
  return (
    <DashboardLayout
      title="Parametres"
      description="Configurez les preferences de l'application"
    >
      <div className="max-w-2xl space-y-3">
        {/* Appearance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Apparence</CardTitle>
            <CardDescription>
              Choisissez le theme de l&apos;interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Theme</Label>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Gerez vos preferences de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertes critiques</Label>
                <p className="text-xs text-muted-foreground">
                  Recevoir une notification pour les produits critiques
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Rapport quotidien</Label>
                <p className="text-xs text-muted-foreground">
                  Recevoir un resume quotidien par email
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications push</Label>
                <p className="text-xs text-muted-foreground">
                  Activer les notifications dans le navigateur
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Seuils de Risque</CardTitle>
            <CardDescription>
              Definissez les seuils de score pour chaque niveau de risque
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="critical">Seuil Critique</Label>
                <Input
                  id="critical"
                  type="number"
                  defaultValue="85"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="high">Seuil Eleve</Label>
                <Input
                  id="high"
                  type="number"
                  defaultValue="65"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="medium">Seuil Moyen</Label>
                <Input
                  id="medium"
                  type="number"
                  defaultValue="35"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="low">Seuil Faible</Label>
                <Input
                  id="low"
                  type="number"
                  defaultValue="0"
                  min="0"
                  max="100"
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Email de Contact</CardTitle>
            <CardDescription>
              Adresse email pour recevoir les alertes et rapports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                defaultValue="admin@entreprise.fr"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button>Enregistrer les modifications</Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
