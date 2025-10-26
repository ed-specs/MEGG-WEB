"use client";

import React, { useRef } from 'react';
import ExportHeader from './ExportHeader';
import { exportToImage } from '../utils/export-utils';

export default function ExportHeaderTest() {
  const testRef = useRef(null);

  const handleExportTest = async () => {
    try {
      await exportToImage(testRef, 'test-export-with-header');
      alert('Export completed! Check your downloads folder.');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Export Header Test</h2>
      
      <button
        onClick={handleExportTest}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Export as Image (with header)
      </button>

      <div ref={testRef} className="bg-white border rounded-lg p-6 shadow">
        <ExportHeader />
        
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Sample Data</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">ID</th>
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">1</td>
                <td className="border border-gray-300 px-4 py-2">Sample Item 1</td>
                <td className="border border-gray-300 px-4 py-2">Active</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">2</td>
                <td className="border border-gray-300 px-4 py-2">Sample Item 2</td>
                <td className="border border-gray-300 px-4 py-2">Inactive</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">3</td>
                <td className="border border-gray-300 px-4 py-2">Sample Item 3</td>
                <td className="border border-gray-300 px-4 py-2">Active</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 