import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ColumnMapping {
  key: string;
  label: string;
  required: boolean;
  type?: 'string' | 'number' | 'boolean';
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
}

interface ExcelUploadProps {
  title: string;
  columns: ColumnMapping[];
  templateFileName: string;
  onUpload: (data: Record<string, unknown>[]) => Promise<void>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExcelUpload({
  title,
  columns,
  templateFileName,
  onUpload,
  isOpen,
  onOpenChange,
}: ExcelUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const downloadTemplate = () => {
    const headers = columns.map((col) => col.label);
    const sampleRow = columns.map((col) => {
      if (col.type === 'number') return 0;
      if (col.type === 'boolean') return 'FALSE';
      return `Sample ${col.label}`;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${templateFileName}.xlsx`);
    
    toast({
      title: 'Template Downloaded',
      description: 'Fill in the template and upload it back.',
    });
  };

  const validateData = (data: Record<string, unknown>[]): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    data.forEach((row, rowIndex) => {
      columns.forEach((col) => {
        const value = row[col.label];
        
        // Required field check
        if (col.required && (value === undefined || value === null || value === '')) {
          validationErrors.push({
            row: rowIndex + 2, // +2 for header and 1-based indexing
            column: col.label,
            message: `${col.label} is required`,
          });
        }

        // Type check
        if (value !== undefined && value !== null && value !== '') {
          if (col.type === 'number' && isNaN(Number(value))) {
            validationErrors.push({
              row: rowIndex + 2,
              column: col.label,
              message: `${col.label} must be a number`,
            });
          }
        }
      });
    });

    return validationErrors;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        if (jsonData.length === 0) {
          setErrors([{ row: 0, column: '', message: 'No data found in the file' }]);
          setParsedData([]);
          return;
        }

        // Transform data to match our column keys
        const transformedData = jsonData.map((row) => {
          const newRow: Record<string, unknown> = {};
          columns.forEach((col) => {
            const value = row[col.label];
            if (col.type === 'number' && value !== undefined && value !== '') {
              newRow[col.key] = Number(value);
            } else if (col.type === 'boolean') {
              newRow[col.key] = value === 'TRUE' || value === true || value === 1;
            } else {
              newRow[col.key] = value;
            }
          });
          return newRow;
        });

        const validationErrors = validateData(jsonData);
        setErrors(validationErrors);
        setParsedData(transformedData);
      } catch (error) {
        setErrors([{ row: 0, column: '', message: 'Failed to parse file. Ensure it is a valid Excel file.' }]);
        setParsedData([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (errors.length > 0) return;

    setIsUploading(true);
    try {
      await onUpload(parsedData);
      toast({
        title: 'Upload Successful',
        description: `${parsedData.length} records imported successfully.`,
      });
      onOpenChange(false);
      resetState();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'An error occurred during upload.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setParsedData([]);
    setErrors([]);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Download the template, fill it with your data, and upload it back.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Step 1: Download Template</p>
              <p className="text-sm text-muted-foreground">Get the Excel template with required columns</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="rounded-lg border p-4">
            <p className="font-medium mb-2">Step 2: Upload Filled Template</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">
                {fileName || 'Click to select file'}
              </span>
              <span className="text-xs text-muted-foreground">
                Supports .xlsx and .xls files
              </span>
            </label>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Validation Errors ({errors.length})</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {errors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="text-sm">
                      {error.row > 0 ? `Row ${error.row}: ` : ''}{error.message}
                    </div>
                  ))}
                  {errors.length > 10 && (
                    <p className="text-sm font-medium">...and {errors.length - 10} more errors</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Preview */}
          {parsedData.length > 0 && errors.length === 0 && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                <p className="font-medium">Ready to Import</p>
                <p className="text-sm">{parsedData.length} valid records found</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Required Fields Info */}
          <div className="text-sm">
            <p className="font-medium mb-2">Required Fields:</p>
            <div className="flex flex-wrap gap-2">
              {columns.filter(c => c.required).map((col) => (
                <Badge key={col.key} variant="outline">{col.label}</Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={parsedData.length === 0 || errors.length > 0 || isUploading}
          >
            {isUploading ? 'Importing...' : `Import ${parsedData.length} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
