// src/components/modes/ContinueProject.jsx - FIXED DATA FLOW
// Fixed new vs existing element visibility and proper WBS hierarchy

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, Clock, Building2, AlertTriangle, Plus, FileText, Loader } from 'lucide-react';
import { getAvailableProjects, processSelectedProject } from '../utils/xerParser';

const ContinueProject = ({ onWBSGenerated }) => {
  const [step, setStep] = useState('upload');
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [projectResults, setProjectResults] = useState(null);
  
  // Equipment integration state
  const [equipmentFile, setEquipmentFile] = useState(null);
  const [equipmentData, setEquipmentData] = useState(null);
  const [isProcessingEquipment, setIsProcessingEquipment] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [integrationResult, setIntegrationResult] = useState(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const equipmentFileInputRef = useRef(null);

  const colors = {
    darkBlue: '#1e3a8a',
    darkGreen: '#059669',
    lightGreen: '#10b981',
    orange: '#f97316'
  };

  // XER file handling
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('Analyzing XER file for available projects...');
      const analysis = await getAvailableProjects(file);
      
      setAnalysisResult(analysis);
      setAvailableProjects(analysis.availableProjects || []);
      
      if (analysis.availableProjects && analysis.availableProjects.length > 0) {
        setStep('selecting');
        console.log(`Found ${analysis.availableProjects.length} projects - manual selection required`);
      } else {
        setError('No projects found in XER file');
      }

    } catch (error) {
      console.error('XER Analysis failed:', error);
      setError('Failed to analyze XER file: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Project processing
  const processProject = async (projectId, analysis = null) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log('Processing selected project with direct data:', projectId);
      const analysisToUse = analysis || analysisResult;
      
      if (!analysisToUse) {
        throw new Error('Analysis result is null - state timing issue');
      }
      
      const results = await processSelectedProject(analysisToUse, projectId);
      setProjectResults(results);
      setStep('equipment');
      
      console.log('Project processing complete:', results?.totalElements || 0, 'elements processed');

    } catch (error) {
      console.error('Project processing failed:', error);
      setError('Failed to process selected project: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    processProject(project.proj_id);
  };

  // Equipment file processing
  const handleEquipmentFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessingEquipment(true);
    setError(null);
    setEquipmentData(null);
    
    try {
      console.log('📁 Processing equipment file:', file.name);
      
      const { processEquipmentFile } = await import('../utils/equipmentUtils.js');
      const processedData = await processEquipmentFile(file);
      
      console.log('📊 Equipment processing complete:', {
        total: processedData?.length || 0,
        commissioned: processedData?.filter(item => item?.commissioning === 'Y')?.length || 0,
        tbc: processedData?.filter(item => item?.commissioning === 'TBC')?.length || 0
      });
      
      if (!processedData || processedData.length === 0) {
        throw new Error('No valid equipment found in file');
      }
      
      setEquipmentFile(file);
      setTimeout(() => {
        setEquipmentData(processedData);
        console.log('✅ Equipment data state updated:', processedData.length, 'items');
      }, 0);
      
    } catch (error) {
      console.error('❌ Equipment processing error:', error);
      setError(`Equipment Processing Error: ${error?.message || 'Unknown error'}`);
      setEquipmentData(null);
    } finally {
      setIsProcessingEquipment(false);
    }
  };

  // FIXED: Execute the actual integration with proper data flagging
  const executeIntegration = async () => {
    console.log('🔍 Integration pre-check:');
    console.log('   projectResults:', !!projectResults);
    console.log('   equipmentData:', !!equipmentData);
    console.log('   equipmentData length:', equipmentData?.length || 0);
    
    if (!projectResults) {
      setError('Project analysis is required - please reload the project');
      return;
    }
    
    if (!equipmentData || !Array.isArray(equipmentData) || equipmentData.length === 0) {
      setError('Equipment data is missing or invalid - please reload the equipment file');
      return;
    }

    setIsIntegrating(true);
    setError(null);
    
    try {
      console.log('🚀 Starting integration process');
      console.log('📊 Equipment items to integrate:', equipmentData.length);
      
      const firstItem = equipmentData.find(item => item?.subsystem);
      const subsystemName = firstItem?.subsystem || 'New Subsystem';
      console.log('🏢 Detected subsystem:', subsystemName);
      
      const { processContinueProjectWBS } = await import('../utils/continueProjectIntegration.js');
      
      const existingWBSNodes = projectResults?.wbsElements || [];
      const projectName = projectResults?.projectInfo?.projectName || 'Unknown Project';
      
      console.log('🔧 Calling processContinueProjectWBS with:');
      console.log('   existingWBSNodes:', existingWBSNodes.length);
      console.log('   equipmentData:', equipmentData.length);
      console.log('   projectName:', projectName);
      console.log('   subsystemName:', subsystemName);
      
      const result = processContinueProjectWBS(
        existingWBSNodes,
        equipmentData,
        projectName,
        subsystemName
      );
      
      console.log('✅ Integration successful:', result);
      setIntegrationResult(result);
      
      // FIXED: Properly flag existing and new elements for visualization
      const properlyFlaggedExisting = existingWBSNodes.map(node => ({
        ...node,
        isExisting: true,
        isNew: false
      }));
      
      const properlyFlaggedNew = (result?.newElements || []).map(node => ({
        ...node,
        isNew: true,
        isExisting: false
      }));
      
      // FIXED: Create combined array with all elements properly flagged
      const allNodesWithFlags = [...properlyFlaggedExisting, ...properlyFlaggedNew];
      
      console.log('🏗️ Combined WBS structure:', {
        existingElements: properlyFlaggedExisting.length,
        newElements: properlyFlaggedNew.length,
        totalElements: allNodesWithFlags.length
      });
      
      // Debug: Show sample of flagged data
      console.log('📊 Sample existing elements:');
      properlyFlaggedExisting.slice(0, 5).forEach(item => {
        console.log(`   EXISTING: ${item.wbs_short_name || item.wbs_code} | ${item.wbs_name} | isExisting: ${item.isExisting}`);
      });
      
      console.log('📊 Sample new elements:');
      properlyFlaggedNew.slice(0, 5).forEach(item => {
        console.log(`   NEW: ${item.wbs_code} | ${item.wbs_name} | isNew: ${item.isNew}`);
      });
      
      const wbsStructure = {
        allNodes: allNodesWithFlags,
        newNodes: properlyFlaggedNew,
        projectName: String(projectResults?.projectInfo?.projectName || 'Unknown Project'),
        mode: 'continue',
        integrationSummary: {
          totalElements: Number(result?.summary?.totalElements || 0),
          equipment: Number(result?.summary?.equipment || 0),
          categories: Number(result?.summary?.categories || 0),
          prerequisiteEntries: Number(result?.summary?.prerequisiteEntries || 0),
          subsystems: Number(result?.summary?.subsystems || 0),
          subsystemNumber: Number(result?.summary?.subsystemNumber || 0),
          zoneCode: String(result?.summary?.zoneCode || ''),
          existingElements: Number(properlyFlaggedExisting.length || 0),
          newElements: Number(properlyFlaggedNew.length || 0)
        }
      };
      
      console.log('📤 Sending to visualization:', {
        allNodesCount: wbsStructure.allNodes.length,
        newNodesCount: wbsStructure.newNodes.length,
        existingFlagged: wbsStructure.allNodes.filter(n => n.isExisting).length,
        newFlagged: wbsStructure.allNodes.filter(n => n.isNew).length
      });
      
      if (onWBSGenerated) {
        onWBSGenerated(wbsStructure);
      }
      
      setStep('complete');
      
    } catch (error) {
      console.error('❌ Integration error:', error);
      setError(`Integration Error: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsIntegrating(false);
    }
  };

  const handleStartOver = () => {
    setStep('upload');
    setAvailableProjects([]);
    setSelectedProject(null);
    setAnalysisResult(null);
    setProjectResults(null);
    setEquipmentFile(null);
    setEquipmentData(null);
    setIntegrationResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (equipmentFileInputRef.current) {
      equipmentFileInputRef.current.value = '';
    }
  };

  // Upload step
  const renderUploadStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
        ➕ Continue Existing Project
      </h2>
      
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h4 className="font-semibold mb-2" style={{ color: colors.darkBlue }}>
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
           style={{ borderColor: colors.darkGreen }}>
        <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: colors.darkGreen }} />
        <h3 className="text-lg font-semibold mb-2">Upload P6 XER Export File</h3>
        <p className="text-gray-600 mb-4">
          Select your P6 export file (.xer format)
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".xer,.csv,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isAnalyzing}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="px-6 py-3 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: colors.darkGreen }}
        >
          {isAnalyzing ? (
            <>
              <Clock className="w-4 h-4 inline mr-2 animate-spin" />
              Analyzing XER File...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 inline mr-2" />
              Choose XER File
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <p className="font-medium text-red-800">Analysis Failed</p>
              <p className="text-sm text-red-700">{String(error)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Project selection
  const renderProjectSelection = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
        📊 Select Project to Continue
      </h2>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">📊 Available Projects</h4>
        <p className="text-sm text-blue-700">
          Found {String(availableProjects?.length || 0)} project{availableProjects?.length === 1 ? '' : 's'} in your XER file. 
          Please review the project details and click to select the one you want to continue with:
        </p>
      </div>

      <div className="space-y-4">
        {(availableProjects || []).map((project) => (
          <div
            key={String(project?.proj_id || Math.random())}
            className="border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300"
            style={{ 
              borderColor: selectedProject?.proj_id === project?.proj_id ? colors.darkGreen : '#e5e7eb'
            }}
            onClick={() => handleProjectSelect(project)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold" style={{ color: colors.darkBlue }}>
                  {String(project?.project_name || 'Unknown Project')}
                </h3>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Project ID:</span> {String(project?.proj_id || 'N/A')}
                  </div>
                  <div>
                    <span className="font-medium">Project Code:</span> {String(project?.project_code || 'N/A')}
                  </div>
                  <div>
                    <span className="font-medium">WBS Elements:</span> {String(project?.wbs_element_count || 0)}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> Active
                  </div>
                </div>
                {project?.plan_start_date && project?.plan_end_date && (
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Schedule:</span> {String(project.plan_start_date)} - {String(project.plan_end_date)}
                  </div>
                )}
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded mr-2">
                    Ready for Equipment Addition
                  </span>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    Click to Select →
                  </span>
                </div>
              </div>
              
              <div className="flex items-center">
                <Building2 className="w-8 h-8 mr-4" style={{ color: colors.darkGreen }} />
                <CheckCircle 
                  className="w-6 h-6" 
                  style={{ 
                    color: selectedProject?.proj_id === project?.proj_id ? colors.darkGreen : '#d1d5db'
                  }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {isProcessing && (
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
              <p className="text-sm text-red-700">{String(error)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Equipment upload step
  const renderEquipmentStep = () => {
    const projectInfo = projectResults?.projectInfo || {};
    const parentStructures = projectResults?.parentStructures || {};
    const totalElements = Number(projectResults?.totalElements || 0);
    const subsystemCount = Number(parentStructures?.subsystems?.length || 0);
    const projectName = String(projectInfo?.projectName || 'Unknown Project');
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
          📦 Add New Equipment
        </h2>

        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">
            ✅ Project Loaded: {projectName}
          </h3>
          <p className="text-sm text-green-700">
            {String(totalElements)} WBS elements • {String(subsystemCount)} existing subsystems
          </p>
        </div>

        <div className="border-2 border-dashed rounded-lg p-8 text-center mb-6" 
             style={{ borderColor: equipmentData ? colors.lightGreen : colors.darkGreen }}>
          <FileText className="w-12 h-12 mx-auto mb-4" 
                   style={{ color: equipmentData ? colors.lightGreen : colors.darkGreen }} />
          
          {equipmentData ? (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-700">
                ✅ Equipment File Loaded
              </h3>
              <p className="text-gray-600 mb-4">
                {String(equipmentData?.length || 0)} equipment items ready for integration
              </p>
              <button
                onClick={() => equipmentFileInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Change Equipment File
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-2">Upload Equipment List</h3>
              <p className="text-gray-600 mb-4">
                Excel (.xlsx) or CSV file containing new equipment to add
              </p>
              <button
                onClick={() => equipmentFileInputRef.current?.click()}
                disabled={isProcessingEquipment}
                className="px-6 py-3 text-white rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: colors.darkGreen }}
              >
                {isProcessingEquipment ? (
                  <>
                    <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                    Processing Equipment...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 inline mr-2" />
                    Choose Equipment File
                  </>
                )}
              </button>
            </div>
          )}
          
          <input
            ref={equipmentFileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleEquipmentFileUpload}
            className="hidden"
          />
        </div>

        {equipmentData && Array.isArray(equipmentData) && equipmentData.length > 0 && (
          <div className="text-center mb-6">
            <button
              onClick={executeIntegration}
              disabled={isIntegrating || !equipmentData}
              className="px-8 py-3 text-white rounded-lg font-medium text-lg disabled:opacity-50"
              style={{ backgroundColor: colors.orange }}
            >
              {isIntegrating ? (
                <>
                  <Loader className="w-5 h-5 inline mr-2 animate-spin" />
                  Integrating Equipment...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 inline mr-2" />
                  Integrate {String(equipmentData.length)} Equipment Items
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep('selecting')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Back to Project Selection
          </button>
          <button
            onClick={handleStartOver}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Start Over
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <p className="font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{String(error)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Complete step
  const renderResults = () => {
    const summary = integrationResult?.summary || {};
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
          🎉 Integration Complete!
        </h2>

        <div className="mb-6 p-6 bg-green-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-4" style={{ color: colors.darkBlue }}>
            Successfully Added New Subsystem
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>New WBS Elements:</strong> {String(summary?.totalElements || 0)}</p>
              <p><strong>Equipment Processed:</strong> {String(summary?.equipment || 0)}</p>
              <p><strong>Categories Created:</strong> {String(summary?.categories || 0)}</p>
            </div>
            <div>
              <p><strong>Prerequisite Entries:</strong> {String(summary?.prerequisiteEntries || 0)}</p>
              <p><strong>Subsystems Added:</strong> {String(summary?.subsystems || 0)}</p>
              <p><strong>Integration Status:</strong> ✅ Success</p>
            </div>
          </div>
          
          {summary?.zoneCode && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm">
                <strong>Zone Code:</strong> {String(summary.zoneCode)} | 
                <strong> Subsystem:</strong> S{String(summary?.subsystemNumber || 0)}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleStartOver}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Add Another Subsystem
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {step === 'upload' && renderUploadStep()}
      {step === 'selecting' && renderProjectSelection()}
      {step === 'equipment' && renderEquipmentStep()}
      {step === 'complete' && renderResults()}
    </div>
  );
};

export default ContinueProject;
