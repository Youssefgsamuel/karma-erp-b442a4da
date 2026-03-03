import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

// Auto-translate known page titles
const titleMap: Record<string, { titleKey: string; descKey: string }> = {
  'Products': { titleKey: 'products.title', descKey: 'products.description' },
  'Raw Materials': { titleKey: 'rawMaterials.title', descKey: 'rawMaterials.description' },
  'Inventory': { titleKey: 'inventory.title', descKey: 'inventory.description' },
  'Manufacturing Orders': { titleKey: 'manufacturing.title', descKey: 'manufacturing.description' },
  'Quality Control': { titleKey: 'qc.title', descKey: 'qc.description' },
  'Suppliers': { titleKey: 'suppliers.title', descKey: 'suppliers.description' },
  'Quotations': { titleKey: 'quotations.title', descKey: 'quotations.description' },
  'Sales Orders': { titleKey: 'sales.title', descKey: 'sales.description' },
  'Finance': { titleKey: 'finance.title', descKey: 'finance.description' },
  'Salaries & Payroll': { titleKey: 'salaries.title', descKey: 'salaries.description' },
  'User Management': { titleKey: 'users.title', descKey: 'users.description' },
  'Settings': { titleKey: 'settings.title', descKey: 'settings.description' },
};

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  let displayTitle = title;
  let displayDescription = description;

  try {
    const { t, language } = useLanguage();
    if (language !== 'en') {
      const mapping = titleMap[title];
      if (mapping) {
        const translatedTitle = getNestedValue(t, mapping.titleKey);
        const translatedDesc = getNestedValue(t, mapping.descKey);
        if (translatedTitle) displayTitle = translatedTitle;
        if (translatedDesc && description) displayDescription = translatedDesc;
      }
    }
  } catch {
    // LanguageContext not available, use original strings
  }

  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{displayTitle}</h1>
        {displayDescription && (
          <p className="text-muted-foreground">{displayDescription}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
