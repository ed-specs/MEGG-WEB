# Export Functionality Documentation

## Overview

This document describes the comprehensive export functionality that has been added to all defect history components in the web application. Users can now export data in multiple formats: CSV, Excel, PDF, DOCX, and Image (PNG).

## Supported Export Formats

### 1. CSV (Comma-Separated Values)
- **Purpose**: Simple tabular data export
- **Best for**: Data analysis, spreadsheet applications
- **Features**: 
  - Automatic handling of special characters
  - Proper escaping of commas and quotes
  - UTF-8 encoding

### 2. Excel (.xlsx)
- **Purpose**: Advanced spreadsheet export
- **Best for**: Complex data analysis, reporting
- **Features**:
  - Multiple worksheets support
  - Preserves data types
  - Compatible with Microsoft Excel and Google Sheets

### 3. PDF (Portable Document Format)
- **Purpose**: Document-style reports
- **Best for**: Official reports, printing, sharing
- **Features**:
  - Professional formatting
  - Automatic pagination
  - Title and timestamp inclusion
  - Table formatting with borders

### 4. DOCX (Microsoft Word Document)
- **Purpose**: Rich text document export
- **Best for**: Reports, documentation, editing
- **Features**:
  - Professional document formatting
  - Table formatting
  - Title and timestamp inclusion
  - Compatible with Microsoft Word

### 5. Image (PNG)
- **Purpose**: Visual export of charts and components
- **Best for**: Presentations, documentation, sharing
- **Features**:
  - High-quality image capture
  - 2x scale for crisp images
  - Background color preservation

## Components with Export Functionality

### 1. Daily Summary Component
**Location**: `web-next/app/admin/history/defect/components/DailySummary.jsx`

**Exportable Data**:
- Period total defects
- Daily average defects
- Peak time information
- Percentage change data
- Hourly distribution data
- Defect counts by type
- Last updated timestamp

**Export Options**:
- CSV: Tabular format with metrics and values
- Excel: Structured data with multiple sheets
- PDF: Formatted report with title and timestamp
- DOCX: Professional document format
- Image: Chart visualization as PNG

### 2. Statistics Component
**Location**: `web-next/app/admin/history/defect/components/Statistics.jsx`

**Exportable Data**:
- Total inspections count
- Defect distribution percentages
- Most common defect type
- Inspection rate per hour
- Inspection trend percentage
- Last updated timestamp

**Export Options**:
- CSV: Metrics and values in tabular format
- Excel: Structured data with calculations
- PDF: Professional report format
- DOCX: Document format with tables
- Image: Defect distribution chart as PNG

### 3. Defect Log Component
**Location**: `web-next/app/admin/history/defect/components/DefectLog.jsx`

**Exportable Data**:
- Timestamp of each defect
- Batch number
- Defect type
- Confidence score
- Machine ID
- All filtered and sorted data

**Export Options**:
- CSV: Complete log data in tabular format
- Excel: Structured data with multiple columns
- PDF: Formatted report with all log entries
- DOCX: Document format with detailed tables
- Image: Visual representation of the log table

### 4. Batch Review Component
**Location**: `web-next/app/admin/history/defect/components/BatchReview.jsx`

**Exportable Data**:
- Batch numbers
- Total defects per batch
- Unique defect types per batch
- Processed count
- Last updated timestamp
- Overview statistics

**Export Options**:
- CSV: Batch data in tabular format
- Excel: Structured batch information
- PDF: Professional batch report
- DOCX: Document format with batch details
- Image: Visual representation of batch data

### 5. Daily Summary Chart Component
**Location**: `web-next/app/admin/history/defect/components/DailySummarryChart.jsx`

**Exportable Data**:
- Chart visualization
- Hourly distribution data
- Defect type breakdown

**Export Options**:
- Image: High-quality PNG export of the chart

## Technical Implementation

### Export Utilities
**Location**: `web-next/app/utils/export-utils.js`

The export functionality is implemented using the following libraries:

1. **jsPDF**: For PDF generation
2. **html2canvas**: For image capture
3. **xlsx**: For Excel file generation
4. **docx**: For Word document creation
5. **file-saver**: For file download handling

### Key Functions

#### Generic Export Functions
- `exportToCSV(data, filename)`: Exports data to CSV format
- `exportToExcel(data, filename, sheetName)`: Exports data to Excel format
- `exportToPDF(data, filename, title, columns)`: Exports data to PDF format
- `exportToDOCX(data, filename, title, columns)`: Exports data to DOCX format
- `exportToImage(elementRef, filename)`: Exports DOM element as image

#### Component-Specific Functions
- `exportDailySummary(data, format)`: Exports daily summary data
- `exportStatistics(data, format)`: Exports statistics data
- `exportDefectLogs(data, format)`: Exports defect log data
- `exportBatchReview(data, format)`: Exports batch review data

### UI Implementation

Each component includes:
1. **Export Button**: Download icon in the header
2. **Dropdown Menu**: Format selection options
3. **Color-Coded Options**: Different colors for each format
4. **Outside Click Handling**: Closes dropdown when clicking elsewhere

## Usage Instructions

### For Users

1. **Navigate** to any defect history component
2. **Click** the download icon (📥) in the top-right corner
3. **Select** your preferred export format from the dropdown
4. **Wait** for the file to download automatically
5. **Find** the file in your default download folder

### For Developers

1. **Import** the export utilities:
   ```javascript
   import { exportToCSV, exportToExcel, exportToPDF, exportToDOCX, exportToImage } from "../../../../utils/export-utils"
   ```

2. **Add** export state and refs:
   ```javascript
   const [showExportDropdown, setShowExportDropdown] = useState(false)
   const exportDropdownRef = useRef(null)
   const tableRef = useRef(null)
   ```

3. **Implement** export handler:
   ```javascript
   const handleExportFormat = (format) => {
     if (format === 'image') {
       exportToImage(tableRef, `filename-${new Date().toISOString().split('T')[0]}`)
     } else {
       exportComponentData(data, format)
     }
     setShowExportDropdown(false)
   }
   ```

4. **Add** UI elements:
   ```javascript
   <div className="relative" ref={exportDropdownRef}>
     <button onClick={() => setShowExportDropdown(!showExportDropdown)}>
       <Download className="w-5 h-5" />
     </button>
     {showExportDropdown && (
       <div className="export-dropdown">
         {/* Export options */}
       </div>
     )}
   </div>
   ```

## File Naming Convention

All exported files follow this naming pattern:
```
{component-name}-{date}.{extension}
```

Examples:
- `daily-summary-2024-01-15.csv`
- `statistics-2024-01-15.xlsx`
- `defect-logs-2024-01-15.pdf`
- `batch-review-2024-01-15.docx`
- `daily-summary-chart-2024-01-15.png`

## Testing

A test page is available at `/test-export` to verify all export functionality:

1. **Navigate** to `/test-export`
2. **View** the test data table
3. **Click** any export button
4. **Verify** the downloaded file format and content

## Browser Compatibility

- **Chrome**: Full support for all formats
- **Firefox**: Full support for all formats
- **Safari**: Full support for all formats
- **Edge**: Full support for all formats

## Performance Considerations

- **Large datasets**: CSV and Excel exports handle large datasets efficiently
- **Image export**: Uses 2x scaling for high quality, may be slower for complex charts
- **PDF/DOCX**: May take longer for large datasets due to formatting overhead
- **Memory usage**: All exports are streamed to avoid memory issues

## Troubleshooting

### Common Issues

1. **File not downloading**:
   - Check browser download settings
   - Ensure popup blockers are disabled
   - Verify sufficient disk space

2. **Image export not working**:
   - Ensure the element has a valid ref
   - Check that the element is visible in the DOM
   - Verify html2canvas compatibility

3. **PDF/DOCX formatting issues**:
   - Check data structure matches expected format
   - Verify column definitions are correct
   - Ensure all required data is present

### Error Handling

All export functions include error handling:
- Console warnings for missing data
- Graceful fallbacks for unsupported formats
- User-friendly error messages

## Future Enhancements

Potential improvements for future versions:
1. **Custom templates** for PDF/DOCX exports
2. **Batch export** functionality
3. **Scheduled exports** via email
4. **Export history** tracking
5. **Advanced filtering** for exports
6. **Export preferences** saving
7. **Multi-language** support for exported documents 