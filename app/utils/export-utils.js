import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun } from 'docx'
import { saveAs } from 'file-saver'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebaseConfig'

// Utility function to load image with CORS handling
const loadImageWithFallback = async (imageUrl) => {
  try {
    // First try with our proxy API
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const blob = await response.blob()
    return { success: true, blob, type: blob.type }
  } catch (error) {
    console.warn('Proxy failed, trying direct fetch:', error)
    
    // Fallback: Try direct fetch
    try {
      const response = await fetch(imageUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'image/*',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const blob = await response.blob()
      return { success: true, blob, type: blob.type }
    } catch (fetchError) {
      console.warn('Direct fetch failed, trying Image object:', fetchError)
      
      // Final fallback: Try using Image object with canvas
      try {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
            
            canvas.toBlob((blob) => {
              resolve({ success: true, blob, type: blob.type })
            }, 'image/jpeg', 0.8)
          }
          
          img.onerror = () => {
            reject(new Error('Image loading failed'))
          }
          
          // Add timestamp to bypass cache
          img.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
        })
      } catch (fallbackError) {
        console.warn('All methods failed:', fallbackError)
        return { success: false, error: fallbackError }
      }
    }
  }
}

// Helper to fetch image and convert to base64
async function getImageBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Export to CSV
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Create header rows
  const headerRows = [
    ['REPUBLIC OF THE PHILIPPINES'],
    ['MINDORO STATE UNIVERSITY'],
    ["A'S DUCK FARM"],
    ['MANGANGAN I, BACO ORIENTAL MINDORO'],
    [''], // Empty row for spacing
    [''], // Empty row for spacing
    [`Generated on: ${new Date().toLocaleString()}`],
    [''] // Empty row for spacing
  ]

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content with header rows
  const csvContent = [
    ...headerRows.map(row => row.join(',')),
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        if (value === 0) return '0'
        // Handle values that need quotes (contain commas, quotes, or newlines)
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value || ''
      }).join(',')
    )
  ].join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export to Excel
export const exportToExcel = (data, filename, sheetName = 'Data') => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Create header rows
  const headerRows = [
    ['Republic of the Philippines'],
    ['Mindoro State University'],
    ["A's Duck Farm"],
    ['Mangangan I, Baco Oriental Mindoro'],
    [''], // Empty row for spacing

    [''], // Empty row for spacing
    [`Generated on: ${new Date().toLocaleString()}`],
    [''] // Empty row for spacing
  ];

  // Get headers from first object
  const headers = Object.keys(data[0]);
  headerRows.push(headers); // Add column headers as a row

  // Convert data objects to arrays
  const dataRows = data.map(row => headers.map(h => row[h]));

  // Combine header rows and data rows
  const allRows = [...headerRows, ...dataRows];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(allRows);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

// Export to PDF
export const exportToPDF = async (data, filename, title, columns) => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
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

  // --- COVER PAGE ---
  let y = 30;
  const logoSize = 36;
  const gap = 24;
  const totalWidth = logoSize * 3 + gap * 2;
  const startX = (pageWidth - totalWidth) / 2;
  doc.addImage(minsuLogo, 'PNG', startX, y, logoSize, logoSize);
  doc.addImage(ccsLogo, 'PNG', startX + logoSize + gap, y, logoSize, logoSize);
  doc.addImage(meggLogo, 'PNG', startX + (logoSize + gap) * 2, y, logoSize, logoSize);
  y += logoSize + 12;
  doc.setFontSize(20); doc.setFont(undefined, 'bold');
  doc.text('Defect Logs Report', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.5);
  doc.line(30, y, pageWidth - 30, y); // thin line below title
  y += 8;
  doc.setFontSize(14); doc.setFont(undefined, 'normal');
  doc.text('Republic of the Philippines', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.text('Mindoro State University', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.text("A's Duck Farm", pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.text('Mangangan I, Baco Oriental Mindoro', pageWidth / 2, y, { align: 'center' });
  y += 12;
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
  y += 16;
  // --- Summary Box ---
  const totalLogs = data.length;
  const timestamps = data.map(row => new Date(row.timestamp));
  const minDate = timestamps.length ? new Date(Math.min(...timestamps)) : null;
  const maxDate = timestamps.length ? new Date(Math.max(...timestamps)) : null;
  const defectCounts = {};
  data.forEach(row => {
    const type = row.defect_type || row.defectType || 'Unknown';
    defectCounts[type] = (defectCounts[type] || 0) + 1;
  });
  doc.setFillColor(230, 240, 255);
  doc.roundedRect(25, y, pageWidth - 50, 32 + Object.keys(defectCounts).length * 7, 4, 4, 'F');
  doc.setFontSize(13); doc.setFont(undefined, 'bold');
  doc.text('Summary', pageWidth / 2, y + 9, { align: 'center' });
  doc.setFontSize(11); doc.setFont(undefined, 'normal');
  doc.text(`Total Logs: ${totalLogs}`, 30, y + 18);
  if (minDate && maxDate) {
    doc.text(`Date Range: ${minDate.toLocaleString()} - ${maxDate.toLocaleString()}`, 30, y + 26);
  }
  doc.text('Defect Counts:', 30, y + 34);
  let defectY = y + 41;
  Object.entries(defectCounts).forEach(([type, count]) => {
    doc.text(`- ${type}: ${count}`, 36, defectY);
    defectY += 7;
  });
  // --- End of cover page ---
  addFooter(doc, pageWidth, pageHeight);
  doc.addPage();

  // --- HEADER FOR SUBSEQUENT PAGES ---
  function addHeader(doc, pageWidth) {
    const logoSize = 16;
    const gap = 10;
    const totalWidth = logoSize * 3 + gap * 2;
    const startX = (pageWidth - totalWidth) / 2;
    let y = 10;
    doc.addImage(minsuLogo, 'PNG', startX, y, logoSize, logoSize);
    doc.addImage(ccsLogo, 'PNG', startX + logoSize + gap, y, logoSize, logoSize);
    doc.addImage(meggLogo, 'PNG', startX + (logoSize + gap) * 2, y, logoSize, logoSize);
    y += logoSize + 2;
    doc.setFontSize(13); doc.setFont(undefined, 'bold');
    doc.text('Defect Logs Report', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.5);
    doc.line(30, y, pageWidth - 30, y);
    return y + 6;
  }

  // --- TABLE ---
  // Only show these columns:
  const displayColumns = [
    { key: 'timestamp', header: 'Timestamp', align: 'left', width: 54 },
    { key: 'batch_id', header: 'Batch ID', align: 'left', width: 44 },
    { key: 'confidence_score', header: 'Confidence', align: 'right', width: 28 },
    { key: 'defect_type', header: 'Defect Type', align: 'left', width: 28 },
    { key: 'machine_id', header: 'Machine ID', align: 'left', width: 44 },
  ];
  const tableMarginX = (pageWidth - displayColumns.reduce((a, b) => a + b.width, 0)) / 2;
  let yPosition = addHeader(doc, pageWidth) + 20; // extra whitespace above table
  const rowHeight = 14;
  const fontSize = 11;

  // Section title
  doc.setFontSize(13); doc.setFont(undefined, 'bold');
  doc.text('Defect Log Details', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Table header
  doc.setFont(undefined, 'bold');
  doc.setFontSize(fontSize + 2);
  doc.setTextColor(255, 255, 255);
  doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3);
  let x = tableMarginX;
  displayColumns.forEach((col) => {
    doc.setFillColor(60, 120, 216);
    doc.rect(x, yPosition, col.width, rowHeight, 'F');
    doc.rect(x, yPosition, col.width, rowHeight);
    doc.text(col.header, x + col.width / 2, yPosition + rowHeight / 2 + 1, { align: 'center', baseline: 'middle' });
    x += col.width;
  });
  yPosition += rowHeight;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);

  // Table rows
  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (yPosition > pageHeight - 80) {
      addFooter(doc, pageWidth, pageHeight);
      doc.addPage();
      yPosition = addHeader(doc, pageWidth) + 20;
      // Section title
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('Defect Log Details', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      // Redraw table header
      doc.setFont(undefined, 'bold');
      doc.setFontSize(fontSize + 2);
      doc.setTextColor(255, 255, 255);
      doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3);
      x = tableMarginX;
      displayColumns.forEach((col) => {
        doc.setFillColor(60, 120, 216);
        doc.rect(x, yPosition, col.width, rowHeight, 'F');
        doc.rect(x, yPosition, col.width, rowHeight);
        doc.text(col.header, x + col.width / 2, yPosition + rowHeight / 2 + 1, { align: 'center', baseline: 'middle' });
        x += col.width;
      });
      yPosition += rowHeight;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
    }
    // Alternating row color
    x = tableMarginX;
    displayColumns.forEach((col) => {
      if (rowIdx % 2 === 1) {
        doc.setFillColor(245, 248, 255);
        doc.rect(x, yPosition, col.width, rowHeight, 'F');
      }
      doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3);
      doc.rect(x, yPosition, col.width, rowHeight);
      x += col.width;
    });
    // Cell content with wrapping
    x = tableMarginX;
    displayColumns.forEach((col) => {
      let value = row[col.key] === 0 ? '0' : (row[col.key] || '');
      // Format timestamp as local string, always single line
      if (col.key === 'timestamp') {
        let dateObj = null;
        if (row.timestamp && typeof row.timestamp.toDate === 'function') {
          // Firestore Timestamp object
          dateObj = row.timestamp.toDate();
        } else if (typeof row.timestamp === 'string') {
          dateObj = new Date(row.timestamp);
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          value = dateObj.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        } else {
          value = '';
        }
      }
      let text = String(value);
      // Text wrapping for all except timestamp (which should always be single line)
      const paddingX = 3;
      const maxWidth = col.width - 2 * paddingX;
      let lines = (col.key === 'timestamp') ? [text] : doc.splitTextToSize(text, maxWidth);
      // Vertically center
      let textY = yPosition + rowHeight / 2 + 1 - (lines.length - 1) * (fontSize / 2.5);
      lines.forEach((line, i) => {
        let textX = col.align === 'right' ? x + col.width - paddingX : x + paddingX;
        doc.text(line, textX, textY + i * (fontSize + 1) * 0.6, { align: col.align, baseline: 'middle' });
      });
      x += col.width;
    });
    yPosition += rowHeight;
    // --- IMAGE ---
    if (row.image_url && row.image_url !== 'N/A' && row.image_url.startsWith('http')) {
      if (yPosition > pageHeight - 80) {
        addFooter(doc, pageWidth, pageHeight);
        doc.addPage();
        yPosition = addHeader(doc, pageWidth) + 20;
      }
      yPosition += 12;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text('Captured Image:', pageWidth / 2, yPosition + 8, { align: 'center' });
      try {
        const imageResult = await loadImageWithFallback(row.image_url);
        if (imageResult.success) {
          const arrayBuffer = await imageResult.blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          const imageType = imageResult.type || 'image/jpeg';
          const format = imageType.includes('png') ? 'PNG' : 'JPEG';
          const imgWidth = 80;
          const imgHeight = 48;
          const imgX = (pageWidth - imgWidth) / 2;
          doc.setDrawColor(120, 120, 120);
          doc.rect(imgX - 2, yPosition + 12 - 2, imgWidth + 4, imgHeight + 4);
          doc.addImage(
            `data:${imageType};base64,${base64}`,
            format,
            imgX,
            yPosition + 12,
            imgWidth,
            imgHeight
          );
          // Show image URL in small gray text
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          let urlText = row.image_url;
          if (urlText.length > 60) urlText = urlText.slice(0, 57) + '...';
          doc.text(urlText, pageWidth / 2, yPosition + 12 + imgHeight + 7, { align: 'center' });
        } else {
          throw new Error('Image loading failed');
        }
        yPosition += 70;
      } catch (error) {
        doc.setFontSize(8);
        doc.setTextColor(200, 0, 0);
        doc.text('Image: [Failed to load]', pageWidth / 2, yPosition + 18, { align: 'center' });
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);
        doc.text(`URL: ${row.image_url}`, pageWidth / 2, yPosition + 25, { align: 'center' });
        yPosition += 30;
      }
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
    }
    yPosition += 8;
  }

  // --- SUMMARY ROW ---
  x = tableMarginX;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(fontSize);
  doc.setFillColor(230, 240, 255);
  displayColumns.forEach((col, colIndex) => {
    doc.rect(x, yPosition, col.width, rowHeight, 'F');
    doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.3);
    doc.rect(x, yPosition, col.width, rowHeight);
    if (colIndex === 0) {
      doc.text('Total Logs:', x + 4, yPosition + rowHeight / 2 + 1, { align: 'left', baseline: 'middle' });
    }
    if (colIndex === 1) {
      doc.text(String(data.length), x + 4, yPosition + rowHeight / 2 + 1, { align: 'left', baseline: 'middle' });
    }
    x += col.width;
  });
  yPosition += rowHeight;

  // --- FOOTER (last page) ---
  addFooter(doc, pageWidth, pageHeight);
  doc.save(`${filename}.pdf`);
}

// Helper to add page number and footer
function addFooter(doc, pageWidth, pageHeight) {
  const pageCount = doc.internal.getNumberOfPages();
  const page = doc.internal.getCurrentPageInfo().pageNumber;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Page ${page} of ${pageCount}`, pageWidth - 40, pageHeight - 10);
  doc.text('Generated by MEGG System', 20, pageHeight - 10);
  doc.setTextColor(0, 0, 0);
}

// Export to Image (PNG)
export const exportToImage = async (elementRef, filename) => {
  if (!elementRef || !elementRef.current) {
    console.warn('No element reference provided')
    return
  }

  try {
    // Create a temporary container with header
    const tempContainer = document.createElement('div')
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      background: white;
      padding: 20px;
      font-family: Arial, sans-serif;
    `
    
    // Add institutional header
    const header = document.createElement('div')
    header.style.cssText = `
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    `
    
    header.innerHTML = `
      <h1 style="font-size: 18px; font-weight: bold; margin: 0 0 5px 0; color: #1f2937;">REPUBLIC OF THE PHILIPPINES</h1>
      <h2 style="font-size: 16px; font-weight: bold; margin: 0 0 5px 0; color: #374151;">MINDORO STATE UNIVERSITY</h2>
      <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 5px 0; color: #4b5563;">A'S DUCK FARM</h3>
      <p style="font-size: 12px; margin: 0; color: #6b7280;">MANGANGAN I, BACO ORIENTAL MINDORO</p>
    `
    
    tempContainer.appendChild(header)
    
    // Clone the original element
    const clonedElement = elementRef.current.cloneNode(true)
    tempContainer.appendChild(clonedElement)
    
    // Add to DOM temporarily
    document.body.appendChild(tempContainer)
    
    // Capture the entire container
    const canvas = await html2canvas(tempContainer, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })
    
    // Remove temporary container
    document.body.removeChild(tempContainer)
    
    canvas.toBlob((blob) => {
      saveAs(blob, `${filename}.png`)
    }, 'image/png')
  } catch (error) {
    console.error('Error exporting to image:', error)
  }
}

// Specific export functions for each component

// Daily Summary Export
export const exportDailySummary = (data, format) => {
  const { periodTotal, dailyAverage, peakTime, percentageChange, hourlyDistribution, defectCounts, lastUpdated } = data
  
  const exportData = [
    {
      metric: 'Period Total',
      value: periodTotal,
      description: 'Total defects in the period'
    },
    {
      metric: 'Daily Average',
      value: dailyAverage.toFixed(1),
      description: 'Average defects per day'
    },
    {
      metric: 'Peak Time',
      value: peakTime,
      description: 'Time with highest activity'
    },
    {
      metric: 'Percentage Change',
      value: `${percentageChange}%`,
      description: 'Change from previous period'
    },
    {
      metric: 'Last Updated',
      value: lastUpdated ? lastUpdated.toLocaleString() : 'N/A',
      description: 'Last data update time'
    }
  ]

  const defectData = Object.entries(defectCounts).map(([type, count]) => ({
    defectType: type.charAt(0).toUpperCase() + type.slice(1),
    count: count,
    percentage: ((count / periodTotal) * 100).toFixed(1) + '%'
  }))

  const hourlyData = hourlyDistribution.map(hour => ({
    hour: hour.hour,
    total: hour.total,
    dirty: hour.dirty,
    cracked: hour.cracked,
    good: hour.good
  }))

  const columns = [
    { key: 'metric', header: 'Metric' },
    { key: 'value', header: 'Value' },
    { key: 'description', header: 'Description' }
  ]

  const filename = `daily-summary-${new Date().toISOString().split('T')[0]}`
  const title = 'Daily Summary Report'

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename)
      break
    case 'excel':
      exportToExcel(exportData, filename, 'Daily Summary')
      break
    case 'pdf':
      exportToPDF(exportData, filename, title, columns)
      break
    default:
      console.warn('Unknown export format:', format)
  }
}

// Statistics Export
export const exportStatistics = (data, format) => {
  const { totalInspections, defectCounts, defectPercentages, mostCommonDefect, inspectionRate, inspectionTrend, lastUpdated } = data

  const exportData = [
    {
      metric: 'Total Inspections',
      value: totalInspections,
      description: 'Total items inspected'
    },
    {
      metric: 'Most Common Defect',
      value: mostCommonDefect ? mostCommonDefect.type : 'N/A',
      description: 'Highest occurring defect type'
    },
    {
      metric: 'Inspection Rate',
      value: `${inspectionRate}/hr`,
      description: 'Average items per hour'
    },
    {
      metric: 'Inspection Trend',
      value: `${inspectionTrend}%`,
      description: 'Change from previous period'
    },
    {
      metric: 'Last Updated',
      value: lastUpdated,
      description: 'Last data update time'
    }
  ]

  const defectData = Object.entries(defectCounts).map(([type, count]) => ({
    defectType: type.charAt(0).toUpperCase() + type.slice(1),
    count: count,
    percentage: defectPercentages[type] ? `${defectPercentages[type]}%` : '0%'
  }))

  const columns = [
    { key: 'metric', header: 'Metric' },
    { key: 'value', header: 'Value' },
    { key: 'description', header: 'Description' }
  ]

  const filename = `statistics-${new Date().toISOString().split('T')[0]}`
  const title = 'Statistics Report'

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename)
      break
    case 'excel':
      exportToExcel(exportData, filename, 'Statistics')
      break
    case 'pdf':
      exportToPDF(exportData, filename, title, columns)
      break
    default:
      console.warn('Unknown export format:', format)
  }
}

// Defect Log Export
export const exportDefectLogs = async (data, format) => {
  if (!data || data.length === 0) {
    console.warn('No defect logs to export')
    return
  }

  const exportData = data.map(log => ({
    timestamp: log.timestamp
      ? (typeof log.timestamp === 'string'
          ? new Date(log.timestamp).toLocaleString()
          : log.timestamp.seconds
            ? new Date(log.timestamp.seconds * 1000).toLocaleString()
            : 'N/A')
      : 'N/A',
    batch_id: log.batch_id || log.batchNumber || 'Unknown',
    confidence_score: typeof log.confidence_score === 'number'
      ? log.confidence_score
      : (typeof log.confidence === 'number' ? log.confidence : 'N/A'),
    defect_type: log.defect_type || log.defectType || 'Unknown',
    image_id: log.image_id || log.imageId || 'N/A',
    image_url: log.imageUrl || 'N/A',
    machine_id: log.machine_id || log.machineId || 'N/A'
  }));

  const columns = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'batch_id', header: 'Batch ID' },
    { key: 'confidence_score', header: 'Confidence Score' },
    { key: 'defect_type', header: 'Defect Type' },
    { key: 'image_id', header: 'Image ID' },
    { key: 'image_url', header: 'Image URL' },
    { key: 'machine_id', header: 'Machine ID' }
  ];

  const filename = `defect-logs-${new Date().toISOString().split('T')[0]}`;
  const title = 'Defect Logs Report';

  console.log("Export Data:", data);

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename);
      break;
    case 'excel':
      exportToExcel(exportData, filename, 'Defect Logs');
      break;
    case 'pdf':
      await exportToPDF(exportData, filename, title, columns);
      break;
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.');
      break;
    default:
      console.warn('Unknown export format:', format, exportData);
  }
}

// Batch Review Export
export const exportBatchReview = (data, format) => {
  if (!data || data.length === 0) {
    console.warn('No batch data to export')
    return
  }

  const exportData = data.map(batch => ({
    batchNumber: batch.batchNumber || batch.batch_number || 'Unknown',
    totalDefects: typeof (batch.totalDefects ?? batch.total_count) === 'number'
      ? (batch.totalDefects ?? batch.total_count)
      : 0,
    uniqueDefectTypes: (() => {
      if (typeof batch.uniqueDefectTypes === 'number') return batch.uniqueDefectTypes;
      if (batch.defectCounts)
        return Object.keys(batch.defectCounts).filter(key => key !== "good" && batch.defectCounts[key] > 0).length;
      if (batch.defect_counts)
        return Object.keys(batch.defect_counts).filter(key => key !== "good" && batch.defect_counts[key] > 0).length;
      return 0;
    })(),
    processedCount: typeof (batch.total_count ?? batch.processed_count) === 'number'
      ? (batch.total_count ?? batch.processed_count)
      : 0,
    lastUpdated: batch.updated_at
      ? (batch.updated_at.toDate ? batch.updated_at.toDate().toLocaleString() : new Date(batch.updated_at).toLocaleString())
      : (batch.lastUpdated || batch.timestamp || 'N/A')
  }))

  const columns = [
    { key: 'batchNumber', header: 'Batch Number' },
    { key: 'totalDefects', header: 'Total Defects' },
    { key: 'uniqueDefectTypes', header: 'Unique Defect Types' },
    { key: 'processedCount', header: 'Processed Count' },
    { key: 'lastUpdated', header: 'Last Updated' }
  ]

  const filename = `batch-review-${new Date().toISOString().split('T')[0]}`
  const title = 'Batch Review Report'

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename)
      break
    case 'excel':
      exportToExcel(exportData, filename, 'Batch Review')
      break
    case 'pdf':
      exportToPDF(exportData, filename, title, columns)
      break
    default:
      console.warn('Unknown export format:', format)
  }
}

// Sort Log Export
export const exportSortLogs = async (data, format) => {
  if (!data || data.length === 0) {
    console.warn('No sort logs to export')
    return
  }

  const exportData = data.map(log => ({
    timestamp: log.timestamp
      ? (typeof log.timestamp === 'string'
          ? new Date(log.timestamp).toLocaleString()
          : log.timestamp.seconds
            ? new Date(log.timestamp.seconds * 1000).toLocaleString()
            : 'N/A')
      : 'N/A',
    batch_id: log.batch_id || log.batchNumber || 'Unknown',
    weight: typeof log.weight === 'number' ? log.weight : 'N/A',
    size: log.size || 'Unknown',
    machine_id: log.machine_id || log.machineId || 'N/A'
  }));

  const columns = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'batch_id', header: 'Batch ID' },
    { key: 'weight', header: 'Weight (g)' },
    { key: 'size', header: 'Size' },
    { key: 'machine_id', header: 'Machine ID' }
  ];

  const filename = `sort-logs-${new Date().toISOString().split('T')[0]}`;
  const title = 'Sort Logs Report';

  console.log("Export Data:", data);

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename);
      break;
    case 'excel':
      exportToExcel(exportData, filename, 'Sort Logs');
      break;
    case 'pdf':
      await exportToPDF(exportData, filename, title, columns);
      break;
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.');
      break;
    default:
      console.warn('Unknown export format:', format, exportData);
  }
}

// Sort Statistics Export
export const exportSortStatistics = async (stats, format) => {
  if (!stats) {
    console.warn('No sort statistics to export')
    return
  }

  // Prepare data for export
  const exportData = [
    {
      metric: 'Total Sorts',
      value: stats.totalSorts || 0,
      description: 'Total items sorted on linked machines'
    },
    {
      metric: 'Most Common Size',
      value: stats.mostCommonSize ? stats.mostCommonSize.type : 'N/A',
      description: 'Highest occurring size'
    },
    {
      metric: 'Sort Rate',
      value: `${stats.sortRate || 0} /hr`,
      description: 'Average items per hour'
    },
    {
      metric: 'Sort Trend',
      value: `${stats.sortTrend || 0}%`,
      description: 'Change from previous period'
    },
    {
      metric: 'Last Updated',
      value: stats.lastUpdated || 'N/A',
      description: 'Last data refresh time'
    }
  ];

  // Add size distribution data
  if (stats.sizeCounts && Object.keys(stats.sizeCounts).length > 0) {
    Object.keys(stats.sizeCounts).forEach(sizeType => {
      exportData.push({
        metric: `${sizeType} Count`,
        value: stats.sizeCounts[sizeType] || 0,
        description: `Number of ${sizeType} items sorted`
      });
      exportData.push({
        metric: `${sizeType} Percentage`,
        value: `${stats.sizePercentages[sizeType] || 0}%`,
        description: `Percentage of ${sizeType} items`
      });
    });
  }

  const columns = [
    { key: 'metric', header: 'Metric' },
    { key: 'value', header: 'Value' },
    { key: 'description', header: 'Description' }
  ];

  const filename = `sort-statistics-${new Date().toISOString().split('T')[0]}`;
  const title = 'Sort Statistics Report';

  console.log("Export Statistics Data:", stats);

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename);
      break;
    case 'excel':
      exportToExcel(exportData, filename, 'Sort Statistics');
      break;
    case 'pdf':
      await exportToPDF(exportData, filename, title, columns);
      break;
    case 'docx':
      await exportToDOCX(exportData, filename, title, columns);
      break;
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.');
      break;
    default:
      console.warn('Unknown export format:', format, stats);
  }
}

// Sort Daily Summary Export
export const exportSortDailySummary = async (data, format) => {
  if (!data) {
    console.warn('No sort daily summary data to export')
    return
  }

  // Prepare data for export
  const exportData = [
    {
      metric: 'Today Total',
      value: data.todayTotal || 0,
      description: 'Total sorts today on linked machines'
    },
    {
      metric: 'Yesterday Total',
      value: data.yesterdayTotal || 0,
      description: 'Total sorts yesterday on linked machines'
    },
    {
      metric: 'Daily Average',
      value: data.average ? data.average.toFixed(1) : '0.0',
      description: 'Average sorts per day over last 7 days'
    },
    {
      metric: 'Peak Time',
      value: data.peak || 'N/A',
      description: 'Highest activity period today'
    },
    {
      metric: 'Change from Yesterday',
      value: `${data.change ? data.change.toFixed(1) : 0}%`,
      description: 'Percentage change from yesterday'
    }
  ];

  // Add size distribution data
  if (data.counts && Object.keys(data.counts).length > 0) {
    Object.keys(data.counts).forEach(sizeType => {
      const count = data.counts[sizeType] || 0;
      const percentage = data.todayTotal > 0 ? ((count / data.todayTotal) * 100).toFixed(1) : 0;
      
      exportData.push({
        metric: `${sizeType} Count`,
        value: count,
        description: `Number of ${sizeType} items sorted today`
      });
      exportData.push({
        metric: `${sizeType} Percentage`,
        value: `${percentage}%`,
        description: `Percentage of ${sizeType} items today`
      });
    });
  }

  // Add hourly distribution data
  if (data.hourlyDistribution && Object.keys(data.hourlyDistribution).length > 0) {
    Object.keys(data.hourlyDistribution).forEach(hour => {
      const count = data.hourlyDistribution[hour] || 0;
      const hourLabel = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      
      exportData.push({
        metric: `Hour ${hourLabel}`,
        value: count,
        description: `Number of sorts at ${hourLabel}`
      });
    });
  }

  const columns = [
    { key: 'metric', header: 'Metric' },
    { key: 'value', header: 'Value' },
    { key: 'description', header: 'Description' }
  ];

  const filename = `sort-daily-summary-${new Date().toISOString().split('T')[0]}`;
  const title = 'Sort Daily Summary Report';

  console.log("Export Daily Summary Data:", data);

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename);
      break;
    case 'excel':
      exportToExcel(exportData, filename, 'Sort Daily Summary');
      break;
    case 'pdf':
      await exportToPDF(exportData, filename, title, columns);
      break;
    case 'docx':
      await exportToDOCX(exportData, filename, title, columns);
      break;
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.');
      break;
    default:
      console.warn('Unknown export format:', format, data);
  }
}

// Sort Batch Review Export
export const exportSortBatchReview = async (data, format) => {
  if (!data) {
    console.warn('No sort batch review data to export')
    return
  }

  let exportData = []
  let columns = []
  let filename = ''
  let title = ''

  // Check if data is a single batch or array of batches
  if (Array.isArray(data)) {
    // Multiple batches
    exportData = data.map(batch => ({
      batch_number: batch.batchNumber || 'Unknown',
      total_sort: batch.totalSort || 0,
      common_size: batch.commonSize || 'Unknown',
      time_range: batch.timeRange || 'N/A',
      from_date: batch.fromDate || 'N/A',
      to_date: batch.toDate || 'N/A'
    }))

    columns = [
      { key: 'batch_number', header: 'Batch Number' },
      { key: 'total_sort', header: 'Total Sort' },
      { key: 'common_size', header: 'Most Common Size' },
      { key: 'time_range', header: 'Time Range' },
      { key: 'from_date', header: 'From Date' },
      { key: 'to_date', header: 'To Date' }
    ]

    filename = `sort-batch-reviews-${new Date().toISOString().split('T')[0]}`
    title = 'Sort Batch Reviews Report'
  } else {
    // Single batch with detailed information
    exportData = [
      {
        metric: 'Batch Number',
        value: data.batchNumber || 'Unknown',
        description: 'Unique batch identifier'
      },
      {
        metric: 'Total Sort',
        value: data.totalSort || 0,
        description: 'Total number of sorts in this batch'
      },
      {
        metric: 'Most Common Size',
        value: data.commonSize || 'Unknown',
        description: 'Most frequently occurring size in this batch'
      },
      {
        metric: 'Time Range',
        value: data.timeRange || 'N/A',
        description: 'Time span of sorting operations'
      },
      {
        metric: 'From Date',
        value: data.fromDate || 'N/A',
        description: 'Start date and time of batch'
      },
      {
        metric: 'To Date',
        value: data.toDate || 'N/A',
        description: 'End date and time of batch'
      }
    ]

    // Add size distribution data if available
    if (data.sizeCounts && Object.keys(data.sizeCounts).length > 0) {
      Object.keys(data.sizeCounts).forEach(sizeType => {
        const count = data.sizeCounts[sizeType] || 0
        const percentage = data.totalSort > 0 ? ((count / data.totalSort) * 100).toFixed(1) : 0
        
        exportData.push({
          metric: `${sizeType} Count`,
          value: count,
          description: `Number of ${sizeType} items in this batch`
        })
        exportData.push({
          metric: `${sizeType} Percentage`,
          value: `${percentage}%`,
          description: `Percentage of ${sizeType} items in this batch`
        })
      })
    }

    columns = [
      { key: 'metric', header: 'Metric' },
      { key: 'value', header: 'Value' },
      { key: 'description', header: 'Description' }
    ]

    filename = `sort-batch-review-${data.batchNumber || 'unknown'}-${new Date().toISOString().split('T')[0]}`
    title = `Sort Batch Review Report - ${data.batchNumber || 'Unknown'}`
  }

  console.log("Export Batch Review Data:", data)

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename)
      break
    case 'excel':
      exportToExcel(exportData, filename, title)
      break
    case 'pdf':
      await exportToPDF(exportData, filename, title, columns)
      break
    case 'docx':
      await exportToDOCX(exportData, filename, title, columns)
      break
    case 'image':
      alert('Image export is only available for charts/tables on screen. Please use the image export button on the relevant view.')
      break
    default:
      console.warn('Unknown export format:', format, data)
  }
}

// Chart Export
export const exportChart = async (chartRef, format, filename) => {
  if (format === 'image') {
    await exportToImage(chartRef, filename)
  } else {
    console.warn('Chart can only be exported as image')
  }
}

