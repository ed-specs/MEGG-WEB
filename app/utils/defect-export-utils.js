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

// Helper function to format timestamp for defect logs
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
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  return 'N/A';
};

// Helper function to format confidence score
const formatConfidence = (confidence) => {
  if (!confidence || confidence === 0) return '0.00';
  return Number(confidence).toFixed(2);
};

// Helper function to format defect type
const formatDefectType = (defectType) => {
  if (!defectType) return 'N/A';
  
  const defectMap = {
    'CRACKED': 'Cracked',
    'DIRTY': 'Dirty',
    'BLOOD_SPOT': 'Blood Spot',
    'DOUBLE_YOLK': 'Double Yolk',
    'DEFORMED': 'Deformed',
    'SMALL': 'Small',
    'LARGE': 'Large'
  };
  
  return defectMap[defectType] || defectType;
};

// Export defect logs to CSV
export const exportDefectLogsToCSV = (data, filename = 'defect_logs') => {
  if (!data || data.length === 0) {
    console.warn('No defect log data to export');
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
  const headers = ['Timestamp', 'Batch ID', 'Confidence Score', 'Defect Type', 'Machine ID'];
  headerRows.push(headers);

  // Convert data objects to arrays
  const dataRows = data.map(row => [
    formatTimestamp(row.timestamp),
    row.batch_id || 'N/A',
    formatConfidence(row.confidence_score),
    formatDefectType(row.defect_type),
    row.machine_id || 'N/A'
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

// Export defect logs to Excel
export const exportDefectLogsToExcel = (data, filename = 'defect_logs') => {
  if (!data || data.length === 0) {
    console.warn('No defect log data to export');
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
  const headers = ['Timestamp', 'Batch ID', 'Confidence Score', 'Defect Type', 'Machine ID'];
  headerRows.push(headers);

  // Convert data objects to arrays
  const dataRows = data.map(row => [
    formatTimestamp(row.timestamp),
    row.batch_id || 'N/A',
    formatConfidence(row.confidence_score),
    formatDefectType(row.defect_type),
    row.machine_id || 'N/A'
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
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Defect Logs');

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

// Export defect logs to PDF
export const exportDefectLogsToPDF = async (data, filename = 'defect_logs') => {
  if (!data || data.length === 0) {
    console.warn('No defect log data to export');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Load logos as base64
  const [minsuLogo, ccsLogo, meggLogo] = await Promise.all([
    getImageBase64('/misulogo.png'),
    getImageBase64('/ccslogo.png'),
    getImageBase64('/logo.png'),
  ]);

  // Helper function to add header to each page
  const addPageHeader = (pageNum) => {
    const logoSize = 5; // Further reduced logo size to prevent overlap
    const gap = 3;
    const totalWidth = logoSize * 3 + gap * 2;
    const startX = (pageWidth - totalWidth) / 2;
    
    // Add logos with better positioning
    if (minsuLogo) doc.addImage(minsuLogo, 'PNG', startX, 3, logoSize, logoSize);
    if (ccsLogo) doc.addImage(ccsLogo, 'PNG', startX + logoSize + gap, 3, logoSize, logoSize);
    if (meggLogo) doc.addImage(meggLogo, 'PNG', startX + (logoSize + gap) * 2, 3, logoSize, logoSize);
    
    // Add page number
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${pageNum}`, pageWidth - margin, 8, { align: 'right' });
    
    // Add separator line with better positioning
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  // Helper function to add footer
  const addPageFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Generated by MEGG System - Mindoro State University', pageWidth / 2, pageHeight - 8, { align: 'center' });
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredHeight) => {
    const currentY = doc.internal.getCursor().y;
    if (currentY + requiredHeight > pageHeight - 20) {
      doc.addPage();
      addPageHeader(doc.internal.getNumberOfPages());
      return true;
    }
    return false;
  };

  // --- COVER PAGE ---
  let y = 60; // Further increased starting position to avoid logo overlap
  
  // Main title
  doc.setFontSize(16); // Further reduced font size to prevent overflow
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('DEFECT LOGS REPORT', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Institutional details with better spacing
  doc.setFontSize(12); // Reduced font size
  doc.setFont(undefined, 'normal');
  doc.text('Republic of the Philippines', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text('Mindoro State University', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text("A's Duck Farm", pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.text('Mangangan I, Baco, Oriental Mindoro', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Separator line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;
  
  // Report generation info
  doc.setFontSize(12);
  doc.text(`Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.text(`Total Records: ${data.length}`, pageWidth / 2, y, { align: 'center' });
  y += 25;
  
  // --- SUMMARY SECTION ---
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('SUMMARY', margin, y);
  y += 12;
  
  // Summary box with enhanced styling and proper height
  const summaryBoxHeight = 80; // Increased height to accommodate all content
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y - 5, contentWidth, summaryBoxHeight, 3, 3, 'F');
  doc.setDrawColor(60, 120, 216);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y - 5, contentWidth, summaryBoxHeight, 3, 3);
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Calculate defect distribution
  const defectCounts = {};
  data.forEach(row => {
    const defectType = formatDefectType(row.defect_type);
    defectCounts[defectType] = (defectCounts[defectType] || 0) + 1;
  });
  
  // Summary title
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(60, 120, 216);
  doc.text('Report Summary', margin + 5, y + 8);
  
  // Summary content with better spacing
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Defects Detected: ${data.length}`, margin + 5, y + 18);
  
  // Date range with proper formatting
  const timestamps = data.map(row => {
    if (row.timestamp && typeof row.timestamp.toDate === 'function') {
      return row.timestamp.toDate();
    } else if (row.timestamp && row.timestamp.seconds) {
      return new Date(row.timestamp.seconds * 1000);
    } else if (typeof row.timestamp === 'string') {
      return new Date(row.timestamp);
    }
    return null;
  }).filter(date => date && !isNaN(date.getTime()));
  
  if (timestamps.length > 0) {
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));
    const dateRange = minDate.toLocaleDateString() === maxDate.toLocaleDateString() 
      ? minDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })
      : `${minDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })} - ${maxDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}`;
    doc.text(`Date Range: ${dateRange}`, margin + 5, y + 28);
  }
  
  doc.text('Defect Distribution:', margin + 5, y + 38);
  
  let defectY = y + 48;
  Object.entries(defectCounts).forEach(([defect, count]) => {
    const percentage = ((count / data.length) * 100).toFixed(1);
    doc.text(`• ${defect}: ${count} (${percentage}%)`, margin + 10, defectY);
    defectY += 7; // Increased spacing between defect items
  });
  
  y += summaryBoxHeight + 20;
  
  // --- DEFECT LOG DETAILS SECTION ---
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('DEFECT LOG DETAILS', margin, y);
  y += 15;
  
  // Table configuration with much better spacing and proper column widths
  const colWidths = [60, 40, 30, 35, 35]; // Significantly increased column widths to prevent overflow
  const rowHeight = 18; // Increased row height for better readability
  const headerHeight = 14; // Increased header height
  
  // Table headers with enhanced styling
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(60, 120, 216);
  
  const headers = ['Timestamp', 'Batch ID', 'Confidence', 'Defect Type', 'Machine ID'];
  let headerX = margin;
  
  headers.forEach((header, index) => {
    // Header cell with rounded corners
    doc.roundedRect(headerX, y, colWidths[index], headerHeight, 2, 2, 'F');
    doc.text(header, headerX + colWidths[index] / 2, y + headerHeight / 2 + 2, { align: 'center' });
    headerX += colWidths[index];
  });
  
  y += headerHeight;
  
  // Table data with pagination
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  
  let currentPage = 1;
  let rowsPerPage = Math.floor((pageHeight - y - 30) / rowHeight);
  
  data.forEach((row, index) => {
    // Check if we need a new page
    if (index > 0 && index % rowsPerPage === 0) {
      currentPage++;
      doc.addPage();
      addPageHeader(currentPage);
      y = 20; // Reset Y position for new page (adjusted for smaller header)
      
      // Redraw table headers with enhanced styling
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(60, 120, 216);
      
      headerX = margin;
      headers.forEach((header, colIndex) => {
        doc.roundedRect(headerX, y, colWidths[colIndex], headerHeight, 2, 2, 'F');
        doc.text(header, headerX + colWidths[colIndex] / 2, y + headerHeight / 2 + 2, { align: 'center' });
        headerX += colWidths[colIndex];
      });
      
      y += headerHeight;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
    }
    
    // Alternating row colors
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      headerX = margin;
      colWidths.forEach(width => {
        doc.rect(headerX, y, width, rowHeight, 'F');
        headerX += width;
      });
    }
    
    // Cell borders
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    headerX = margin;
    colWidths.forEach(width => {
      doc.rect(headerX, y, width, rowHeight);
      headerX += width;
    });
    
    // Cell content with proper text handling and centering
    const rowData = [
      formatTimestamp(row.timestamp),
      row.batch_id || 'N/A',
      formatConfidence(row.confidence_score),
      formatDefectType(row.defect_type),
      row.machine_id || 'N/A'
    ];
    
    headerX = margin;
    rowData.forEach((value, colIndex) => {
      const cellWidth = colWidths[colIndex];
      const cellX = headerX;
      const padding = 4;
      const textY = y + (rowHeight / 2) + 2; // Center vertically
      
      // Handle text wrapping for timestamp column (column 0)
      if (colIndex === 0) {
        const lines = doc.splitTextToSize(value, cellWidth - (padding * 2));
        const lineHeight = 4;
        const startY = textY - ((lines.length - 1) * lineHeight / 2);
        lines.forEach((line, lineIndex) => {
          const currentTextY = startY + (lineIndex * lineHeight);
          doc.text(line, cellX + padding, currentTextY);
        });
      } else {
        // For other columns, center the text and handle overflow properly
        const maxTextWidth = cellWidth - (padding * 2);
        const textWidth = doc.getTextWidth(value);
        
        if (textWidth > maxTextWidth) {
          // Truncate with ellipsis for long text
          let truncatedValue = value;
          while (doc.getTextWidth(truncatedValue + '...') > maxTextWidth && truncatedValue.length > 0) {
            truncatedValue = truncatedValue.substring(0, truncatedValue.length - 1);
          }
          truncatedValue += '...';
          const textX = cellX + (cellWidth - doc.getTextWidth(truncatedValue)) / 2;
          doc.text(truncatedValue, textX, textY);
        } else {
          // Center the text properly both horizontally and vertically
          const textX = cellX + (cellWidth - textWidth) / 2;
          doc.text(value, textX, textY);
        }
      }
      
      headerX += cellWidth;
    });
    
    y += rowHeight;
  });
  
  // Add footer to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter();
  }
  
  // Add header to first page
  doc.setPage(1);
  addPageHeader(1);
  
  doc.save(`${filename}.pdf`);
};

// Export defect logs to DOCX
export const exportDefectLogsToDOCX = async (data, filename = 'defect_logs') => {
  if (!data || data.length === 0) {
    console.warn('No defect log data to export');
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
              text: "Defect Logs Report",
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
              text: `Total Defects: ${data.length}`,
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
                new TableCell({ children: [new Paragraph("Timestamp")] }),
                new TableCell({ children: [new Paragraph("Batch ID")] }),
                new TableCell({ children: [new Paragraph("Confidence Score")] }),
                new TableCell({ children: [new Paragraph("Defect Type")] }),
                new TableCell({ children: [new Paragraph("Machine ID")] }),
              ],
            }),
            // Data rows
            ...data.map(row => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(formatTimestamp(row.timestamp))] }),
                new TableCell({ children: [new Paragraph(row.batch_id || 'N/A')] }),
                new TableCell({ children: [new Paragraph(formatConfidence(row.confidence_score))] }),
                new TableCell({ children: [new Paragraph(formatDefectType(row.defect_type))] }),
                new TableCell({ children: [new Paragraph(row.machine_id || 'N/A')] }),
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

// Export defect logs to Image
export const exportDefectLogsToImage = async (data, filename = 'defect_logs') => {
  if (!data || data.length === 0) {
    console.warn('No defect log data to export');
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
      <h1 style="font-size: 18px; margin: 0 0 10px 0;">Defect Logs Report</h1>
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
      <p style="margin: 5px 0;">Total Defects: ${data.length}</p>
      <p style="margin: 5px 0;">Defect Distribution:</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        ${Object.entries(data.reduce((acc, row) => {
          const defectType = formatDefectType(row.defect_type);
          acc[defectType] = (acc[defectType] || 0) + 1;
          return acc;
        }, {})).map(([defect, count]) => 
          `<li>${defect}: ${count} (${((count / data.length) * 100).toFixed(1)}%)</li>`
        ).join('')}
      </ul>
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
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Timestamp</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Batch ID</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Confidence Score</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Defect Type</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Machine ID</th>
    </tr>
  `;
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');
  data.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (index % 2 === 1) tr.style.backgroundColor = '#f8f9fa';
    
    tr.innerHTML = `
      <td style="border: 1px solid #ccc; padding: 8px;">${formatTimestamp(row.timestamp)}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${row.batch_id || 'N/A'}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${formatConfidence(row.confidence_score)}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${formatDefectType(row.defect_type)}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${row.machine_id || 'N/A'}</td>
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

