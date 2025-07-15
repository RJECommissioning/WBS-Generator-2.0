// src/components/modes/StartNewProject.jsx

import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { rjeColors } from '../utils/constants';

const StartNewProject = ({ 
  isProcessing, 
  projectName, 
  setProjectName, 
  onFileUpload // This will be passed from parent
}) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    if (onFileUpload) {
      onFileUpload(event);
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
    </div>
  );
};

export default StartNewProject;
