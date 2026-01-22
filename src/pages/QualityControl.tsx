import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, CheckCircle, XCircle, ClipboardCheck, AlertCircle } from 'lucide-react';
import {
  useQualityControlRecords,
  useQualityControlCounts,
  useAcceptQualityControl,
  useRejectQualityControl,
  QualityControlRecord,
} from '@/hooks/useQualityControl';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';

const statusColors: Record<string, string> = {
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function QualityControl() {
  const [activeTab, setActiveTab] = useState<'all' | 'under_review' | 'accepted' | 'rejected'>('under_review');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedQc, setSelectedQc] = useState<QualityControlRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [acceptNotes, setAcceptNotes] = useState('');

  const filter = activeTab === 'all' ? undefined : activeTab;
  const { data: records = [], isLoading } = useQualityControlRecords(filter);
  const { data: counts } = useQualityControlCounts();
  const acceptQc = useAcceptQualityControl();
  const rejectQc = useRejectQualityControl();

  const handleAccept = async () => {
    if (!selectedQc) return;
    await acceptQc.mutateAsync({ qcId: selectedQc.id, notes: acceptNotes || undefined });
    setAcceptDialogOpen(false);
    setSelectedQc(null);
    setAcceptNotes('');
  };

  const handleReject = async () => {
    if (!selectedQc || !rejectionReason.trim()) return;
    await rejectQc.mutateAsync({ qcId: selectedQc.id, rejectionReason });
    setRejectDialogOpen(false);
    setSelectedQc(null);
    setRejectionReason('');
  };

  const openAcceptDialog = (qc: QualityControlRecord) => {
    setSelectedQc(qc);
    setAcceptDialogOpen(true);
  };

  const openRejectDialog = (qc: QualityControlRecord) => {
    setSelectedQc(qc);
    setRejectDialogOpen(true);
  };

  const columns: Column<QualityControlRecord>[] = [
    {
      key: 'mo_number',
      header: 'MO Number',
      cell: (qc) => <span className="font-medium">{qc.manufacturing_order?.mo_number || '-'}</span>,
    },
    {
      key: 'product',
      header: 'Product',
      cell: (qc) => (
        <div>
          <p className="font-medium">{qc.product?.name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{qc.product?.sku}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      cell: (qc) => formatNumber(qc.quantity),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (qc) => (
        <Badge className={statusColors[qc.status]}>
          {qc.status.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'inspector',
      header: 'Inspector',
      cell: (qc) => qc.inspector?.full_name || '-',
    },
    {
      key: 'inspected_at',
      header: 'Inspected At',
      cell: (qc) => qc.inspected_at ? format(new Date(qc.inspected_at), 'MMM d, yyyy HH:mm') : '-',
    },
    {
      key: 'created_at',
      header: 'Created',
      cell: (qc) => format(new Date(qc.created_at), 'MMM d, yyyy'),
    },
    {
      key: 'actions',
      header: '',
      cell: (qc) => qc.status === 'under_review' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openAcceptDialog(qc)}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              Accept
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openRejectDialog(qc)} className="text-destructive">
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quality Control"
        description="Review and approve manufactured items before adding to inventory."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Records</span>
          </div>
          <p className="text-2xl font-bold mt-1">{formatNumber(counts?.total || 0)}</p>
        </div>
        <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">Under Review</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-yellow-800 dark:text-yellow-200">
            {formatNumber(counts?.under_review || 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-800 dark:text-green-200">Accepted</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-green-800 dark:text-green-200">
            {formatNumber(counts?.accepted || 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-red-800 dark:text-red-200">Rejected</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-red-800 dark:text-red-200">
            {formatNumber(counts?.rejected || 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="under_review">
            Under Review ({counts?.under_review || 0})
          </TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({counts?.accepted || 0})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts?.rejected || 0})</TabsTrigger>
          <TabsTrigger value="all">All ({counts?.total || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <DataTable
            columns={columns}
            data={records}
            keyExtractor={(qc) => qc.id}
            isLoading={isLoading}
            emptyMessage={`No ${activeTab === 'all' ? '' : activeTab.replace('_', ' ')} QC records.`}
          />
        </TabsContent>
      </Tabs>

      {/* Accept Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Quality Control</DialogTitle>
            <DialogDescription>
              Accept MO {selectedQc?.manufacturing_order?.mo_number} - {selectedQc?.product?.name}?
              This will add {formatNumber(selectedQc?.quantity || 0)} units to inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accept-notes">Notes (optional)</Label>
              <Textarea
                id="accept-notes"
                value={acceptNotes}
                onChange={(e) => setAcceptNotes(e.target.value)}
                placeholder="Quality inspection notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAccept} disabled={acceptQc.isPending}>
              {acceptQc.isPending ? 'Accepting...' : 'Accept & Add to Inventory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quality Control</DialogTitle>
            <DialogDescription>
              Reject MO {selectedQc?.manufacturing_order?.mo_number} - {selectedQc?.product?.name}?
              This will send alerts to Admin and Manufacture Manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Describe the quality issue..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectQc.isPending || !rejectionReason.trim()}
            >
              {rejectQc.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
