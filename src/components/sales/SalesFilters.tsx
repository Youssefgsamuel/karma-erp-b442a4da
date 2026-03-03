import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';

interface SalesFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  monthFilter: string;
  onMonthChange: (value: string) => void;
}

export function SalesFilters({ statusFilter, onStatusChange, monthFilter, onMonthChange }: SalesFiltersProps) {
  const { t } = useLanguage();

  const STATUSES = [
    { value: 'all', label: t.statusFilter.allStatuses },
    { value: 'pending', label: t.sales.pending },
    { value: 'processing', label: t.sales.processing },
    { value: 'shipped', label: t.sales.shipped },
    { value: 'delivered', label: t.sales.delivered },
    { value: 'cancelled', label: t.sales.cancelled },
    { value: 'confirmed', label: t.sales.confirmed },
    { value: 'ready_to_deliver', label: t.sales.readyToShip },
  ];

  const MONTHS = [
    { value: 'all', label: t.months.allMonths },
    { value: '0', label: t.months.january },
    { value: '1', label: t.months.february },
    { value: '2', label: t.months.march },
    { value: '3', label: t.months.april },
    { value: '4', label: t.months.may },
    { value: '5', label: t.months.june },
    { value: '6', label: t.months.july },
    { value: '7', label: t.months.august },
    { value: '8', label: t.months.september },
    { value: '9', label: t.months.october },
    { value: '10', label: t.months.november },
    { value: '11', label: t.months.december },
  ];

  return (
    <div className="flex gap-4 mb-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t.status}</Label>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(status => (
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t.salaries.month}</Label>
        <Select value={monthFilter} onValueChange={onMonthChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(month => (
              <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
