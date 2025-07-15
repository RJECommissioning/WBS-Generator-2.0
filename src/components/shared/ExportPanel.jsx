// src/components/shared/ExportPanel.jsx

import React from 'react';
import { Download, FileText } from 'lucide-react';
import { rjeColors } from '../utils/constants';
import { exportWBSAsCSV, downloadCSV } from '../utils/wbsUtils';

const ExportPanel = ({ 
  wbsOutput, 
  uploadMode, 
  projectName, 
  projectState, 
  equipmentData = [], 
  missingEquipmentAnalysis = {} 
}) => {
  const handleExportCSV = () => {
    if (wbsOutput.length === 0) {
      alert('No WBS data to export. Please generate WBS structure first.');
      return;
    }

    const csvContent = exportWBSAsCSV(wbsOutput);
    const filename = uploadMode === 'missing' 
      ? `${projectName}_NEW_Equipment_P6_Import.csv`
      : `${projectName}_WBS_P6_Import.csv`;
    
    downloadCSV(csvContent, filename);
  };

  const handleExportJSON = () => {
    if (!projectState) {
      alert('No project state to export. Please generate WBS structure first.');
      return;
    }
    
    const dataStr = JSON.stringify(projectState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectState.projectName}_project_state.json`;
    link.click();
    
    URL.revokeObjectURL(url);
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

      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
        <p className="text-sm text-gray-700">
          <strong>💡 P6 Import Ready:</strong> Use the <strong>WBS CSV export</strong> for Primavera P6 import or to continue this project later. 
          The CSV file uses comma-separated format optimized for P6 compatibility with hierarchical decimal numbering.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.mediumGreen}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {wbsOutput.length}
          </div>
          <div className="text-sm text-gray-600">Total WBS Nodes</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkGreen}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {projectState?.subsystems?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Subsystems</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.teal}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {equipmentData.filter(item => item.commissioning === 'Y').length}
          </div>
          <div className="text-sm text-gray-600">Commissioned (Y)</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.blue}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {equipmentData.filter(item => item.commissioning === 'TBC').length}
          </div>
          <div className="text-sm text-gray-600">TBC Equipment</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkBlue}20` }}>
          <div className="text-2xl font-bold text-white" style={{ backgroundColor: rjeColors.darkBlue }}>
            {equipmentData.filter(item => item.commissioning === 'N').length}
          </div>
          <div className="text-sm text-gray-600">Excluded (N)</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-sm" style={{ color: rjeColors.darkBlue }}>
            WBS Structure Preview (P6 Format)
          </h4>
          <span className="text-xs text-gray-500">
            Hierarchical: {wbsOutput[0]?.wbs_code} - {wbsOutput[wbsOutput.length - 1]?.wbs_code}
          </span>
        </div>
        <div className="text-sm font-mono">
          {wbsOutput.slice(0, 20).map(node => (
            <div key={node.wbs_code} className="py-1">
              <span className="text-blue-600">{node.wbs_code}</span>
              <span className="text-gray-400"> | </span>
              <span className="text-green-600">{node.parent_wbs_code || 'ROOT'}</span>
              <span className="text-gray-400"> | </span>
              <span>{node.wbs_name}</span>
            </div>
          ))}
          {wbsOutput.length > 20 && (
            <div className="text-gray-500 py-2">... and {wbsOutput.length - 20} more nodes</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
