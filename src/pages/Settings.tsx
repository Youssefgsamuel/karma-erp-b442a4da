import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t.settings.title}
        description={t.settings.description}
      />

      <div className="space-y-6 max-w-2xl">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-base font-semibold">{t.settings.language}</Label>
                <p className="text-sm text-muted-foreground">{t.settings.languageDescription}</p>
              </div>
              <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'ar')}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t.settings.english}</SelectItem>
                  <SelectItem value="ar">{t.settings.arabic}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
