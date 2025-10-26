# Export Header Functionality

## Overview

All exported files from the defect history page now include an institutional header with the following information:

- **MINSU Logo** (Blue)
- **CCS Logo** (Blue) 
- **MEGG Logo** (Orange)
- **REPUBLIC OF THE PHILIPPINES**
- **MINDORO STATE UNIVERSITY**
- **A'S DUCK FARM**
- **MANGANGAN I, BACO ORIENTAL MINDORO**

## Supported Export Formats

The header is automatically included in all export formats:

### 1. PDF Export
- Header appears at the top of each page
- Institutional information is centered and properly formatted
- Includes a separator line before the main content

### 2. DOCX Export
- Header appears at the beginning of the document
- Uses proper Word document formatting with headings
- Includes a separator line using border styling

### 3. Excel Export
- Header information appears in the first 8 rows
- Institutional information is in separate rows
- Main data starts from row 9

### 4. CSV Export
- Header information appears in the first 8 rows
- Institutional information is in separate rows
- Main data starts from row 9

### 5. Image Export (PNG)
- Header is dynamically added to the captured element
- Uses the ExportHeader component for consistent styling
- Automatically includes logos and institutional information

## Implementation Details

### Files Modified

1. **`web-next/app/components/ExportHeader.js`**
   - New component for displaying the institutional header
   - Includes logos and institutional information
   - Responsive design with proper styling

2. **`web-next/app/utils/export-utils.js`**
   - Updated all export functions to include header
   - `exportToPDF()` - Added institutional header at top
   - `exportToDOCX()` - Added institutional header with proper formatting
   - `exportToExcel()` - Added header rows before data
   - `exportToCSV()` - Added header rows before data
   - `exportToImage()` - Dynamically adds header to captured content

3. **`web-next/app/globals.css`**
   - Added CSS styles for export header
   - Print-friendly styles for better export quality

4. **`web-next/app/components/ExportHeaderTest.js`**
   - Test component to demonstrate header functionality
   - Can be used to verify export header is working correctly

### Usage

The header is automatically included in all exports from the defect history page. No additional configuration is required.

#### For Image Exports:
```javascript
import { exportToImage } from '../utils/export-utils';

// The header will be automatically added to the captured element
await exportToImage(elementRef, 'filename');
```

#### For Other Export Formats:
```javascript
import { exportDefectLogs } from '../utils/export-utils';

// The header will be automatically included in the exported file
await exportDefectLogs(data, 'pdf'); // or 'csv', 'excel', 'docx'
```

## Logo Files

The following logo files are used in the header:
- `/public/Logos/logoblue.png` - MINSU Logo
- `/public/Logos/logotextblue.png` - CCS Logo  
- `/public/Logos/logoorange.png` - MEGG Logo

## Styling

The header uses a consistent color scheme:
- MINSU & CCS: Blue (#1e40af)
- MEGG: Orange (#ea580c)
- Text colors: Various shades of gray for hierarchy
- Background: Light gray (#f8f9fa)
- Border: Dark gray (#333)

## Testing

To test the export header functionality:

1. Navigate to the defect history page
2. Use any export option (CSV, Excel, PDF, DOCX, or Image)
3. Verify that the institutional header appears at the top of the exported file
4. Check that all logos and institutional information are properly formatted

The `ExportHeaderTest` component can also be used to test the image export functionality specifically. 