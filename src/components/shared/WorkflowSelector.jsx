// src/components/shared/WorkflowSelector.jsx
import React from 'react';
import { Settings, Plus, Zap } from 'lucide-react';
import { rjeColors } from '../utils/constants.js';

const WorkflowSelector = ({ uploadMode, setUploadMode, clearWBSData }) => {
  const handleModeChange = (mode) => {
    setUploadMode(mode);
    if (clearWBSData) {
      clearWBSData();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
        Choose Your Workflow
      </h2>
      
      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
        <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
          📋 Important Notes:
        </h4>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Only equipment with <strong>Commissioning = "Y"</strong> will be included in WBS output</li>
          <li>• Equipment with <strong>Commissioning = "TBC"</strong> will be placed in separate TBC section</li>
          <li>• Equipment with <strong>Commissioning = "N"</strong> will be ignored</li>
          <li>• <strong>Required columns:</strong> Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)</li>
          <li>• Equipment categorization uses comprehensive equipment key with 100+ equipment codes</li>
        </ul>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => handleModeChange('new')}
          className={`p-6 rounded-lg border-2 transition-all ${
            uploadMode === 'new' ? 'border-opacity-100 shadow-lg' : 'border-opacity-30 hover:border-opacity-60'
          }`}
          style={{ 
            borderColor: rjeColors.mediumGreen,
            backgroundColor: uploadMode === 'new' ? `${rjeColors.mediumGreen}20` : 'white'
          }}
        >
          <Zap className="w-8 h-8 mx-auto mb-3" style={{ color: rjeColors.mediumGreen }} />
          <div className="font-semibold text-lg mb-2">Start New Project</div>
          <div className="text-sm text-gray-600">Begin with fresh WBS structure</div>
        </button>
        
        <button
          onClick={() => handleModeChange('continue')}
          className={`p-6 rounded-lg border-2 transition-all ${
            uploadMode === 'continue' ? 'border-opacity-100 shadow-lg' : 'border-opacity-30 hover:border-opacity-60'
          }`}
          style={{ 
            borderColor: rjeColors.darkGreen,
            backgroundColor: uploadMode === 'continue' ? `${rjeColors.darkGreen}20` : 'white'
          }}
        >
          <Plus className="w-8 h-8 mx-auto mb-3" style={{ color: rjeColors.darkGreen }} />
          <div className="font-semibold text-lg mb-2">Continue Project</div>
          <div className="text-sm text-gray-600">Add subsystems to existing WBS</div>
        </button>
        
        <button
          onClick={() => handleModeChange('missing')}
          className={`p-6 rounded-lg border-2 transition-all ${
            uploadMode === 'missing' ? 'border-opacity-100 shadow-lg' : 'border-opacity-30 hover:border-opacity-60'
          }`}
          style={{ 
            borderColor: rjeColors.teal,
            backgroundColor: uploadMode === 'missing' ? `${rjeColors.teal}20` : 'white'
          }}
        >
          <Settings className="w-8 h-8 mx-auto mb-3" style={{ color: rjeColors.teal }} />
          <div className="font-semibold text-lg mb-2">Add Missing Equipment</div>
          <div className="text-sm text-gray-600">Insert individual equipment items</div>
        </button>
      </div>
    </div>
  );
};

export default WorkflowSelector;
