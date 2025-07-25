// src/components/WBSGenerator.jsx - Complete fix for React error #130 + Conditional Visualization

import StartNewProjectVisualization from './shared/StartNewProjectVisualization.jsx';
import React, { useState, useRef, createContext, useContext } from 'react';
import { 
  Upload, Download, Settings, Plus, FileText, Zap, ChevronRight, ChevronDown, 
  Eye, EyeOff, CheckCircle, Circle, Clock, Building2, AlertTriangle
} from 'lucide-react';

// Import utilities
import { rjeColors, uploadModes, errorMessages, successMessages } from './utils/constants.js';
import { processEquipmentFile, processWBSFile, exportWBSToCSV, exportProjectState } from './utils/equipmentUtils.js';
import { generateWBS, generateMissingEquipmentWBS } from './utils/wbsUtils.js';

// SAFETY: Ensure all values are safe for React rendering
const safeString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const sanitizeWBSNode = (node) => {
  if (!node || typeof node !== 'object') return null;
  
  return {
    wbs_code: safeString(node.wbs_code),
    parent_wbs_code: safeString(node.parent_wbs_code),
    wbs_name: safeString(node.wbs_name),
    wbs_id: safeString(node.wbs_id),
    element_type: safeString(node.element_type),
    is_new: Boolean(node.is_new),
    is_existing: Boolean(node.is_existing)
  };
};

const sanitizeWBSArray = (array) => {
  if (!Array.isArray(array)) return [];
  return array.map(sanitizeWBSNode).filter(node => node !== null);
};

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

  // Enhanced WBS structure file upload (for continue/missing modes) with XER support
  const handleWBSFileUpload = async (event, isForMissingEquipment = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log(`🚀 Processing WBS file: ${file.name}`);
      
      let wbsData;
      
      // Check if it's an XER file and use enhanced processing for continue project mode
      if (file.name.toLowerCase().endsWith('.xer') && !isForMissingEquipment) {
        try {
          // Use existing XER parser
          const { analyzeXERFile } = await import('./utils/xerParser.js');
          const xerAnalysis = await analyzeXERFile(file);
          
          // Convert to expected format
          wbsData = {
            projectName: xerAnalysis.projectInfo?.projectName || xerAnalysis.summary?.projectName || 'Unknown Project',
            totalElements: xerAnalysis.totalElements || xerAnalysis.wbsElements?.length || 0,
            wbsNodes: xerAnalysis.wbsElements?.map(element => ({
              wbs_code: element.wbs_short_name || element.wbs_id,
              parent_wbs_code: element.parent_wbs_id || null,
              wbs_name: element.wbs_name,
              wbs_id: element.wbs_id,
              is_existing: true
            })) || [],
            parentStructures: xerAnalysis.parentStructures,
            summary: xerAnalysis.summary,
            originalXERData: xerAnalysis.wbsElements
          };
          
          console.log('✅ XER file processed with existing XER parser');
        } catch (xerError) {
          console.warn('XER processing failed, falling back to standard processing:', xerError);
          wbsData = await processWBSFile(file);
        }
      } else {
        // Use standard Excel/CSV processing
        wbsData = await processWBSFile(file);
      }
      
      if (isForMissingEquipment) {
        setMissingEquipmentConfig(prev => ({
          ...prev,
          existingWbsNodes: wbsData.wbsNodes,
          existingProjectName: wbsData.projectName
        }));
        console.log('✅ WBS structure loaded for missing equipment mode');
      } else {
        // For continue mode with enhanced data
        const loadedState = {
          ...wbsData,
          timestamp: new Date().toISOString()
        };
        
        setProjectState(loadedState);
        setProjectName(loadedState.projectName);
        setWbsVisualization(sanitizeWBSArray(loadedState.wbsNodes));
        setWbsOutput(sanitizeWBSArray(loadedState.wbsNodes));
        console.log('✅ Enhanced WBS structure loaded for continue mode');
      }
      
    } catch (error) {
      console.error('WBS file processing error:', error);
      alert(error.message || errorMessages.FILE_PROCESSING_ERROR);
    }
  };

  // FIXED: Enhanced WBS generation handler with complete error handling
  const generateWBSHandler = async (data) => {
    try {
      console.log(`🏗️ Generating WBS - Mode: ${uploadMode}`);
      
      let result;
      
      if (uploadMode === uploadModes.CONTINUE_PROJECT && projectState) {
        try {
          // Extract subsystem name from equipment data
          const firstItem = data.find(item => item?.subsystem);
          const subsystemName = firstItem?.subsystem || 'New Subsystem';
          
          // Use correct parameter order
          const { processContinueProjectWBS } = await import('./utils/continueProjectIntegration.js');
          const integrationResult = await processContinueProjectWBS(
            projectState.wbsNodes || projectState.originalXERData || [], // existingWBSNodes
            data, // equipmentList
            projectState.projectName || projectName, // projectName
            subsystemName // subsystemName
          );
          
          console.log('🔧 Integration result received:', integrationResult);
          
          // FIXED: Completely safe data transformation
          const allNodes = [
            ...(projectState.wbsNodes || []),
            ...(integrationResult.newElements || [])
          ];
          
          const newNodes = integrationResult.newElements || [];
          
          console.log('📊 Processing nodes for React safety:');
          console.log(`   All nodes: ${allNodes.length}`);
          console.log(`   New nodes: ${newNodes.length}`);
          
          // Sanitize all data before setting state
          const safeAllNodes = sanitizeWBSArray(allNodes);
          const safeNewNodes = sanitizeWBSArray(newNodes);
          
          console.log('✅ Sanitized nodes:');
          console.log(`   Safe all nodes: ${safeAllNodes.length}`);
          console.log(`   Safe new nodes: ${safeNewNodes.length}`);
          
          // Create completely safe result object
          result = {
            allNodes: safeAllNodes,
            newNodes: safeNewNodes,
            projectState: {
              projectName: safeString(projectState.projectName || 'Unknown Project'),
              totalElements: safeNumber(projectState.totalElements || 0),
              subsystems: [...(projectState.subsystems || []), subsystemName].map(safeString),
              lastWbsCode: safeNumber((projectState.lastWbsCode || 0) + 1),
              timestamp: safeString(new Date().toISOString()),
              wbsNodes: safeAllNodes
            }
          };
          
          console.log('✅ Using enhanced continue project integration');
          
        } catch (continueError) {
          console.error('❌ Continue project integration failed:', continueError);
          console.warn('Falling back to standard generation');
          result = generateWBS(data, projectName, projectState, uploadMode);
        }
      } else {
        // Use existing logic for new projects
        result = generateWBS(data, projectName, projectState, uploadMode);
      }
      
      // SAFETY: Ensure result is properly structured
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid result from WBS generation');
      }
      
      // SAFETY: Sanitize arrays before setting state
      const safeAllNodes = sanitizeWBSArray(result.allNodes || []);
      const safeNewNodes = sanitizeWBSArray(result.newNodes || []);
      
      console.log('🛡️ Final safety check before state update:');
      console.log(`   Safe visualization nodes: ${safeAllNodes.length}`);
      console.log(`   Safe output nodes: ${uploadMode === uploadModes.NEW_PROJECT ? safeAllNodes.length : safeNewNodes.length}`);
      
      // Update visualization with safe data
      setWbsVisualization(safeAllNodes);
      
      // Update output based on mode
      if (uploadMode === uploadModes.NEW_PROJECT) {
        setWbsOutput(safeAllNodes);
      } else {
        setWbsOutput(safeNewNodes);
      }
      
      // Update project state safely
      if (result.projectState) {
        const safeProjectState = {
          ...result.projectState,
          projectName: safeString(result.projectState.projectName),
          totalElements: safeNumber(result.projectState.totalElements),
          lastWbsCode: safeNumber(result.projectState.lastWbsCode),
          timestamp: safeString(result.projectState.timestamp),
          subsystems: Array.isArray(result.projectState.subsystems) 
            ? result.projectState.subsystems.map(safeString) 
            : [],
          wbsNodes: sanitizeWBSArray(result.projectState.wbsNodes || [])
        };
        setProjectState(safeProjectState);
      }
      
      console.log('✅ WBS generation complete - all data sanitized');
      
    } catch (error) {
      console.error('❌ WBS generation error:', error);
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
      
      // Sanitize missing equipment analysis
      const safeAnalysis = {
        newEquipment: Array.isArray(result.analysis?.newEquipment) ? result.analysis.newEquipment : [],
        existingEquipment: Array.isArray(result.analysis?.existingEquipment) ? result.analysis.existingEquipment : [],
        removedEquipment: Array.isArray(result.analysis?.removedEquipment) 
          ? result.analysis.removedEquipment.map(safeString) 
          : []
      };
      
      setMissingEquipmentAnalysis(safeAnalysis);
      setWbsVisualization(sanitizeWBSArray(result.allNodes));
      setWbsOutput(sanitizeWBSArray(result.newNodes));
      setProjectName(safeString(result.projectName));
      
      if ((result.newNodes || []).length === 0) {
        alert(errorMessages.MISSING_EQUIPMENT_NONE);
      } else {
        console.log(`✅ Missing equipment WBS complete - ${(result.newNodes || []).length} new nodes`);
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
        <EnhancedContinueProjectMode
          projectState={projectState}
          setProjectState={setProjectState}
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

      {/* WBS Output - Conditional Rendering by Mode */}
      {(wbsOutput.length > 0 || wbsVisualization.length > 0) && (
        <div className="space-y-6">
          
          {/* StartNewProject Visualization */}
          {uploadMode === uploadModes.NEW_PROJECT && (
            <StartNewProjectVisualization 
              wbsNodes={wbsVisualization.length > 0 ? wbsVisualization : wbsOutput} 
            />
          )}
          
          {/* Continue Project Visualization - Coming Next */}
          {uploadMode === uploadModes.CONTINUE_PROJECT && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
                ➕ Continue Project Visualization (Coming Soon)
              </h3>
              <p className="text-gray-600 mb-4">ContinueProjectVisualization component will be created next...</p>
              
              {/* Temporary preview of data for debugging */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  📊 Debug Info: {wbsVisualization.length} visualization nodes, {wbsOutput.length} output nodes
                </p>
                {projectState && (
                  <p className="text-sm text-gray-700 mt-2">
                    📋 Project: {safeString(projectState.projectName)} ({safeString(projectState.totalElements)} elements)
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Missing Equipment Visualization - Coming Next */}
          {uploadMode === uploadModes.MISSING_EQUIPMENT && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
                🔧 Missing Equipment Visualization (Coming Soon)
              </h3>
              <p className="text-gray-600 mb-4">MissingEquipmentVisualization component will be created next...</p>
              
              {/* Temporary preview of analysis data */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  📊 Analysis: {safeString(missingEquipmentAnalysis.newEquipment.length)} new, {safeString(missingEquipmentAnalysis.existingEquipment.length)} existing, {safeString(missingEquipmentAnalysis.removedEquipment.length)} removed
                </p>
              </div>
            </div>
          )}
          
          <ExportPanel
            uploadMode={uploadMode}
            wbsOutput={wbsOutput}
            projectName={safeString(projectName)}
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
        value={safeString(projectName)}
        onChange={(e) => setProjectName(safeString(e.target.value))}
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

// Enhanced Continue Project Mode Component with Step-based Workflow
const EnhancedContinueProjectMode = ({ 
  projectState, 
  setProjectState, 
  handleFileUpload, 
  isProcessing 
}) => {
  const [step, setStep] = useState('upload');
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleXERFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('🚀 Analyzing XER file for available projects...');
      
      const { getAvailableProjects, processSelectedProject } = await import('./utils/xerParser.js');
      const analysis = await getAvailableProjects(file);
      
      setAnalysisResult(analysis);
      setAvailableProjects(analysis.availableProjects);
      
      if (analysis.availableProjects.length === 1) {
        // Single project - process immediately
        console.log('📊 Single project found - processing automatically');
        const projectResult = await processSelectedProject(analysis, analysis.availableProjects[0].proj_id);
        
        const loadedState = {
          projectName: safeString(projectResult.projectInfo.projectName),
          totalElements: safeNumber(projectResult.totalElements),
          wbsNodes: sanitizeWBSArray(projectResult.wbsElements?.map(element => ({
            wbs_code: element.wbs_short_name || element.wbs_id,
            parent_wbs_code: element.parent_wbs_id || null,
            wbs_name: element.wbs_name,
            wbs_id: element.wbs_id,
            is_existing: true
          })) || []),
          parentStructures: projectResult.parentStructures,
          projectInfo: projectResult.projectInfo,
          originalXERData: projectResult.wbsElements,
          timestamp: safeString(new Date().toISOString())
        };
        
        setProjectState(loadedState);
        setStep('equipment');
      } else if (analysis.availableProjects.length > 1) {
        // Multiple projects - show selection
        setStep('selecting');
        console.log(`📊 Found ${analysis.availableProjects.length} projects - manual selection required`);
      } else {
        setError('No projects found in XER file');
      }

    } catch (error) {
      console.error('🚫 XER Analysis failed:', error);
      setError('Failed to analyze XER file: ' + safeString(error.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    setIsAnalyzing(true);
    setError(null);

    try {
      console.log(`🏗️ Processing selected project: ${safeString(project.project_name)}`);
      
      const { processSelectedProject } = await import('./utils/xerParser.js');
      const projectResult = await processSelectedProject(analysisResult, project.proj_id);
      
      const loadedState = {
        projectName: safeString(projectResult.projectInfo.projectName),
        totalElements: safeNumber(projectResult.totalElements),
        wbsNodes: sanitizeWBSArray(projectResult.wbsElements?.map(element => ({
          wbs_code: element.wbs_short_name || element.wbs_id,
          parent_wbs_code: element.parent_wbs_id || null,
          wbs_name: element.wbs_name,
          wbs_id: element.wbs_id,
          is_existing: true
        })) || []),
        parentStructures: projectResult.parentStructures,
        projectInfo: projectResult.projectInfo,
        originalXERData: projectResult.wbsElements,
        timestamp: safeString(new Date().toISOString())
      };
      
      setProjectState(loadedState);
      setStep('equipment');
      console.log('✅ Project loaded successfully');

    } catch (error) {
      console.error('🚫 Project processing failed:', error);
      setError('Failed to process selected project: ' + safeString(error.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartOver = () => {
    setStep('upload');
    setAvailableProjects([]);
    setSelectedProject(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Step 1: Upload XER File
  if (step === 'upload') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
          ➕ Continue Existing Project
        </h2>
        
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
            Load your existing WBS structure:
          </h4>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>• Upload your P6 XER export file</li>
            <li>• Analyzes existing subsystems (S1, S2, etc.)</li>
            <li>• Identifies parent structures (Prerequisites, Milestones)</li>
            <li>• Ready to add new equipment with intelligent WBS codes</li>
          </ul>
        </div>

        <div className="border-2 border-dashed rounded-lg p-8 text-center" 
             style={{ borderColor: rjeColors.darkGreen }}>
          <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: rjeColors.darkGreen }} />
          <h3 className="text-lg font-semibold mb-2">Upload P6 XER Export File</h3>
          <p className="text-gray-600 mb-4">
            Select your P6 export file (.xer, .xlsx, .csv formats)
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xer,.csv,.xlsx,.xls"
            onChange={handleXERFileUpload}
            className="hidden"
            disabled={isAnalyzing}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="px-6 py-3 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: rjeColors.darkGreen }}
          >
            {isAnalyzing ? (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Analyzing XER File...
              </div>
            ) : (
              <div className="flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Choose XER File
              </div>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <p className="font-medium text-red-800">Analysis Failed</p>
                <p className="text-sm text-red-700">{safeString(error)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 2: Project Selection (if multiple projects found)
  if (step === 'selecting') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
          📊 Select Project to Continue
        </h2>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">📊 Available Projects</h4>
          <p className="text-sm text-blue-700">
            Found {safeString(availableProjects.length)} project{availableProjects.length === 1 ? '' : 's'} in your XER file. 
            Please select the project you want to continue:
          </p>
        </div>

        <div className="space-y-4">
          {availableProjects.map((project) => (
            <div
              key={safeString(project.proj_id)}
              className="border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300"
              style={{ 
                borderColor: selectedProject?.proj_id === project.proj_id ? rjeColors.darkGreen : '#e5e7eb'
              }}
              onClick={() => handleProjectSelect(project)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold" style={{ color: rjeColors.darkBlue }}>
                    {safeString(project.project_name)}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Project ID:</span> {safeString(project.proj_id)}
                    </div>
                    <div>
                      <span className="font-medium">Project Code:</span> {safeString(project.project_code)}
                    </div>
                    <div>
                      <span className="font-medium">WBS Elements:</span> {safeString(project.wbs_element_count)}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> Ready
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Building2 className="w-8 h-8 mr-4" style={{ color: rjeColors.darkGreen }} />
                  <CheckCircle 
                    className="w-6 h-6" 
                    style={{ 
                      color: selectedProject?.proj_id === project.proj_id ? rjeColors.darkGreen : '#d1d5db'
                    }} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {isAnalyzing && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-500 mr-3 animate-spin" />
              <div>
                <p className="font-medium text-blue-800">Processing Selected Project</p>
                <p className="text-sm text-blue-600">
                  Building WBS hierarchy and identifying parent structures...
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleStartOver}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Back to File Selection
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <p className="font-medium text-red-800">Processing Failed</p>
                <p className="text-sm text-red-700">{safeString(error)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 3: Equipment Upload (when project is loaded)
  if (step === 'equipment' && projectState) {
    const { projectInfo, parentStructures, totalElements } = projectState;
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
          ✅ Project Loaded - Add Equipment
        </h2>

        <div className="mb-6 p-6 bg-green-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-4" style={{ color: rjeColors.darkBlue }}>
            Project: {safeString(projectInfo?.projectName || projectState.projectName)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Project ID:</strong> {safeString(projectInfo?.projectId || 'N/A')}</p>
              <p><strong>Total Elements:</strong> {safeString(totalElements || 0)}</p>
            </div>
            <div>
              <p><strong>Existing Subsystems:</strong> {safeString(parentStructures?.subsystems?.length || 0)}</p>
              <p><strong>Next Subsystem:</strong> S{safeString((parentStructures?.subsystems?.length || 0) + 1)}</p>
            </div>
          </div>
        </div>

        {/* Parent Structures Status */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: rjeColors.darkBlue }}>
            🎯 WBS Structure Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'prerequisites', icon: 'P', name: 'Prerequisites' },
              { key: 'milestones', icon: 'M', name: 'Milestones' },
              { key: 'energisation', icon: 'E', name: 'Energisation' },
              { key: 'tbcSection', icon: 'T', name: 'TBC Section' }
            ].map(({ key, icon, name }) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{icon} - {name}</span>
                {parentStructures?.[key] ? (
                  <span className="text-green-600 font-medium text-sm">✅ Found</span>
                ) : (
                  <span className="text-gray-500 text-sm">❌ Not Found</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Equipment Upload */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: rjeColors.darkBlue }}>
            📦 Upload New Equipment
          </h3>
          
          <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: rjeColors.darkGreen }}>
            <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: rjeColors.darkGreen }} />
            <p className="text-lg font-medium mb-2">Upload Additional Equipment List</p>
            <p className="text-gray-600 mb-4">Excel (.xlsx) or CSV files supported</p>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-left">
              <div className="font-medium mb-2">📋 Equipment File Requirements:</div>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li><strong>Subsystem:</strong> Name of the new subsystem (e.g., "33kV Switchroom 2 - +Z02")</li>
                <li><strong>Equipment Number:</strong> Unique equipment identifier</li>
                <li><strong>Description:</strong> Equipment description</li>
                <li><strong>Commissioning:</strong> Must be "Y" or "TBC" to be included</li>
                <li><strong>Parent Equipment Number:</strong> Optional parent reference</li>
              </ul>
            </div>
            
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="equipment-file-upload"
            />
            <button
              onClick={() => document.getElementById('equipment-file-upload')?.click()}
              disabled={isProcessing}
              className="px-6 py-3 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
              style={{ backgroundColor: rjeColors.darkGreen }}
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing Equipment...
                </div>
              ) : (
                <div className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Equipment to Project
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleStartOver}
            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Analyze Different Project
          </button>
        </div>
      </div>
    );
  }

  return null;
};

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
            ✅ Loaded: {safeString(missingEquipmentConfig.existingProjectName)} - {safeString(missingEquipmentConfig.existingWbsNodes.length)} WBS nodes
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
                ⚠️ {safeString(missingEquipmentAnalysis.removedEquipment.length)} equipment items were removed from the list
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
                      • {safeString(equipmentNumber)}
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
        ? `Export New Equipment (${safeString(wbsOutput.length)} new items)` 
        : `Export WBS Structure (${safeString(wbsOutput.length)} nodes)`
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
            {safeString(missingEquipmentAnalysis.newEquipment.filter(item => item.commissioning === 'Y').length)}
          </div>
          <div className="text-sm text-gray-600">New Equipment (Y)</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.teal}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {safeString(missingEquipmentAnalysis.newEquipment.filter(item => item.commissioning === 'TBC').length)}
          </div>
          <div className="text-sm text-gray-600">New TBC Equipment</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.blue}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {safeString(missingEquipmentAnalysis.existingEquipment.length)}
          </div>
          <div className="text-sm text-gray-600">Existing Equipment</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkBlue}20` }}>
          <div className="text-2xl font-bold text-white" style={{ backgroundColor: rjeColors.darkBlue }}>
            {safeString(missingEquipmentAnalysis.removedEquipment.length)}
          </div>
          <div className="text-sm text-gray-600">Removed Equipment</div>
        </div>
      </div>
    ) : (
      <div className="grid md:grid-cols-5 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.mediumGreen}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {safeString(wbsOutput.length)}
          </div>
          <div className="text-sm text-gray-600">Total WBS Nodes</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkGreen}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {safeString(projectState?.subsystems?.length || 0)}
          </div>
          <div className="text-sm text-gray-600">Subsystems</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.teal}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {safeString(equipmentData.filter(item => item.commissioning === 'Y').length)}
          </div>
          <div className="text-sm text-gray-600">Commissioned (Y)</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.blue}20` }}>
          <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
            {safeString(equipmentData.filter(item => item.commissioning === 'TBC').length)}
          </div>
          <div className="text-sm text-gray-600">TBC Equipment</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkBlue}20` }}>
          <div className="text-2xl font-bold text-white" style={{ backgroundColor: rjeColors.darkBlue }}>
            {safeString(equipmentData.filter(item => item.commissioning === 'N').length)}
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
