import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Factory, LogOut } from 'lucide-react';

export default function PendingApproval() {
  const { user, isApproved, loading, signOut } = useAuth();

  if (loading) {
    return null;
  }

  // If no user, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If approved, redirect to dashboard
  if (isApproved) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
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
            <CardTitle className="text-xl">Pending Approval</CardTitle>
            <CardDescription>
              Your account is awaiting administrator approval
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Thank you for signing up! An administrator will review and approve your account shortly.
              You'll be able to access the system once your account is approved.
            </p>
            
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Signed in as:</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          If you need immediate access, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
