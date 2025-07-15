// src/components/modes/StartNewProject.jsx

import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { rjeColors } from '../utils/constants';
import { processEquipmentFile } from '../utils/equipmentUtils';
import { generateNewProjectWBS } from '../utils/wbsUtils';

const StartNewProject = ({ 
  isProcessing, 
  setIsProcessing,
  projectName, 
  setProjectName, 
  setEquipmentData,
  setWbsOutput,
  setWbsVisualization,
  setProjectState
}) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      console.log('🔄 Processing file:', file.name);
      
      // Step 1: Process the equipment file
      const equipmentList = await processEquipmentFile(file);
      console.log(`✅ Loaded ${equipmentList.length} equipment items`);
      
      if (equipmentList.length === 0) {
        alert('No valid equipment found. Please ensure your file contains the required columns: Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)');
        return;
      }

      // Step 2: Generate WBS structure
      console.log('🏗️ Generating WBS structure...');
      const wbsResult = generateNewProjectWBS(equipmentList, projectName);
      
      console.log(`✅ Generated ${wbsResult.allNodes.length} WBS nodes`);
      
      // Step 3: Update parent component state
      setEquipmentData(equipmentList);
      setWbsOutput(wbsResult.allNodes);
      setWbsVisualization(wbsResult.allNodes);
      setProjectState(wbsResult.newProjectState);
      
      console.log('🎉 WBS generation complete!');
      
      // Step 4: Show success message
      const commissionedCount = equipmentList.filter(item => item.commissioning === 'Y').length;
      const tbcCount = equipmentList.filter(item => item.commissioning === 'TBC').length;
      const excludedCount = equipmentList.filter(item => item.commissioning === 'N').length;
      
      alert(`✅ WBS Generated Successfully!\n\n📊 Summary:\n• ${wbsResult.allNodes.length} WBS nodes created\n• ${commissionedCount} commissioned equipment (Y)\n• ${tbcCount} TBC equipment\n• ${excludedCount} excluded equipment (N)\n\nScroll down to see the WBS structure!`);
      
    } catch (error) {
      console.error('❌ File processing error:', error);
      alert(`❌ Error processing file: ${error.message}\n\nPlease ensure your file contains the required columns:\n• Subsystem\n• Parent Equipment Number\n• Equipment Number\n• Description\n• Commissioning (Y/N)`);
    } finally {
      setIsProcessing(false);
      // Clear the file input so the same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
          <li>• Only commissioned equipment (Y) will be included</li>
          <li>• TBC equipment will be placed in separate section</li>
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
          disabled={isProcessing}
        />
      </div>

      <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: rjeColors.mediumGreen }}>
        <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: rjeColors.mediumGreen }} />
        <p className="text-lg font-medium mb-2">Upload Equipment List</p>
        <p className="text-gray-600 mb-4">Excel (.xlsx, .xls) or CSV files supported</p>
        
        {isProcessing && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.blue + '15' }}>
            <p className="text-sm font-medium text-blue-800">
              🔄 Processing your equipment file...
            </p>
            <p className="text-xs text-blue-600 mt-1">
              This may take a few moments for large files
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isProcessing}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="px-6 py-3 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
          style={{ backgroundColor: rjeColors.mediumGreen }}
        >
          {isProcessing ? 'Processing Equipment List...' : 'Choose Equipment File'}
        </button>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>📋 <strong>Required columns:</strong> Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)</p>
          <p>💡 <strong>Optional columns:</strong> PLU, Supplier, Manufacturer, etc.</p>
        </div>
      </div>

      {isProcessing && (
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '10' }}>
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-600 mr-3"></div>
            <span className="text-sm text-gray-700">Processing equipment list and generating WBS structure...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartNewProject;
