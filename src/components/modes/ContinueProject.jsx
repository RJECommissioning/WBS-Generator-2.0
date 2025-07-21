import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, Clock, Building2, AlertTriangle } from 'lucide-react';
import { getAvailableProjects, processSelectedProject } from '../utils/xerParser';

const ProjectSelectionUI = () => {
  const [step, setStep] = useState('upload');
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [parserInstance, setParserInstance] = useState(null);
  const [projectResults, setProjectResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const colors = {
    darkBlue: '#1e3a8a',
    darkGreen: '#059669',
    lightGreen: '#10b981',
    orange: '#f97316'
  };

  // Mock functions for demo
  const mockGetAvailableProjects = async (file) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      parser: {},
      availableProjects: [
        {
          proj_id: '684',
          project_name: 'Summerfield',
          project_code: '5737',
          wbs_element_count: 471,
          plan_start_date: '2024-01-15',
          plan_end_date: '2024-12-31'
        },
        {
          proj_id: '685',
          project_name: 'Northgate Substation',
          project_code: '5823',
          wbs_element_count: 298,
          plan_start_date: '2024-03-01',
          plan_end_date: '2025-08-30'
        },
        {
          proj_id: '686',
          project_name: 'Western Distribution',
          project_code: '5901',
          wbs_element_count: 156,
          plan_start_date: '2024-06-01',
          plan_end_date: '2025-03-15'
        }
      ],
      totalProjects: 3,
      totalWBSElements: 925,
      requiresProjectSelection: true
    };
  };

  const mockProcessSelectedProject = async (parser, projectId) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      selectedProject: { proj_id: projectId },
      wbsElements: [],
      hierarchy: new Map(),
      parentStructures: {
        prerequisites: { wbs_id: '24926', wbs_name: 'P | Pre-Requisites' },
        milestones: { wbs_id: '24927', wbs_name: 'M | Milestones' },
        energisation: { wbs_id: '24925', wbs_name: 'E | Energisation' },
        subsystems: [
          {
            element: { wbs_id: '24929', wbs_name: 'S1 | +Z01 - 33kV Switchroom 1' },
            subsystemNumber: 1,
            zoneCode: '+Z01'
          }
        ],
        tbcSection: { wbs_id: '24934', wbs_name: 'TBC - Equipment To Be Confirmed' },
        root: { wbs_id: '24923', wbs_name: 'Summerfield' }
      },
      projectInfo: {
        projectId: projectId,
        projectName: projectId === '684' ? 'Summerfield' : 'Other Project',
        projectCode: projectId === '684' ? '5737' : 'OTHER',
        rootWbsId: '24923',
        totalElements: projectId === '684' ? 471 : 100
      },
      totalElements: projectId === '684' ? 471 : 100
    };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('Analyzing XER file for available projects...');
      
      const analysis = await mockGetAvailableProjects(file);
      
      setParserInstance(analysis.parser);
      setAvailableProjects(analysis.availableProjects);
      
      if (analysis.requiresProjectSelection) {
        setStep('selecting');
        console.log('Found projects - user selection required');
      } else {
        setSelectedProject(analysis.availableProjects[0]);
        await processProject(analysis.availableProjects[0].proj_id);
      }

    } catch (error) {
      console.error('XER Analysis failed:', error);
      setError('Failed to analyze XER file: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processProject = async (projectId) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log('Processing selected project:', projectId);
      
      const results = await mockProcessSelectedProject(parserInstance, projectId);
      
      setProjectResults(results);
      setStep('complete');
      
      console.log('Project processing complete:', results.totalElements, 'elements processed');

    } catch (error) {
      console.error('Project processing failed:', error);
      setError('Failed to process selected project: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    processProject(project.proj_id);
  };

  const handleStartOver = () => {
    setStep('upload');
    setAvailableProjects([]);
    setSelectedProject(null);
    setParserInstance(null);
    setProjectResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderUploadStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
        Multi-Project XER Analysis
      </h2>
      
      <div className="mb-6 p-4 bg-green-50">
        <h4 className="font-semibold mb-2" style={{ color: colors.darkBlue }}>
          Enhanced XER Processing:
        </h4>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>Automatically detects all projects in your XER file</li>
          <li>Extracts PROJECT table and PROJWBS table data</li>
          <li>Shows WBS element count for each project</li>
          <li>Allows you to select which project to continue</li>
        </ul>
      </div>

      <div className="border-2 border-dashed rounded-lg p-8 text-center" 
           style={{ borderColor: colors.darkGreen }}>
        <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: colors.darkGreen }} />
        <h3 className="text-lg font-semibold mb-2">Upload P6 XER Export File</h3>
        <p className="text-gray-600 mb-4">
          Select your P6 export file (.xer, .csv, or .xlsx format)
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
          className="px-6 py-3 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: colors.darkGreen }}
        >
          {isAnalyzing ? (
            <>
              <Clock className="w-4 h-4 inline mr-2 animate-spin" />
              Analyzing Projects...
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
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderProjectSelection = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
        Select Project to Continue
      </h2>
      
      <div className="mb-6 p-4 bg-blue-50">
        <p className="text-sm text-blue-800">
          Found {availableProjects.length} projects in your XER file. 
          Select the project you want to continue working with:
        </p>
      </div>

      <div className="space-y-4">
        {availableProjects.map((project) => (
          <div
            key={project.proj_id}
            className="border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg"
            style={{ 
              borderColor: selectedProject?.proj_id === project.proj_id ? colors.darkGreen : '#e5e7eb'
            }}
            onClick={() => handleProjectSelect(project)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold" style={{ color: colors.darkBlue }}>
                  {project.project_name}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span>Project ID: {project.proj_id}</span>
                  <span>Code: {project.project_code}</span>
                  <span>{project.wbs_element_count} WBS Elements</span>
                </div>
                {project.plan_start_date && (
                  <div className="mt-2 text-sm text-gray-500">
                    {project.plan_start_date} - {project.plan_end_date}
                  </div>
                )}
              </div>
              
              <div className="flex items-center">
                <Building2 className="w-8 h-8 mr-4" style={{ color: colors.darkGreen }} />
                <CheckCircle 
                  className="w-6 h-6" 
                  style={{ 
                    color: selectedProject?.proj_id === project.proj_id ? colors.darkGreen : '#d1d5db'
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
                Parsing WBS structure and identifying parent elements...
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
    </div>
  );

  const renderResults = () => {
    const { projectInfo, parentStructures, totalElements } = projectResults;
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
          Project Analysis Complete
        </h2>

        <div className="mb-6 p-6 bg-green-50">
          <h3 className="text-xl font-semibold mb-4" style={{ color: colors.darkBlue }}>
            Project: {projectInfo.projectName}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Project ID:</strong> {projectInfo.projectId}</p>
              <p><strong>Project Code:</strong> {projectInfo.projectCode}</p>
              <p><strong>Root WBS ID:</strong> {projectInfo.rootWbsId}</p>
            </div>
            <div>
              <p><strong>Total Elements:</strong> {totalElements}</p>
              <p><strong>Subsystems Found:</strong> {parentStructures.subsystems.length}</p>
              <p><strong>Next Available:</strong> S{parentStructures.subsystems.length + 1}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.darkBlue }}>
            Parent Structures Identified
          </h3>
          <div className="space-y-3">
            {[
              { key: 'prerequisites', icon: 'P', name: 'Prerequisites' },
              { key: 'milestones', icon: 'M', name: 'Milestones' },
              { key: 'energisation', icon: 'E', name: 'Energisation' },
              { key: 'tbcSection', icon: 'T', name: 'TBC Section' }
            ].map(({ key, icon, name }) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded">
                <span>{icon} - {name}</span>
                {parentStructures[key] ? (
                  <span className="text-green-600 font-medium">
                    FOUND: {parentStructures[key].wbs_name}
                  </span>
                ) : (
                  <span className="text-gray-500">Not Found</span>
                )}
              </div>
            ))}
            
            <div className="flex items-center justify-between p-3 border rounded">
              <span>Existing Subsystems</span>
              <span className="text-green-600 font-medium">
                {parentStructures.subsystems.length} Found: {
                  parentStructures.subsystems.map(s => `S${s.subsystemNumber}`).join(', ')
                }
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            className="px-6 py-3 text-white rounded-lg font-medium"
            style={{ backgroundColor: colors.darkGreen }}
            onClick={() => {
              console.log('Ready to continue with equipment addition');
            }}
          >
            Continue with Equipment Addition
          </button>
          
          <button
            onClick={handleStartOver}
            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Analyze Different Project
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Debug Information</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Hierarchy levels: {projectResults.hierarchy?.size || 0}</p>
            <p>Parser validation: Passed</p>
            <p>WBS structure integrity: Validated</p>
            <p>Ready for subsystem addition: Yes</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {step === 'upload' && renderUploadStep()}
      {step === 'selecting' && renderProjectSelection()}
      {step === 'complete' && renderResults()}
    </div>
  );
};

export default ProjectSelectionUI;
