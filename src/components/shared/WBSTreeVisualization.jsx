// src/components/shared/WBSTreeVisualization.jsx

import React from 'react';
import { rjeColors } from '../utils/constants';

const WBSTreeVisualization = ({ wbsNodes = [] }) => {
  if (!wbsNodes || wbsNodes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
          WBS Structure Visualization
        </h3>
        <p className="text-gray-500">No WBS structure to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
        WBS Structure Visualization
      </h3>
      
      <div className="p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
        <p className="text-sm text-gray-700">
          This component is being refactored. Found {wbsNodes.length} WBS nodes to display.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          We'll work on the tree visualization together in the next step!
        </p>
      </div>
    </div>
  );
};

export default WBSTreeVisualization;
