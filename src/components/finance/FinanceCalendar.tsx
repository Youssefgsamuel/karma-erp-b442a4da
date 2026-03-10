import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  date: string;
  type: 'revenue' | 'payment' | 'salary';
  label: string;
  amount: number;
}

interface FinanceCalendarProps {
  revenueEvents: CalendarEvent[];
  paymentEvents: CalendarEvent[];
  salaryEvents: CalendarEvent[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function FinanceCalendar({ revenueEvents, paymentEvents, salaryEvents }: FinanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // Jan 2026

  const allEvents = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    [...revenueEvents, ...paymentEvents, ...salaryEvents].forEach(ev => {
      const key = ev.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [revenueEvents, paymentEvents, salaryEvents]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const monthTotals = useMemo(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    let totalRevenue = 0;
    let totalPayments = 0;
    let totalSalaries = 0;

    Object.entries(allEvents).forEach(([date, events]) => {
      if (date.startsWith(monthKey)) {
        events.forEach(ev => {
          if (ev.type === 'revenue') totalRevenue += ev.amount;
          else if (ev.type === 'payment') totalPayments += ev.amount;
          else if (ev.type === 'salary') totalSalaries += ev.amount;
        });
      }
    });

    return { totalRevenue, totalPayments, totalSalaries };
  }, [currentMonth, allEvents]);

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 border-l-4 border-l-green-500">
          <p className="text-xs text-muted-foreground">Expected Revenue</p>
          <p className="text-sm font-bold text-green-600">{formatCurrency(monthTotals.totalRevenue)}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-red-500">
          <p className="text-xs text-muted-foreground">Supplier Payments</p>
          <p className="text-sm font-bold text-red-600">{formatCurrency(monthTotals.totalPayments)}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-orange-500">
          <p className="text-xs text-muted-foreground">Salaries</p>
          <p className="text-sm font-bold text-orange-600">{formatCurrency(monthTotals.totalSalaries)}</p>
        </Card>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-muted">
          {DAY_NAMES.map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {/* Padding for start of month */}
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] border-t border-r bg-muted/30" />
          ))}
          {/* Actual days */}
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const events = allEvents[key] || [];
            const hasRevenue = events.some(e => e.type === 'revenue');
            const hasPayment = events.some(e => e.type === 'payment');
            const hasSalary = events.some(e => e.type === 'salary');

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[80px] border-t border-r p-1 relative",
                  isToday(day) && "bg-accent/30"
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  isToday(day) && "text-primary font-bold"
                )}>
                  {format(day, 'd')}
                </span>
                <div className="mt-1 space-y-0.5">
                  {events.slice(0, 3).map((ev, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-[10px] leading-tight rounded px-1 py-0.5 truncate",
                        ev.type === 'revenue' && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
                        ev.type === 'payment' && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                        ev.type === 'salary' && "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
                      )}
                      title={`${ev.label}: ${formatCurrency(ev.amount)}`}
                    >
                      {ev.type === 'revenue' ? '↓' : '↑'} {formatCurrency(ev.amount)}
                    </div>
                  ))}
                  {events.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{events.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-800" />
          <span>Revenue (incoming)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-800" />
          <span>Supplier Payment (outgoing)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-800" />
          <span>Salary (outgoing)</span>
        </div>
      </div>
    </div>
  );
}
