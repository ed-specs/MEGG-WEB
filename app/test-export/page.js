"use client"

import { useState } from "react"
import { exportToCSV, exportToExcel, exportToPDF, exportToDOCX, exportToImage } from "../utils/export-utils"

export default function TestExport() {
  const [testData] = useState([
    { name: "John Doe", age: 30, city: "New York", department: "Engineering" },
    { name: "Jane Smith", age: 25, city: "Los Angeles", department: "Marketing" },
    { name: "Bob Johnson", age: 35, city: "Chicago", department: "Sales" },
    { name: "Alice Brown", age: 28, city: "Houston", department: "HR" },
  ])

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'age', header: 'Age' },
    { key: 'city', header: 'City' },
    { key: 'department', header: 'Department' }
  ]

  const handleExport = (format) => {
    const filename = `test-export-${new Date().toISOString().split('T')[0]}`
    const title = 'Test Export Report'

    switch (format) {
      case 'csv':
        exportToCSV(testData, filename)
        break
      case 'excel':
        exportToExcel(testData, filename, 'Test Data')
        break
      case 'pdf':
        exportToPDF(testData, filename, title, columns)
        break
      case 'docx':
        exportToDOCX(testData, filename, title, columns)
        break
      case 'image':
        // This would need a ref to an element
        console.log('Image export requires a DOM element reference')
        break
      default:
        console.warn('Unknown export format:', format)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Export Functionality Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Data</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Age</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">City</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Department</th>
                </tr>
              </thead>
              <tbody>
                {testData.map((row, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">{row.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{row.age}</td>
                    <td className="border border-gray-300 px-4 py-2">{row.city}</td>
                    <td className="border border-gray-300 px-4 py-2">{row.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Export Options</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Export Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Export PDF
            </button>
            <button
              onClick={() => handleExport('docx')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Export DOCX
            </button>
            <button
              onClick={() => handleExport('image')}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Export Image
            </button>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Instructions</h3>
          <ul className="text-blue-700 space-y-1">
            <li>• Click any export button to test the functionality</li>
            <li>• Files will be downloaded to your default download folder</li>
            <li>• CSV and Excel files contain the test data in tabular format</li>
            <li>• PDF and DOCX files include a title and formatted table</li>
            <li>• Image export requires a DOM element reference (not implemented in this test)</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 