import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Factory, LogOut } from 'lucide-react';

export default function PendingApproval() {
  const { user, isApproved, loading, signOut } = useAuth();
  const { t } = useLanguage();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isApproved) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Factory className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">ManufactERP</h1>
        </div>

        <Card className="border-border shadow-erp-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-xl">{t.auth.pendingApproval}</CardTitle>
            <CardDescription>{t.auth.pendingMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              {t.nav.signOut}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
