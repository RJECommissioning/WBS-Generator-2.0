// src/components/shared/ExportPanel.jsx

import React from 'react';
import { Download, FileText } from 'lucide-react';
import { rjeColors } from '../utils/constants';

const ExportPanel = ({ 
  wbsOutput, 
  uploadMode, 
  projectName, 
  projectState, 
  equipmentData = [], 
  missingEquipmentAnalysis = {} 
}) => {
  const handleExportCSV = () => {
    alert('CSV export functionality will be implemented here');
  };

  const handleExportJSON = () => {
    alert('JSON export functionality will be implemented here');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
        {uploadMode === 'missing' 
          ? `Export New Equipment (${wbsOutput.length} new items)` 
          : `Export WBS Structure (${wbsOutput.length} nodes)`
        } - Modern Architecture (v4.0) - WBS Generator v2.0
      </h3>
      
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleExportCSV}
          className="flex items-center px-4 py-2 text-white rounded-lg font-medium"
          style={{ backgroundColor: rjeColors.teal }}
        >
          <Download className="w-4 h-4 mr-2" />
          {uploadMode === 'missing' 
            ? 'Export NEW Equipment CSV (for P6 Import)' 
            : 'Export WBS CSV (for P6 & Continue Project)'
          }
        </button>
        {uploadMode !== 'missing' && (
          <button
            onClick={handleExportJSON}
            className="flex items-center px-4 py-2 text-white rounded-lg font-medium"
            style={{ backgroundColor: rjeColors.darkGreen }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Project State (JSON)
          </button>
        )}
      </div>

      <div className="p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
        <p className="text-sm text-gray-700">
          <strong>📊 Export Status:</strong> Found {wbsOutput.length} WBS nodes ready for export.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Export functionality will be implemented in the next step!
        </p>
      </div>
    </div>
  );
};

export default ExportPanel;
