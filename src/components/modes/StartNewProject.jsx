// src/components/modes/StartNewProject.jsx - Start New Project component

import React, { useState, useRef, useContext } from 'react';
import { Upload } from 'lucide-react';
import { generateNewProjectWBS } from '../utils/wbsUtils.js';

const rjeColors = {
  lightGreen: '#B8D582',
  mediumGreen: '#7DB544',
  darkGreen: '#4A9B4B',
  teal: '#2E8B7A',
  blue: '#1E7FC2',
  darkBlue: '#0F5A8F'
};

const StartNewProject = ({ 
  projectName, 
  setProjectName, 
  setEquipmentData, 
  setWbsOutput, 
  setWbsVisualization, 
  setProjectState, 
  isProcessing, 
  setIsProcessing 
}) => {
  const fileInputRef = useRef(null);

  // FIXED: Updated file upload handler with parent-based categorization
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      console.log(`🔄 Processing file: ${file.name}`);
      
      let equipmentList = [];
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Import SheetJS dynamically
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { cellDates: true });
        
        const sheetName = workbook.SheetNames.includes('Equipment_List') 
          ? 'Equipment_List' 
          : workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const headerRow = jsonData[0];
        const dataRows = jsonData.slice(1);
        
        const columnMapping = {
          'Subsystem': 'subsystem',
          'Parent Equipment Number': 'parentEquipmentNumber',
          'Equipment Number': 'equipmentNumber',
          'Description': 'description',
          'Commissioning (Y/N)': 'commissioning',
          'Project': 'project',
          'Item No.': 'itemNo',
          'PLU': 'plu',
          'Supplier': 'supplier',
          'Manufacturer': 'manufacturer',
          'Model Number': 'modelNumber',
          'Test Code': 'testCode',
          'Comments': 'comments',
          'Drawings': 'drawings'
        };
        
        equipmentList = dataRows.map(row => {
          const equipment = {};
          headerRow.forEach((header, index) => {
            const mappedField = columnMapping[header];
            if (mappedField) {
              equipment[mappedField] = row[index] || '';
            }
          });
          return equipment;
        }).filter(item => 
          item.equipmentNumber && 
          item.subsystem && 
          item.description && 
          item.commissioning
        );
        
      } else if (file.name.endsWith('.csv')) {
        // Handle CSV files
        const text = await file.text();
        const lines = text.split('\n');
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        
        equipmentList = lines.slice(1).map(line => {
          const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
          const equipment = {};
          
          headers.forEach((header, index) => {
            const headerLower = header.toLowerCase();
            if (headerLower.includes('subsystem')) {
              equipment.subsystem = values[index] || '';
            } else if (headerLower.includes('parent') && headerLower.includes('equipment')) {
              equipment.parentEquipmentNumber = values[index] || '';
            } else if (headerLower.includes('equipment') && headerLower.includes('number')) {
              equipment.equipmentNumber = values[index] || '';
            } else if (headerLower.includes('description')) {
              equipment.description = values[index] || '';
            } else if (headerLower.includes('commissioning')) {
              equipment.commissioning = values[index];
            }
          });
          
          return equipment;
        }).filter(item => 
          item.equipmentNumber && 
          item.subsystem && 
          item.description && 
          item.commissioning
        );
        
      } else {
        throw new Error('Unsupported file format. Please use .xlsx, .xls, or .csv files.');
      }
      
      if (equipmentList.length === 0) {
        alert('No valid equipment found. Please ensure your file contains the required columns: Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)');
        return;
      }
      
      // Log processing summary
      const totalRows = equipmentList.length;
      const validItems = equipmentList.filter(item => item.equipmentNumber && item.subsystem && item.description && item.commissioning);
      const commissionedY = validItems.filter(item => item.commissioning === 'Y');
      const commissionedTBC = validItems.filter(item => item.commissioning === 'TBC');
      const notCommissioned = validItems.filter(item => item.commissioning === 'N');
      
      console.log('📊 Equipment Processing Summary:');
      console.log(`   Total rows processed: ${totalRows}`);
      console.log(`   Valid equipment items: ${validItems.length}`);
      console.log(`   Commissioned (Y): ${commissionedY.length}`);
      console.log(`   TBC: ${commissionedTBC.length}`);
      console.log(`   Not commissioned (N): ${notCommissioned.length}`);
      console.log(`✅ Loaded ${validItems.length} equipment items`);
      
      setEquipmentData(validItems);
      
      // FIXED: Call the updated WBS generation function
      console.log('🏗️ Generating WBS structure...');
      const result = generateWBS(validItems, projectName, null, 'new');
      
      // Set the results
      setWbsVisualization(result.wbsVisualization);
      setWbsOutput(result.wbsOutput);
      setProjectState(result.projectState);
      
      console.log(`✅ Generated ${result.wbsOutput.length} WBS nodes`);
      console.log('🎉 WBS generation complete!');
      
    } catch (error) {
      console.error('File processing error:', error);
      alert('Error processing file. Please ensure the file contains the required columns: Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
        🚀 Start New Project
      </h2>
      
      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.mediumGreen + '15' }}>
        <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
          What happens next:
        </h4>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Upload your equipment list (Excel or CSV)</li>
          <li>• <strong>Required columns:</strong> Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)</li>
          <li>• System will create fresh WBS structure</li>
          <li>• Equipment will be categorized into numbered sections (01-10, 99)</li>
          <li>• <strong>FIXED:</strong> Child equipment inherits parent's category</li>
          <li>• Only commissioned equipment (Y) will be included</li>
        </ul>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: rjeColors.darkBlue }}>
          Project Name
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full p-3 border-2 rounded-lg focus:outline-none"
          style={{ borderColor: rjeColors.lightGreen }}
          placeholder="Enter your project name..."
        />
      </div>

      <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: rjeColors.mediumGreen }}>
        <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: rjeColors.mediumGreen }} />
        <p className="text-lg font-medium mb-2">Upload Equipment List</p>
        <p className="text-gray-600 mb-4">Excel (.xlsx) or CSV files supported</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.json"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="px-6 py-3 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
          style={{ backgroundColor: rjeColors.mediumGreen }}
        >
          {isProcessing ? 'Processing Equipment List...' : 'Choose Equipment File'}
        </button>
      </div>

      {isProcessing && (
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '20' }}>
          <p className="text-sm text-gray-700">
            <strong>🔄 Processing...</strong> Using enhanced parent-based categorization to ensure proper equipment hierarchy.
          </p>
        </div>
      )}
    </div>
  );
};

export default StartNewProject;
