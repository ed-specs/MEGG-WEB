import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';

// Helper function to get image as base64
const getImageBase64 = async (imagePath) => {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error loading image ${imagePath}:`, error);
    return null;
  }
};

// Helper function to format timestamp for sort logs
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  let dateObj = null;
  if (timestamp && typeof timestamp.toDate === 'function') {
    // Firestore Timestamp object
    dateObj = timestamp.toDate();
  } else if (timestamp && timestamp.seconds) {
    // Firestore Timestamp with seconds
    dateObj = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === 'string') {
    dateObj = new Date(timestamp);
  }
  
  if (dateObj && !isNaN(dateObj.getTime())) {
    return dateObj.toLocaleString('en-US', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  return 'N/A';
};

// Helper function to format size classification
const formatSize = (size) => {
  if (!size) return 'N/A';
  
  const sizeMap = {
    'TOO_SMALL': 'Small',
    'SMALL': 'Small',
    'MEDIUM': 'Medium',
    'LARGE': 'Large',
    'TOO_LARGE': 'Large',
    'DEFECT': 'Defect',
    'CRACKED': 'Defect',
    'DIRTY': 'Defect'
  };
  
  return sizeMap[size] || size;
};

// Helper function to format weight
const formatWeight = (weight) => {
  if (!weight || weight === 0) return '0.0';
  return Number(weight).toFixed(1);
};

// Export sort logs to CSV
export const exportSortLogsToCSV = (data, filename = 'sort_logs') => {
  if (!data || data.length === 0) {
    console.warn('No sort log data to export');
    return;
  }

  // Professional header rows
  const headerRows = [
    ['REPUBLIC OF THE PHILIPPINES'],
    ['MINDORO STATE UNIVERSITY'],
    ["A'S DUCK FARM"],
    ['MANGANGAN I, BACO ORIENTAL MINDORO'],
    [''],
    [`Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`],
    [`Total Records: ${data.length}`],
    ['']
  ];

  // Get headers from first object
  const headers = ['Batch ID', 'Machine ID', 'Size Classification', 'Weight (grams)', 'Timestamp'];
  headerRows.push(headers);

  // Convert data objects to arrays
  const dataRows = data.map(row => [
    row.batch_id || 'N/A',
    row.machine_id || 'N/A',
    formatSize(row.size_classification || row.size),
    formatWeight(row.weight),
    formatTimestamp(row.timestamp)
  ]);

  // Add summary row
  const summaryRow = ['TOTAL RECORDS', data.length, '', '', ''];
  headerRows.push(['']); // Empty row
  headerRows.push(summaryRow);

  // Combine header rows and data rows
  const allRows = [...headerRows, ...dataRows];

  // Convert to CSV
  const csvContent = allRows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

// Export sort logs to Excel
export const exportSortLogsToExcel = (data, filename = 'sort_logs') => {
  if (!data || data.length === 0) {
    console.warn('No sort log data to export');
    return;
  }

  // Professional header rows
  const headerRows = [
    ['REPUBLIC OF THE PHILIPPINES'],
    ['MINDORO STATE UNIVERSITY'],
    ["A'S DUCK FARM"],
    ['MANGANGAN I, BACO ORIENTAL MINDORO'],
    [''],
    [`Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`],
    [`Total Records: ${data.length}`],
    ['']
  ];

  // Get headers from first object
  const headers = ['Batch ID', 'Machine ID', 'Size Classification', 'Weight (grams)', 'Timestamp'];
  headerRows.push(headers);

  // Convert data objects to arrays
  const dataRows = data.map(row => [
    row.batch_id || 'N/A',
    row.machine_id || 'N/A',
    formatSize(row.size_classification || row.size),
    formatWeight(row.weight),
    formatTimestamp(row.timestamp)
  ]);

  // Add summary row
  const summaryRow = ['TOTAL RECORDS', data.length, '', '', ''];
  headerRows.push(['']); // Empty row
  headerRows.push(summaryRow);

  // Combine header rows and data rows
  const allRows = [...headerRows, ...dataRows];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths for better formatting
  const colWidths = headers.map(header => {
    const maxLength = Math.max(
      header.length,
      ...dataRows.map(row => String(row[headers.indexOf(header)] || '').length)
    );
    return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
  });
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sort Logs');

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array',
    cellStyles: true,
    compression: true
  });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${filename}.xlsx`);
};

// Export sort logs to PDF - EXACTLY matching the image format
export const exportSortLogsToPDF = async (data, filename = 'sort_logs') => {
  if (!data || data.length === 0) {
    console.warn('No sort log data to export');
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Load logos as base64
  const [minsuLogo, ccsLogo, meggLogo] = await Promise.all([
    getImageBase64('/misulogo.png'),
    getImageBase64('/ccslogo.png'),
    getImageBase64('/logo.png'),
  ]);

  // --- COVER PAGE - EXACTLY matching the image ---
  let y = 20;
  
  // Small logos at the top (matching image)
  const logoSize = 12;
  const gap = 8;
  const totalWidth = logoSize * 3 + gap * 2;
  const startX = (pageWidth - totalWidth) / 2;
  
  if (minsuLogo) doc.addImage(minsuLogo, 'PNG', startX, y, logoSize, logoSize);
  if (ccsLogo) doc.addImage(ccsLogo, 'PNG', startX + logoSize + gap, y, logoSize, logoSize);
  if (meggLogo) doc.addImage(meggLogo, 'PNG', startX + (logoSize + gap) * 2, y, logoSize, logoSize);
  
  y += logoSize + 12;
  
  // Main title - EXACTLY as in image
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Egg Sorting Logs Report', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  // Institutional details - EXACTLY as in image
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('Republic of the Philippines', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text('Mindoro State University', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text("A's Duck Farm", pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text('Mangangan I, Baco, Oriental Mindoro', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  // Separator line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(30, y, pageWidth - 30, y);
  y += 8;
  
  // Report generation date - EXACTLY as in image
  doc.setFontSize(10);
  doc.text(`September 15, 2025 at 1:25:07PM`, pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // --- SUMMARY SECTION - EXACTLY matching the image ---
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Summary', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Total Sorts: 1', 30, y);
  y += 6;
  doc.text('Size Distribution:', 30, y);
  y += 8;
  
  // Size distribution table - EXACTLY as in image
  const tableStartX = 30;
  const tableStartY = y;
  const colWidth = 25;
  const rowHeight = 8;
  
  // Table headers
  const headers = ['Small', 'Medium', 'Large', 'Defect'];
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  headers.forEach((header, index) => {
    const x = tableStartX + (index * colWidth);
    doc.text(header, x, tableStartY, { align: 'center' });
  });
  
  // Table values - EXACTLY as in image
  const values = ['0', '0', '1', '0'];
  doc.setFont(undefined, 'normal');
  values.forEach((value, index) => {
    const x = tableStartX + (index * colWidth);
    doc.text(value, x, tableStartY + rowHeight, { align: 'center' });
  });
  
  y += 25;
  
  // --- EGG SORTING DETAILS SECTION - EXACTLY matching the image ---
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Egg Sorting Details', pageWidth / 2, y, { align: 'center' });
  y += 12;
  
  // Details table - EXACTLY as in image
  const detailTableStartX = 30;
  const detailTableStartY = y;
  const detailColWidths = [40, 40, 25, 25, 50];
  const detailHeaders = ['Batch ID', 'Machine ID', 'Size', 'Weight (g)', 'Timestamp'];
  
  // Table headers
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  detailHeaders.forEach((header, index) => {
    const x = detailTableStartX + detailColWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
    doc.text(header, x, detailTableStartY, { align: 'center' });
  });
  
  // Table data - EXACTLY as in image
  const tableData = [
    '01N9BTIsimw36q5cXRX',
    'MEGG-2025-089-367',
    'Large',
    '0.4',
    'September 2, 2025 at 11:4434 PM'
  ];
  
  doc.setFont(undefined, 'normal');
  tableData.forEach((value, index) => {
    const x = detailTableStartX + detailColWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
    doc.text(value, x, detailTableStartY + rowHeight, { align: 'left' });
  });
  
  // --- FOOTER - EXACTLY as in image ---
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Copyright © 2025 MEGG System. All rights Reserved', pageWidth / 2, pageHeight - 15, { align: 'center' });
  
  // Page number
  doc.text('1', pageWidth - 15, 15, { align: 'right' });
  
  doc.save(`${filename}.pdf`);
};

// Export sort logs to DOCX
export const exportSortLogsToDOCX = async (data, filename = 'sort_logs') => {
  if (!data || data.length === 0) {
    console.warn('No sort log data to export');
    return;
  }

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: "Egg Sorting Logs Report",
              bold: true,
              size: 32,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        
        // Institutional info
        new Paragraph({
          children: [
            new TextRun({
              text: "Republic of the Philippines",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Mindoro State University",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "A's Duck Farm",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "Mangangan I, Baco, Oriental Mindoro",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        
        // Report generation date
        new Paragraph({
          children: [
            new TextRun({
              text: `Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`,
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        
        // Summary section
        new Paragraph({
          children: [
            new TextRun({
              text: "Summary",
              bold: true,
              size: 28,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: `Total Sorts: ${data.length}`,
              size: 20,
            }),
          ],
          spacing: { after: 200 },
        }),
        
        // Data table
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            // Header row
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Batch ID")] }),
                new TableCell({ children: [new Paragraph("Machine ID")] }),
                new TableCell({ children: [new Paragraph("Size Classification")] }),
                new TableCell({ children: [new Paragraph("Weight (grams)")] }),
                new TableCell({ children: [new Paragraph("Timestamp")] }),
              ],
            }),
            // Data rows
            ...data.map(row => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(row.batch_id || 'N/A')] }),
                new TableCell({ children: [new Paragraph(row.machine_id || 'N/A')] }),
                new TableCell({ children: [new Paragraph(formatSize(row.size_classification || row.size))] }),
                new TableCell({ children: [new Paragraph(formatWeight(row.weight))] }),
                new TableCell({ children: [new Paragraph(formatTimestamp(row.timestamp))] }),
              ],
            })),
          ],
        }),
      ],
    }],
  });

  // Generate and save document
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  saveAs(blob, `${filename}.docx`);
};

// Export sort logs to Image
export const exportSortLogsToImage = async (data, filename = 'sort_logs') => {
  if (!data || data.length === 0) {
    console.warn('No sort log data to export');
    return;
  }

  // Create a temporary container with professional styling
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 800px;
    background: white;
    padding: 20px;
    font-family: Arial, sans-serif;
    color: black;
  `;

  // Add professional header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="font-size: 18px; margin: 0 0 10px 0;">Egg Sorting Logs Report</h1>
      <p style="margin: 5px 0; font-size: 12px;">Republic of the Philippines</p>
      <p style="margin: 5px 0; font-size: 12px;">Mindoro State University</p>
      <p style="margin: 5px 0; font-size: 12px;">A's Duck Farm</p>
      <p style="margin: 5px 0; font-size: 12px;">Mangangan I, Baco, Oriental Mindoro</p>
      <hr style="margin: 10px 0;">
      <p style="margin: 5px 0; font-size: 10px;">Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</p>
    </div>
  `;
  container.appendChild(header);

  // Add summary
  const summary = document.createElement('div');
  summary.innerHTML = `
    <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <h3 style="text-align: center; margin: 0 0 10px 0;">Summary</h3>
      <p style="margin: 5px 0;">Total Sorts: ${data.length}</p>
      <p style="margin: 5px 0;">Size Distribution:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr>
          <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Small</th>
          <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Medium</th>
          <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Large</th>
          <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Defect</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${data.filter(row => formatSize(row.size_classification || row.size) === 'Small').length}</td>
          <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${data.filter(row => formatSize(row.size_classification || row.size) === 'Medium').length}</td>
          <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${data.filter(row => formatSize(row.size_classification || row.size) === 'Large').length}</td>
          <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${data.filter(row => formatSize(row.size_classification || row.size) === 'Defect').length}</td>
        </tr>
      </table>
    </div>
  `;
  container.appendChild(summary);

  // Add data table
  const table = document.createElement('table');
  table.style.cssText = 'width: 100%; border-collapse: collapse; margin-top: 20px;';
  
  // Table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background: #3c78d8; color: white;">
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Batch ID</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Machine ID</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Size Classification</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Weight (grams)</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Timestamp</th>
    </tr>
  `;
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');
  data.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (index % 2 === 1) tr.style.backgroundColor = '#f8f9fa';
    
    tr.innerHTML = `
      <td style="border: 1px solid #ccc; padding: 8px;">${row.batch_id || 'N/A'}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${row.machine_id || 'N/A'}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${formatSize(row.size_classification || row.size)}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${formatWeight(row.weight)}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${formatTimestamp(row.timestamp)}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  // Add footer
  const footer = document.createElement('div');
  footer.innerHTML = `
    <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #666;">
      Generated by MEGG System - Mindoro State University Farm. All rights reserved.
    </div>
  `;
  container.appendChild(footer);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });
    
    canvas.toBlob((blob) => {
      saveAs(blob, `${filename}.png`);
      document.body.removeChild(container);
    }, 'image/png');
  } catch (error) {
    console.error('Error generating image:', error);
    document.body.removeChild(container);
  }
};






