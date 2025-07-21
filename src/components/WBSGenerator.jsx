// src/components/WBSGenerator.jsx - Main WBS Generator orchestrator component

import React, { useState, useRef, createContext, useContext } from 'react';
import { Upload, Download, Settings, Plus, FileText, Zap, ChevronRight, ChevronDown, Eye, EyeOff } from 'lucide-react';

// Import utilities
import { rjeColors, uploadModes, errorMessages, successMessages } from './utils/constants.js';
import { processEquipmentFile, processWBSFile, exportWBSToCSV, exportProjectState } from './utils/equipmentUtils.js';
import { generateWBS, generateMissingEquipmentWBS } from './utils/wbsUtils.js';
import ContinueProject from './modes/ContinueProject.jsx';

// Import the full WBS Tree Visualization component
import WBSTreeVisualization from './shared/WBSTreeVisualization.jsx';

// Project Context for state management
const ProjectContext = createContext({
  projectState: null,
  setProjectState: () => {}
});

// Main WBS Generator App Component
const WBSGeneratorApp = () => {
  const [projectState, setProjectState] = useState(null);

  return (
    <ProjectContext.Provider value={{ projectState, setProjectState }}>
      <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${rjeColors.lightGreen}, ${rjeColors.blue})` }}>
        <div className="container mx-auto px-4 py-8">
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
          <WBSGenerator />
        </div>
      </div>
    </ProjectContext.Provider>
  );
};

// Main WBS Generator Component
const WBSGenerator = () => {
  const { projectState, setProjectState } = useContext(ProjectContext);
  const [uploadMode, setUploadMode] = useState(uploadModes.NEW_PROJECT);
  const [equipmentData, setEquipmentData] = useState([]);
  const [wbsOutput, setWbsOutput] = useState([]);
  const [wbsVisualization, setWbsVisualization] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectName, setProjectName] = useState('Sample Project');
  const [missingEquipmentConfig, setMissingEquipmentConfig] = useState({
    existingWbsNodes: null,
    existingProjectName: null
  });
  const [missingEquipmentAnalysis, setMissingEquipmentAnalysis] = useState({
    newEquipment: [],
    existingEquipment: [],
    removedEquipment: []
  });
  const [showRemovedEquipment, setShowRemovedEquipment] = useState(false);
  
  // File input refs
  const fileInputRef = useRef(null);
  const projectStateInputRef = useRef(null);
  const missingEquipmentStateInputRef = useRef(null);

  // Clear WBS data when switching modes
  const clearWBSData = () => {
    setWbsOutput([]);
    setWbsVisualization([]);
    setEquipmentData([]);
    setMissingEquipmentAnalysis({
      newEquipment: [],
      existingEquipment: [],
      removedEquipment: []
    });
  };

  // Handle equipment file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      console.log(`🚀 Processing file: ${file.name} for mode: ${uploadMode}`);
      
      // Process the equipment file
      const equipmentList = await processEquipmentFile(file);
      setEquipmentData(equipmentList);
      
      // Generate WBS based on mode
      if (uploadMode === uploadModes.MISSING_EQUIPMENT) {
        await generateMissingEquipmentWBSHandler(equipmentList);
      } else {
        await generateWBSHandler(equipmentList);
      }
      
      console.log('✅ File processing complete');
      
    } catch (error) {
      console.error('File processing error:', error);
      alert(error.message || errorMessages.FILE_PROCESSING_ERROR);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle WBS structure file upload (for continue/missing modes)
  const handleWBSFileUpload = async (event, isForMissingEquipment = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log(`🚀 Processing WBS file: ${file.name}`);
      
      const wbsData = await processWBSFile(file);
      
      if (isForMissingEquipment) {
        setMissingEquipmentConfig(prev => ({
          ...prev,
          existingWbsNodes: wbsData.wbsNodes,
          existingProjectName: wbsData.projectName
        }));
        console.log('✅ WBS structure loaded for missing equipment mode');
      } else {
        // For continue mode
        const loadedState = {
          ...wbsData,
          timestamp: new Date().toISOString()
        };
        
        setProjectState(loadedState);
        setProjectName(loadedState.projectName);
        setWbsVisualization(loadedState.wbsNodes);
        setWbsOutput(loadedState.wbsNodes);
        console.log('✅ WBS structure loaded for continue mode');
      }
      
    } catch (error) {
      console.error('WBS file processing error:', error);
      alert(error.message || errorMessages.FILE_PROCESSING_ERROR);
    }
  };

  // Generate WBS for new/continue modes
  const generateWBSHandler = async (data) => {
    try {
      console.log(`🏗️ Generating WBS - Mode: ${uploadMode}`);
      
      const result = generateWBS(data, projectName, projectState, uploadMode);
      
      if (uploadMode === uploadModes.NEW_PROJECT) {
        setWbsVisualization(result.allNodes);
        setWbsOutput(result.allNodes);
      } else {
        setWbsVisualization(result.allNodes);
        setWbsOutput(result.newNodes);
      }
      
      setProjectState(result.projectState);
      console.log('✅ WBS generation complete');
      
    } catch (error) {
      console.error('WBS generation error:', error);
      alert(error.message || 'Error generating WBS structure');
    }
  };

  // Generate WBS for missing equipment mode
  const generateMissingEquipmentWBSHandler = async (newEquipmentList) => {
    try {
      console.log('🔧 Generating missing equipment WBS');
      
      if (!missingEquipmentConfig.existingWbsNodes) {
        alert(errorMessages.NO_WBS_STRUCTURE);
        return;
      }
      
      const result = generateMissingEquipmentWBS(
        newEquipmentList,
        missingEquipmentConfig.existingWbsNodes,
        missingEquipmentConfig.existingProjectName
      );
      
      setMissingEquipmentAnalysis(result.analysis);
      setWbsVisualization(result.allNodes);
      setWbsOutput(result.newNodes);
      setProjectName(result.projectName);
      
      if (result.newNodes.length === 0) {
        alert(errorMessages.MISSING_EQUIPMENT_NONE);
      } else {
        console.log(`✅ Missing equipment WBS complete - ${result.newNodes.length} new nodes`);
      }
      
    } catch (error) {
      console.error('Missing equipment WBS generation error:', error);
      alert(error.message || 'Error generating missing equipment WBS');
    }
  };

  // Export handlers
  const handleExportWBSCSV = () => {
    if (wbsOutput.length === 0) return;
    
    const filename = uploadMode === uploadModes.MISSING_EQUIPMENT 
      ? `${projectName}_NEW_Equipment_P6_Import`
      : `${projectName}_WBS_P6_Import`;
    
    exportWBSToCSV(wbsOutput, filename);
  };

  const handleExportProjectState = () => {
    if (!projectState) return;
    exportProjectState(projectState);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Selection */}
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
            onClick={() => {
              setUploadMode(uploadModes.NEW_PROJECT);
              clearWBSData();
            }}
            className={`p-6 rounded-lg border-2 transition-all ${
              uploadMode === uploadModes.NEW_PROJECT ? 'border-opacity-100 shadow-lg' : 'border-opacity-30 hover:border-opacity-60'
            }`}
            style={{ 
              borderColor: rjeColors.mediumGreen,
              backgroundColor: uploadMode === uploadModes.NEW_PROJECT ? `${rjeColors.mediumGreen}20` : 'white'
            }}
          >
            <Zap className="w-8 h-8 mx-auto mb-3" style={{ color: rjeColors.mediumGreen }} />
            <div className="font-semibold text-lg mb-2">Start New Project</div>
            <div className="text-sm text-gray-600">Begin with fresh WBS structure</div>
          </button>
          
          <button
            onClick={() => {
              setUploadMode(uploadModes.CONTINUE_PROJECT);
              clearWBSData();
            }}
            className={`p-6 rounded-lg border-2 transition-all ${
              uploadMode === uploadModes.CONTINUE_PROJECT ? 'border-opacity-100 shadow-lg' : 'border-opacity-30 hover:border-opacity-60'
            }`}
            style={{ 
              borderColor: rjeColors.darkGreen,
              backgroundColor: uploadMode === uploadModes.CONTINUE_PROJECT ? `${rjeColors.darkGreen}20` : 'white'
            }}
          >
            <Plus className="w-8 h-8 mx-auto mb-3" style={{ color: rjeColors.darkGreen }} />
            <div className="font-semibold text-lg mb-2">Continue Project</div>
            <div className="text-sm text-gray-600">Add subsystems to existing WBS</div>
          </button>
          
          <button
            onClick={() => {
              setUploadMode(uploadModes.MISSING_EQUIPMENT);
              clearWBSData();
            }}
            className={`p-6 rounded-lg border-2 transition-all ${
              uploadMode === uploadModes.MISSING_EQUIPMENT ? 'border-opacity-100 shadow-lg' : 'border-opacity-30 hover:border-opacity-60'
            }`}
            style={{ 
              borderColor: rjeColors.teal,
              backgroundColor: uploadMode === uploadModes.MISSING_EQUIPMENT ? `${rjeColors.teal}20` : 'white'
            }}
          >
            <Settings className="w-8 h-8 mx-auto mb-3" style={{ color: rjeColors.teal }} />
            <div className="font-semibold text-lg mb-2">Add Missing Equipment</div>
            <div className="text-sm text-gray-600">Insert individual equipment items</div>
          </button>
        </div>
      </div>

      {/* Mode-specific UI */}
      {uploadMode === uploadModes.NEW_PROJECT && (
        <StartNewProjectMode 
          projectName={projectName}
          setProjectName={setProjectName}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          isProcessing={isProcessing}
        />
      )}

      {uploadMode === uploadModes.CONTINUE_PROJECT && (
        <ContinueProjectMode
          projectState={projectState}
          projectStateInputRef={projectStateInputRef}
          handleWBSFileUpload={handleWBSFileUpload}
          handleFileUpload={handleFileUpload}
          isProcessing={isProcessing}
        />
      )}

      {uploadMode === uploadModes.MISSING_EQUIPMENT && (
        <MissingEquipmentMode
          missingEquipmentConfig={missingEquipmentConfig}
          missingEquipmentAnalysis={missingEquipmentAnalysis}
          showRemovedEquipment={showRemovedEquipment}
          setShowRemovedEquipment={setShowRemovedEquipment}
          missingEquipmentStateInputRef={missingEquipmentStateInputRef}
          handleWBSFileUpload={handleWBSFileUpload}
          handleFileUpload={handleFileUpload}
          isProcessing={isProcessing}
        />
      )}

      {/* WBS Output */}
      {(wbsOutput.length > 0 || wbsVisualization.length > 0) && (
        <div className="space-y-6">
          <WBSTreeVisualization wbsNodes={wbsVisualization.length > 0 ? wbsVisualization : wbsOutput} />
          
          <ExportPanel
            uploadMode={uploadMode}
            wbsOutput={wbsOutput}
            projectName={projectName}
            equipmentData={equipmentData}
            missingEquipmentAnalysis={missingEquipmentAnalysis}
            projectState={projectState}
            handleExportWBSCSV={handleExportWBSCSV}
            handleExportProjectState={handleExportProjectState}
          />
        </div>
      )}
    </div>
  );
};

// Start New Project Mode Component
const StartNewProjectMode = ({ projectName, setProjectName, fileInputRef, handleFileUpload, isProcessing }) => (
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
        accept=".csv,.xlsx,.xls"
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

const ContinueProjectMode = () => <ContinueProject />;

// Missing Equipment Mode Component
const MissingEquipmentMode = ({ 
  missingEquipmentConfig, 
  missingEquipmentAnalysis, 
  showRemovedEquipment, 
  setShowRemovedEquipment,
  missingEquipmentStateInputRef,
  handleWBSFileUpload,
  handleFileUpload,
  isProcessing 
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
      🔧 Add Missing Equipment
    </h2>
    
    <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.teal + '15' }}>
      <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
        How this works:
      </h4>
      <ul className="text-sm space-y-1 text-gray-700">
        <li>• <strong>Step 1:</strong> Load your existing WBS structure (CSV from previous export)</li>
        <li>• <strong>Step 2:</strong> Upload complete equipment list (original + new equipment)</li>
        <li>• System will identify new equipment by comparing Equipment Numbers</li>
        <li>• <strong>FIXED:</strong> Only commissioned equipment (Y/TBC) will be processed</li>
        <li>• <strong>FIXED:</strong> Invalid equipment numbers will be filtered out</li>
        <li>• Only genuinely new equipment will be exported with proper WBS codes</li>
      </ul>
    </div>

    <div className="mb-6">
      <h4 className="font-semibold mb-3" style={{ color: rjeColors.darkBlue }}>
        Step 1: Load Existing WBS Structure
      </h4>
      <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: rjeColors.teal }}>
        <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: rjeColors.teal }} />
        <p className="text-md font-medium mb-2">Load Existing WBS Structure</p>
        <p className="text-gray-600 mb-4">CSV or Excel (.xlsx) file with WBS structure</p>
        <input
          ref={missingEquipmentStateInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => handleWBSFileUpload(e, true)}
          className="hidden"
        />
        <button
          onClick={() => missingEquipmentStateInputRef.current?.click()}
          className="px-4 py-2 text-white rounded-lg font-medium"
          style={{ backgroundColor: rjeColors.teal }}
        >
          Load WBS Structure
        </button>
        {missingEquipmentConfig.existingWbsNodes && (
          <div className="mt-3 text-sm text-green-600">
            ✅ Loaded: {missingEquipmentConfig.existingProjectName} - {missingEquipmentConfig.existingWbsNodes.length} WBS nodes
          </div>
        )}
      </div>
    </div>

    {missingEquipmentConfig.existingWbsNodes && (
      <div>
        <h4 className="font-semibold mb-3" style={{ color: rjeColors.darkBlue }}>
          Step 2: Upload Complete Equipment List
        </h4>
        <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: rjeColors.teal }}>
          <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: rjeColors.teal }} />
          <p className="text-lg font-medium mb-2">Upload Complete Equipment List</p>
          <p className="text-gray-600 mb-4">Excel (.xlsx) or CSV files supported</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="missing-file-upload"
          />
          <button
            onClick={() => document.getElementById('missing-file-upload')?.click()}
            disabled={isProcessing}
            className="px-6 py-3 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
            style={{ backgroundColor: rjeColors.teal }}
          >
            {isProcessing ? 'Processing Equipment List...' : 'Choose Equipment File'}
          </button>
        </div>
        
        {missingEquipmentAnalysis.removedEquipment.length > 0 && (
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#FED7AA' }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-orange-800">
                ⚠️ {missingEquipmentAnalysis.removedEquipment.length} equipment items were removed from the list
              </h4>
              <button
                onClick={() => setShowRemovedEquipment(!showRemovedEquipment)}
                className="text-sm text-orange-600 hover:text-orange-800"
              >
                {showRemovedEquipment ? 'Hide' : 'Show'} Details
              </button>
            </div>
            <p className="text-sm text-orange-700 mb-2">
              These equipment items existed in your WBS but are not in the new equipment list. They need to be handled manually in P6.
            </p>
            {showRemovedEquipment && (
              <div className="mt-3 max-h-32 overflow-y-auto bg-white rounded p-3">
                <ul className="text-sm space-y-1">
                  {missingEquipmentAnalysis.removedEquipment.map((equipmentNumber, index) => (
                    <li key={index} className="text-gray-700">
                      • {equipmentNumber}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )}
  </div>
);

// Export Panel Component
const ExportPanel = ({ 
  uploadMode, 
  wbsOutput, 
  projectName, 
  equipmentData, 
  missingEquipmentAnalysis, 
  projectState,
  handleExportWBSCSV,
  handleExportProjectState 
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
      {uploadMode === uploadModes.MISSING_EQUIPMENT 
        ? `Export New Equipment (${wbsOutput.length} new items)` 
        : `Export WBS Structure (${wbsOutput.length} nodes)`
      } - WBS Generator v2.0
    </h3>
    
    <div className="flex flex-wrap gap-3 mb-6">
      <button
        onClick={handleExportWBSCSV}
        className="flex items-center px-4 py-2 text-white rounded-lg font-medium"
        style={{ backgroundColor: rjeColors.teal }}
      >
        <Download className="w-4 h-4 mr-2" />
        {uploadMode === uploadModes.MISSING_EQUIPMENT 
          ? 'Export NEW Equipment CSV (for P6 Import)' 
          : 'Export WBS CSV (for P6 & Continue Project)'
        }
      </button>
      {uploadMode !== uploadModes.MISSING_EQUIPMENT && (
        <button
          onClick={handleExportProjectState}
          className="flex items-center px-4 py-2 text-white rounded-lg font-medium"
          style={{ backgroundColor: rjeColors.darkGreen }}
        >
          <FileText className="w-4 h-4 mr-2" />
          Export Project State (JSON)
        </button>
      )}
    </div>

    {/* Statistics */}
    {uploadMode === uploadModes.MISSING_EQUIPMENT ? (
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.mediumGreen}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {missingEquipmentAnalysis.newEquipment.filter(item => item.commissioning === 'Y').length}
          </div>
          <div className="text-sm text-gray-600">New Equipment (Y)</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.teal}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {missingEquipmentAnalysis.newEquipment.filter(item => item.commissioning === 'TBC').length}
          </div>
          <div className="text-sm text-gray-600">New TBC Equipment</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.blue}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {missingEquipmentAnalysis.existingEquipment.length}
          </div>
          <div className="text-sm text-gray-600">Existing Equipment</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkBlue}20` }}>
          <div className="text-2xl font-bold text-white" style={{ backgroundColor: rjeColors.darkBlue }}>
            {missingEquipmentAnalysis.removedEquipment.length}
          </div>
          <div className="text-sm text-gray-600">Removed Equipment</div>
        </div>
      </div>
    ) : (
      <div className="grid md:grid-cols-5 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.mediumGreen}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {wbsOutput.length}
          </div>
          <div className="text-sm text-gray-600">Total WBS Nodes</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkGreen}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {projectState?.subsystems.length || 0}
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
    )}

    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
      <p className="text-sm text-gray-700">
        {uploadMode === uploadModes.MISSING_EQUIPMENT ? (
          <><strong>🎯 Ready for P6 Import:</strong> This export contains only the <strong>new equipment</strong> that wasn't in your existing WBS. 
          Import this file into P6 to add the missing equipment without affecting existing items.</>
        ) : (
          <><strong>💡 P6 Import Ready:</strong> Use the <strong>WBS CSV export</strong> for Primavera P6 import or to continue this project later. 
          The CSV file uses comma-separated format optimized for P6 compatibility with hierarchical decimal numbering.</>
        )}
      </p>
    </div>
  </div>
);

export default WBSGeneratorApp;
