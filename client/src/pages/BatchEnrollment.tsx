import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Upload, Download, FileArchive, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import Papa from 'papaparse';

interface EnrollmentRecord {
  filename: string;
  name: string;
  surname: string;
  email?: string;
  phone?: string;
  address?: string;
  instagram?: string;
}

interface ProcessResult {
  filename: string;
  name: string;
  success: boolean;
  error?: string;
}

export default function BatchEnrollment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const enrollMutation = trpc.enrollees.enroll.useMutation();

  const downloadTemplate = () => {
    const csvContent = 'filename,name,surname,email,phone,address,instagram\n' +
      'john_doe.jpg,John,Doe,john@example.com,123-456-7890,123 Main St,@johndoe\n' +
      'jane_smith.jpg,Jane,Smith,jane@example.com,098-765-4321,456 Oak Ave,@janesmith';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'batch_enrollment_template.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const processZipFile = async (file: File) => {
    try {
      setIsProcessing(true);
      setResults([]);
      setProgress(0);

      const zip = await JSZip.loadAsync(file);
      
      // Find CSV file
      const csvFile = Object.keys(zip.files).find(name => name.endsWith('.csv'));
      if (!csvFile) {
        toast.error('No CSV file found in ZIP');
        setIsProcessing(false);
        return;
      }

      // Parse CSV
      const csvContent = await zip.files[csvFile].async('string');
      const parsed = Papa.parse<EnrollmentRecord>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        toast.error('CSV parsing error');
        setIsProcessing(false);
        return;
      }

      const records = parsed.data;
      setTotalRecords(records.length);
      const processResults: ProcessResult[] = [];

      // Process each record
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Find image file
          const imageFile = zip.files[record.filename];
          if (!imageFile) {
            processResults.push({
              filename: record.filename,
              name: `${record.name} ${record.surname}`,
              success: false,
              error: 'Image file not found in ZIP',
            });
            continue;
          }

          // Read image as base64
          const imageBlob = await imageFile.async('blob');
          const imageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageBlob);
          });

          // Enroll
          // TODO: Extract face embedding from uploaded photo using MediaPipe
          // For now, use empty array as placeholder
          await enrollMutation.mutateAsync({
            name: record.name,
            surname: record.surname,
            email: record.email || '',
            phone: record.phone || '',
            address: record.address || '',
            instagram: record.instagram || '',
            imageBase64,
            faceEmbedding: [], // Placeholder - needs proper implementation
            enrollmentMethod: 'photo',
          });

          processResults.push({
            filename: record.filename,
            name: `${record.name} ${record.surname}`,
            success: true,
          });
        } catch (error) {
          processResults.push({
            filename: record.filename,
            name: `${record.name} ${record.surname}`,
            success: false,
            error: error instanceof Error ? error.message : 'Enrollment failed',
          });
        }

        setProgress(((i + 1) / records.length) * 100);
        setResults([...processResults]);
      }

      const successCount = processResults.filter(r => r.success).length;
      toast.success(`Batch enrollment complete: ${successCount}/${records.length} successful`);
      setIsProcessing(false);
    } catch (error) {
      toast.error(`Failed to process ZIP file: ${error}`);
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast.error('Please upload a ZIP file');
        return;
      }
      processZipFile(file);
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Batch Enrollment</h1>
        <p className="text-muted-foreground">Upload multiple enrollees at once using a ZIP file</p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Batch Enrollment</CardTitle>
          <CardDescription>Follow these steps to enroll multiple people at once</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Download the CSV template</p>
                <p className="text-sm text-muted-foreground">
                  Click the button below to download a template CSV file
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Fill in the enrollment data</p>
                <p className="text-sm text-muted-foreground">
                  Add rows for each person with their photo filename and details
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Create a ZIP file</p>
                <p className="text-sm text-muted-foreground">
                  Compress the CSV file and all photo files into a single ZIP archive
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                4
              </div>
              <div>
                <p className="font-medium">Upload and process</p>
                <p className="text-sm text-muted-foreground">
                  Upload the ZIP file and wait for the batch enrollment to complete
                </p>
              </div>
            </div>
          </div>

          <Button onClick={downloadTemplate} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload ZIP File</CardTitle>
          <CardDescription>Select a ZIP file containing photos and CSV mapping</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <FileArchive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Drop your ZIP file here</p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
            <label htmlFor="zip-upload">
              <Button disabled={isProcessing} asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Select ZIP File
                </span>
              </Button>
              <Input
                id="zip-upload"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>Processing...</CardTitle>
            <CardDescription>
              {Math.round(progress)}% complete ({results.length}/{totalRecords} processed)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Results</CardTitle>
            <CardDescription>
              {results.filter(r => r.success).length} successful, {results.filter(r => !r.success).length} failed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-muted-foreground">{result.filename}</p>
                      {result.error && (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                  {isProcessing && index === results.length - 1 && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
