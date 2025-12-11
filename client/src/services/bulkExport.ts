import JSZip from 'jszip';

export interface EnrolleeExportData {
  id: number;
  name: string;
  surname: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  instagram?: string | null;
  faceImageUrl?: string | null;
  enrolledAt: Date;
}

export async function exportEnrolleesWithPhotos(enrollees: EnrolleeExportData[]): Promise<void> {
  try {
    const zip = new JSZip();
    
    // Create CSV content
    const csvContent = generateCSV(enrollees);
    zip.file('enrollees.csv', csvContent);
    
    // Create photos folder
    const photosFolder = zip.folder('photos');
    if (!photosFolder) throw new Error('Failed to create photos folder');
    
    // Add photos to ZIP
    for (const enrollee of enrollees) {
      if (enrollee.faceImageUrl) {
        try {
          // Convert data URL to blob
          const response = await fetch(enrollee.faceImageUrl);
          const blob = await response.blob();
          const fileName = `${enrollee.id}_${enrollee.name}_${enrollee.surname}.jpg`;
          photosFolder.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to add photo for enrollee ${enrollee.id}:`, error);
        }
      }
    }
    
    // Generate and download ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enrollees_backup_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

function generateCSV(enrollees: EnrolleeExportData[]): string {
  const headers = [
    'ID',
    'Name',
    'Surname',
    'Email',
    'Phone',
    'Address',
    'Instagram',
    'Photo Filename',
    'Enrolled At',
  ];
  
  const rows = enrollees.map(e => [
    e.id.toString(),
    escapeCsvField(e.name),
    escapeCsvField(e.surname),
    escapeCsvField(e.email || ''),
    escapeCsvField(e.phone || ''),
    escapeCsvField(e.address || ''),
    escapeCsvField(e.instagram || ''),
    e.faceImageUrl ? `${e.id}_${e.name}_${e.surname}.jpg` : '',
    new Date(e.enrolledAt).toISOString(),
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
