// src/components/modes/ContinueProject.jsx - ENHANCED UI VERSION
// Added proper visualization stages for XER and equipment integration

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, Clock, Building2, AlertTriangle, Plus, FileText, Loader, Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react';
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
      console.log('🚀 Analyzing XER file for available projects...');
      const analysis = await getAvailableProjects(file);
      
      setAnalysisResult(analysis);
      setAvailableProjects(analysis.availableProjects || []);
      
      if (analysis.availableProjects && analysis.availableProjects.length > 0) {
        setStep('selecting');
        console.log(`📊 Found ${analysis.availableProjects.length} projects - manual selection required`);
      } else {
        setError('No projects found in XER file');
      }

    } catch (error) {
      console.error('🚫 XER Analysis failed:', error);
      setError('Failed to analyze XER file: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Project processing with XER visualization
  const processProject = async (projectId, analysis = null) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log(`🏗️ Processing selected project: ${projectId}`);
      const analysisToUse = analysis || analysisResult;
      
      if (!analysisToUse) {
        throw new Error('Analysis result is null - state timing issue');
      }
      
      const results = await processSelectedProject(analysisToUse, projectId);
      setProjectResults(results);
      
      // NEW: Go to XER review step instead of directly to equipment
      setStep('xerReview');
      
      console.log(`✅ Project processing complete: ${results?.totalElements || 0} elements processed`);

    } catch (error) {
      console.error('❌ Project processing failed:', error);
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
      const rawProcessedData = await processEquipmentFile(file);
      
      console.log(`📊 Raw equipment data: ${rawProcessedData?.length || 0} total items`);
      
      if (!rawProcessedData || rawProcessedData.length === 0) {
        throw new Error('No equipment found in file');
      }
      
      // Filter for commissioned equipment only
      const filteredData = rawProcessedData.filter(item => {
        const commissioning = String(item?.commissioning || '').trim().toUpperCase();
        const isValid = commissioning === 'Y' || commissioning === 'TBC';
        
        if (!isValid) {
          console.log(`⏭️ FILTERED OUT: ${item?.equipmentNumber || 'Unknown'} (Commissioning: "${item?.commissioning || 'Missing'}")`);
        }
        
        return isValid;
      });
      
      console.log(`📊 Equipment filtering results:`);
      console.log(`   Total items: ${rawProcessedData.length}`);
      console.log(`   ✅ FINAL VALID: ${filteredData.length}`);
      
      if (filteredData.length === 0) {
        throw new Error('No valid equipment found after filtering (only items with Commissioning = Y or TBC are processed)');
      }
      
      setEquipmentFile(file);
      
      setTimeout(() => {
        setEquipmentData(filteredData);
        console.log(`✅ Equipment data state updated: ${filteredData.length} valid items ready for integration`);
      }, 0);
      
    } catch (error) {
      console.error('❌ Equipment processing error:', error);
      setError(`Equipment Processing Error: ${error?.message || 'Unknown error'}`);
      setEquipmentData(null);
    } finally {
      setIsProcessingEquipment(false);
    }
  };

  // Execute integration and show combined view
  const executeIntegration = async () => {
    if (!projectResults || !equipmentData || equipmentData.length === 0) {
      setError('Missing project or equipment data');
      return;
    }

    setIsIntegrating(true);
    setError(null);
    
    try {
      console.log('🚀 Starting integration process');
      
      const firstItem = equipmentData.find(item => item?.subsystem);
      const subsystemName = firstItem?.subsystem || 'New Subsystem';
      
      const { processContinueProjectWBS } = await import('../utils/continueProjectIntegration.js');
      
      const existingWBSNodes = projectResults?.wbsElements || [];
      const projectName = projectResults?.projectInfo?.projectName || 'Unknown Project';
      
      const result = processContinueProjectWBS(
        existingWBSNodes,
        equipmentData,
        projectName,
        subsystemName
      );
      
      console.log('✅ Integration successful:', result);
      setIntegrationResult(result);
      
      // Create combined WBS structure for visualization
      const combinedWBSStructure = {
        allNodes: [...(projectResults?.wbsElements || []), ...(result?.newElements || [])],
        newNodes: result?.newElements || [],
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
          existingElements: Number(result?.summary?.existingElements || 0),
          newElements: Number(result?.summary?.newElements || 0)
        }
      };
      
      // Trigger parent component to show results
      if (onWBSGenerated) {
        onWBSGenerated(combinedWBSStructure);
      }
      
      setStep('integrated');
      
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

  // NEW: XER Structure Visualization Component
  const XERStructureViewer = ({ wbsElements, projectInfo }) => {
    const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
    
    const toggleExpanded = (nodeId) => {
      const newExpanded = new Set(expandedNodes);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      setExpandedNodes(newExpanded);
    };

    const expandAll = () => {
      const allIds = new Set(wbsElements.map(el => el.wbs_id));
      allIds.add('root');
      setExpandedNodes(allIds);
    };

    const collapseAll = () => {
      setExpandedNodes(new Set(['root']));
    };

    // Build hierarchy
    const hierarchy = React.useMemo(() => {
      const nodeMap = new Map();
      const children = new Map();

      wbsElements.forEach(element => {
        nodeMap.set(element.wbs_id, element);
        const parentId = element.parent_wbs_id || 'root';
        if (!children.has(parentId)) {
          children.set(parentId, []);
        }
        children.get(parentId).push(element);
      });

      const buildTree = (parentId) => {
        const nodeChildren = children.get(parentId) || [];
        return nodeChildren
          .sort((a, b) => (a.wbs_short_name || '').localeCompare(b.wbs_short_name || '', undefined, { numeric: true }))
          .map(child => ({
            ...child,
            children: buildTree(child.wbs_id)
          }));
      };

      return buildTree('root');
    }, [wbsElements]);

    const renderNode = (node, level = 0) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.wbs_id);

      return (
        <div key={node.wbs_id} className="mb-1">
          <div
            className="flex items-center p-2 rounded border bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
            style={{ marginLeft: `${level * 20}px` }}
            onClick={() => hasChildren && toggleExpanded(node.wbs_id)}
          >
            {hasChildren ? (
              isExpanded ? 
              <ChevronDown className="w-4 h-4 mr-2 text-blue-600" /> :
              <ChevronRight className="w-4 h-4 mr-2 text-blue-600" />
            ) : (
              <div className="w-4 h-4 mr-2" />
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-blue-800">
                  {node.wbs_short_name || node.wbs_id}
                </span>
                <span className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded font-medium">
                  EXISTING
                </span>
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {node.wbs_name}
              </div>
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="ml-2">
              {node.children.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold" style={{ color: colors.darkBlue }}>
            📊 Existing P6 WBS Structure ({wbsElements.length} elements)
          </h3>
          
          <div className="flex gap-3">
            <button
              onClick={expandAll}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">
            ✅ P6 Project: {projectInfo?.projectName || 'Unknown'}
          </h4>
          <p className="text-sm text-blue-700">
            This shows all WBS elements from your P6 export. Verify the structure and codes are correct before adding new equipment.
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto border rounded p-4">
          {hierarchy.map(node => renderNode(node))}
        </div>
      </div>
    );
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
          <li>• Review the existing WBS structure</li>
          <li>• Add new equipment with intelligent WBS codes</li>
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

  // Project selection - same as before
  const renderProjectSelection = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
        📊 Select Project to Continue
      </h2>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">📊 Available Projects</h4>
        <p className="text-sm text-blue-700">
          Found {String(availableProjects?.length || 0)} project{availableProjects?.length === 1 ? '' : 's'} in your XER file. 
          Click to select the project you want to continue:
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
                    <span className="font-medium">WBS Elements:</span> {String(project?.wbs_element_count || 0)}
                  </div>
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
                Loading WBS structure for review...
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

  // NEW: XER Review Step
  const renderXERReview = () => {
    if (!projectResults) return null;

    return (
      <div className="space-y-6">
        <XERStructureViewer 
          wbsElements={projectResults.wbsElements || []}
          projectInfo={projectResults.projectInfo || {}}
        />
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkBlue }}>
            📦 Next: Add New Equipment
          </h3>
          <p className="text-gray-700 mb-4">
            The existing WBS structure has been loaded. Now upload your equipment list to add new items to this project.
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={() => setStep('equipment')}
              className="px-6 py-3 text-white rounded-lg font-medium"
              style={{ backgroundColor: colors.orange }}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Continue to Add Equipment
            </button>
            
            <button
              onClick={() => setStep('selecting')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Choose Different Project
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Equipment upload step 
  const renderEquipmentStep = () => {
    const projectInfo = projectResults?.projectInfo || {};
    const totalElements = Number(projectResults?.totalElements || 0);
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
            {String(totalElements)} existing WBS elements ready for equipment addition
          </p>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <h4 className="font-semibold text-yellow-800 mb-2">📋 Equipment Filtering</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Commissioning = "Y"</strong> → Will be included in WBS</li>
            <li>• <strong>Commissioning = "TBC"</strong> → Will be included in TBC section</li>
            <li>• <strong>Commissioning = "N"</strong> → Will be excluded completely</li>
          </ul>
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
              <p className="text-gray-600 mb-2">
                <strong>{String(equipmentData?.length || 0)} valid equipment items</strong> ready for integration
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
            onClick={() => setStep('xerReview')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Back to WBS Review
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

  // Integration complete step
  const renderIntegratedStep = () => {
    const summary = integrationResult?.summary || {};
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
          🎉 Integration Complete!
        </h2>

        <div className="mb-6 p-6 bg-green-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-4" style={{ color: colors.darkBlue }}>
            ✅ Equipment Successfully Integrated
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
              <p><strong>Zone Code:</strong> {String(summary?.zoneCode || '')}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">📊 View Results</h4>
          <p className="text-sm text-blue-700">
            Scroll down to see the combined WBS structure with existing (EXISTING badges) and new (NEW badges) items.
            Verify the WBS codes are correct before exporting to P6.
          </p>
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {step === 'upload' && renderUploadStep()}
      {step === 'selecting' && renderProjectSelection()}
      {step === 'xerReview' && renderXERReview()}
      {step === 'equipment' && renderEquipmentStep()}
      {step === 'integrated' && renderIntegratedStep()}
    </div>
  );
};

export default ContinueProject;
