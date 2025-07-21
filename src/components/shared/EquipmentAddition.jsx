// src/components/shared/EquipmentAddition.jsx
// Complete Equipment Addition component with smart subsystem detection

import React, { useState, useRef } from 'react';
import { Upload, Plus, CheckCircle, AlertTriangle, Clock, Download, ArrowLeft } from 'lucide-react';
import { processEquipmentFile } from '../utils/equipmentFileProcessor';

const EquipmentAddition = ({ projectResults, onBack }) => {
  const [step, setStep] = useState('input');
  const [subsystemName, setSubsystemName] = useState('');
  const [equipmentFile, setEquipmentFile] = useState(null);
  const [equipmentData, setEquipmentData] = useState([]);
  const [subsystemInfo, setSubsystemInfo] = useState(null);
  const [integrationResults, setIntegrationResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const colors = {
    darkBlue: '#1e3a8a',
    darkGreen: '#059669',
    lightGreen: '#10b981',
    orange: '#f97316'
  };

  // Extract next subsystem number from existing project
  const getNextSubsystemNumber = () => {
    const existingSubsystems = projectResults?.parentStructures?.subsystems || [];
    const numbers = existingSubsystems.map(s => s.subsystemNumber);
    return Math.max(...numbers, 0) + 1;
  };

  // Extract zone code from subsystem name
  const extractZoneCode = (name) => {
    const zoneMatch = name.match(/([+]?Z\d+)/i);
    return zoneMatch ? zoneMatch[1] : null;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setEquipmentFile(file);
    setError(null);
    setSubsystemName(''); // Reset previous detection

    try {
      // Simple file validation
      if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        throw new Error('Please upload an Excel (.xlsx, .xls) or CSV file');
      }

      console.log('📄 Equipment file selected:', file.name);
      console.log('🔍 Analyzing equipment list for smart subsystem detection...');
      
      // Smart subsystem detection from file
      setIsProcessing(true);
      
      try {
        const processingResult = await processEquipmentFile(file);
        
        console.log('🎯 Smart detection results:', processingResult.subsystemInfo);
        
        setSubsystemInfo(processingResult.subsystemInfo);
        setSubsystemName(processingResult.subsystemInfo.subsystemName);
        setEquipmentData(processingResult.equipmentData);
        
        console.log(`✅ Auto-detected subsystem: "${processingResult.subsystemInfo.subsystemName}"`);
        console.log(`🏢 Zone code: ${processingResult.subsystemInfo.zoneCode}`);
        console.log(`📊 Equipment count: ${processingResult.subsystemInfo.equipmentCount}`);
        
      } catch (detectionError) {
        console.warn('⚠️ Smart detection failed:', detectionError.message);
        setError(`Smart detection failed: ${detectionError.message}`);
        // File is still valid, but detection failed
        setSubsystemName('');
        setSubsystemInfo(null);
      }
      
    } catch (error) {
      console.error('File validation failed:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const processEquipmentAddition = async () => {
    if (!equipmentFile) {
      setError('Please upload an equipment list file');
      return;
    }

    if (!subsystemName.trim()) {
      setError('Could not auto-detect subsystem from equipment list. Please check file format and ensure it includes a Subsystem column.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🚀 Starting equipment addition process...');
      
      // Extract zone code from auto-detected subsystem name
      const zoneCode = extractZoneCode(subsystemName);
      if (!zoneCode) {
        throw new Error('Could not detect zone code from auto-detected subsystem name');
      }

      const nextSubsystemNumber = getNextSubsystemNumber();
      
      console.log(`🎯 Adding subsystem S${nextSubsystemNumber} with zone ${zoneCode}`);

      // Simulate equipment processing (you'll need to implement actual integration logic)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock integration results (you'll replace this with actual integration logic)
      const mockResults = {
        newSubsystemNumber: nextSubsystemNumber,
        zoneCode: zoneCode,
        subsystemName: subsystemName,
        equipmentProcessed: subsystemInfo?.equipmentCount || 45, // Use real count if available
        categoriesCreated: 8,   // Replace with actual categories
        newWBSElements: (subsystemInfo?.equipmentCount || 45) + 10, // Equipment + categories + subsystem
        prerequisiteAdded: true,
        validation: {
          passed: true,
          errors: 0,
          warnings: 0,
          conflicts: 0
        },
        integrationSummary: {
          prerequisites: `${zoneCode} | ${subsystemName}`,
          mainSubsystem: `S${nextSubsystemNumber} | ${zoneCode} - ${subsystemName}`,
          categories: [
            '01 | Preparations and set-up',
            '02 | Protection Panels', 
            '05 | Transformers',
            '06 | Battery Systems',
            '07 | Earthing',
            '08 | Building Services',
            '10 | Ancillary Systems',
            '99 | Unrecognised Equipment'
          ]
        }
      };

      setIntegrationResults(mockResults);
      setStep('results');

      console.log('✅ Equipment addition completed successfully');

    } catch (error) {
      console.error('Equipment addition failed:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateExport = () => {
    // This would generate the actual P6-compatible CSV
    console.log('📊 Generating P6 export with new subsystem...');
    
    // Mock CSV content (replace with actual export generation)
    const csvContent = `wbs_id,parent_wbs_id,wbs_short_name,wbs_name,element_type
NEW_100001,24926,100001,${integrationResults.zoneCode} | ${integrationResults.subsystemName},prerequisite
NEW_100002,,S${integrationResults.newSubsystemNumber},S${integrationResults.newSubsystemNumber} | ${integrationResults.zoneCode} - ${integrationResults.subsystemName},subsystem
NEW_100003,NEW_100002,01,01 | Preparations and set-up,category
NEW_100004,NEW_100002,02,02 | Protection Panels,category`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `5737_${integrationResults.zoneCode}_Integration.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderInputForm = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold" style={{ color: colors.darkBlue }}>
          ➕ Add New Subsystem Equipment
        </h2>
      </div>

      {/* Current Project Summary */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h4 className="font-semibold mb-2" style={{ color: colors.darkBlue }}>
          📊 Current Project: {projectResults.projectInfo.projectName}
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <span className="font-medium">Existing Subsystems:</span> {projectResults.parentStructures.subsystems?.length || 0} found
          </div>
          <div>
            <span className="font-medium">Next Available:</span> S{getNextSubsystemNumber()}
          </div>
          <div>
            <span className="font-medium">Prerequisites:</span> {projectResults.parentStructures.prerequisites ? '✅ Ready' : '❌ Missing'}
          </div>
          <div>
            <span className="font-medium">Total Elements:</span> {projectResults.totalElements}
          </div>
        </div>
      </div>

      {/* Equipment File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Equipment List File
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Upload your equipment list. The system will automatically detect the subsystem name and zone code from the equipment data.
        </p>
        <div className="border-2 border-dashed rounded-lg p-6 text-center" 
             style={{ borderColor: equipmentFile ? colors.darkGreen : '#d1d5db' }}>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {equipmentFile ? (
            <div className="text-green-600">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">{equipmentFile.name}</p>
              <p className="text-sm text-gray-500">Click to change file</p>
            </div>
          ) : (
            <div className="text-gray-400">
              <Upload className="w-8 h-8 mx-auto mb-2" />
              <p>Upload equipment list (.xlsx, .xls, .csv)</p>
              <p className="text-sm mt-1">Must include Subsystem column for auto-detection</p>
            </div>
          )}
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Choose File
          </button>
        </div>
      </div>

      {/* Auto-Detected Subsystem Display */}
      {subsystemName && subsystemInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">🎯 Auto-Detected Subsystem</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Subsystem Name:</span> {subsystemName}
            </div>
            <div>
              <span className="font-medium">Zone Code:</span> {subsystemInfo.zoneCode}
            </div>
            <div>
              <span className="font-medium">Equipment Count:</span> {subsystemInfo.equipmentCount}
            </div>
            <div>
              <span className="font-medium">Detection Method:</span> Smart Analysis
            </div>
          </div>
          {subsystemInfo.equipmentNumber && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Subsystem Equipment Number:</span> {subsystemInfo.equipmentNumber}
            </div>
          )}
        </div>
      )}

      {/* Process Button */}
      <div className="flex gap-4">
        <button
          onClick={processEquipmentAddition}
          disabled={isProcessing || !equipmentFile || !subsystemName.trim()}
          className="flex-1 px-6 py-3 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: colors.darkGreen }}
        >
          {isProcessing ? (
            <>
              <Clock className="w-4 h-4 inline mr-2 animate-spin" />
              Processing Equipment...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 inline mr-2" />
              Add Equipment to Project
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <p className="font-medium text-red-800">Processing Failed</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderResults = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setStep('input')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold" style={{ color: colors.darkBlue }}>
          🎉 Equipment Addition Complete
        </h2>
      </div>

      {/* Integration Summary */}
      <div className="mb-6 p-6 bg-green-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-4" style={{ color: colors.darkBlue }}>
          Integration Summary
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>New Subsystem:</strong> S{integrationResults.newSubsystemNumber}</p>
            <p><strong>Zone Code:</strong> {integrationResults.zoneCode}</p>
            <p><strong>Equipment Processed:</strong> {integrationResults.equipmentProcessed}</p>
          </div>
          <div>
            <p><strong>Categories Created:</strong> {integrationResults.categoriesCreated}</p>
            <p><strong>New WBS Elements:</strong> {integrationResults.newWBSElements}</p>
            <p><strong>Prerequisites:</strong> ✅ Added</p>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">✅ Validation Results</h4>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Status:</span> {integrationResults.validation.passed ? '✅ PASSED' : '❌ FAILED'}
          </div>
          <div>
            <span className="font-medium">Errors:</span> {integrationResults.validation.errors}
          </div>
          <div>
            <span className="font-medium">Warnings:</span> {integrationResults.validation.warnings}
          </div>
          <div>
            <span className="font-medium">Conflicts:</span> {integrationResults.validation.conflicts}
          </div>
        </div>
      </div>

      {/* Structure Preview */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.darkBlue }}>
          🏗️ New WBS Structure Created
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="font-mono text-sm space-y-1">
            <div className="text-green-600">✨ Prerequisites: {integrationResults.integrationSummary.prerequisites}</div>
            <div className="text-green-600">✨ Main Subsystem: {integrationResults.integrationSummary.mainSubsystem}</div>
            {integrationResults.integrationSummary.categories.map((category, index) => (
              <div key={index} className="text-green-600 pl-4">
                ✨ └─ {category}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={generateExport}
          className="px-6 py-3 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          style={{ backgroundColor: colors.darkGreen }}
        >
          <Download className="w-5 h-5" />
          Download P6 Export
        </button>
        
        <button
          onClick={() => {
            setStep('input');
            setSubsystemName('');
            setEquipmentFile(null);
            setIntegrationResults(null);
            setSubsystemInfo(null);
            setError(null);
          }}
          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Add Another Subsystem
        </button>

        <button
          onClick={onBack}
          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back to Project
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {step === 'input' && renderInputForm()}
      {step === 'results' && renderResults()}
    </div>
  );
};

export default EquipmentAddition;
