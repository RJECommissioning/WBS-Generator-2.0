// src/App.jsx
import React, { useState } from 'react';
import { rjeColors } from './components/utils/constants.js';
import WBSGenerator from './components/WBSGenerator.jsx';

const App = () => {
  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${rjeColors.lightGreen}, ${rjeColors.blue})` }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div 
          className="rounded-2xl shadow-2xl mb-8 text-white"
          style={{ background: `linear-gradient(135deg, ${rjeColors.darkBlue}, ${rjeColors.teal})` }}
        >
          <div className="p-8 text-center">
            <h1 className="text-4xl font-bold mb-4">WBS Generator v2.0</h1>
            <p className="text-xl opacity-90">Advanced Work Breakdown Structure Generation</p>
            <p className="text-sm mt-2 opacity-75">Modern Architecture (v4.0) - Production Ready</p>
          </div>
        </div>
        {/* Main Generator Interface */}
        <WBSGenerator />
      </div>
    </div>
  );
};

export default App;
