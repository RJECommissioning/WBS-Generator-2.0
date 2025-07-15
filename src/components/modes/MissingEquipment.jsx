// src/components/modes/MissingEquipment.jsx

import React from 'react';
import { rjeColors } from '../utils/constants';

const MissingEquipment = (props) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
        🔧 Add Missing Equipment
      </h2>
      
      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.teal + '15' }}>
        <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
          Coming Soon:
        </h4>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Load existing WBS structure</li>
          <li>• Compare with new equipment list</li>
          <li>• Generate WBS for missing equipment only</li>
        </ul>
      </div>

      <div className="text-center p-8 text-gray-500">
        <p>This component is being refactored.</p>
        <p className="text-sm mt-2">We'll work on this together in the next step!</p>
      </div>
    </div>
  );
};

export default MissingEquipment;
