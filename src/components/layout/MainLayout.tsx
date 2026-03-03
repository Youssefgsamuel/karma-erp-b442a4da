import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { isRTL } = useLanguage();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className={cn(
        'flex-1 transition-all duration-300',
        isRTL ? 'mr-64' : 'ml-64'
      )}>
        <div className="container mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
