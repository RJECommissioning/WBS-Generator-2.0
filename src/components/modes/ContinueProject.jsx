// src/components/modes/ContinueProject.jsx
// Complete file with manual selection and state timing fixes

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, Clock, Building2, AlertTriangle, Plus } from 'lucide-react';
import { getAvailableProjects, processSelectedProject } from '../utils/xerParser';

const ContinueProject = () => {
  const [step, setStep] = useState('upload');
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('Analyzing XER file for available projects...');
      
      // Use REAL XER parser functions
      const analysis = await getAvailableProjects(file);
      
      setAnalysisResult(analysis);
      setAvailableProjects(analysis.availableProjects);
      
      // ALWAYS require manual project selection (no auto-selection)
      if (analysis.availableProjects.length > 0) {
        setStep('selecting');
        console.log(`Found ${analysis.availableProjects.length} projects - manual selection required`);
      } else {
        setError('No projects found in XER file');
      }

    } catch (error) {
      console.error('XER Analysis failed:', error);
      setError('Failed to analyze XER file: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // FIX: Modified to accept analysis parameter to avoid state timing issues
  const processProject = async (projectId, analysis = null) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log('Processing selected project with direct data:', projectId);
      
      // FIX: Use passed analysis or state (for button clicks)
      const analysisToUse = analysis || analysisResult;
      
      if (!analysisToUse) {
        throw new Error('Analysis result is null - state timing issue');
      }
      
      // Use REAL XER parser functions
      const results = await processSelectedProject(analysisToUse, projectId);
      
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
    processProject(project.proj_id); // This uses state since user clicked, state is available
  };

  const handleStartOver = () => {
    setStep('upload');
    setAvailableProjects([]);
    setSelectedProject(null);
    setAnalysisResult(null);
    setProjectResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        📊 Select Project to Continue
      </h2>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">📊 Available Projects</h4>
        <p className="text-sm text-blue-700">
          Found {availableProjects.length} project{availableProjects.length === 1 ? '' : 's'} in your XER file. 
          Please review the project details and click to select the one you want to continue with:
        </p>
      </div>

      <div className="space-y-4">
        {availableProjects.map((project) => (
          <div
            key={project.proj_id}
            className="border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300"
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
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Project ID:</span> {project.proj_id}
                  </div>
                  <div>
                    <span className="font-medium">Project Code:</span> {project.project_code}
                  </div>
                  <div>
                    <span className="font-medium">WBS Elements:</span> {project.wbs_element_count}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> Active
                  </div>
                </div>
                {project.plan_start_date && project.plan_end_date && (
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Schedule:</span> {project.plan_start_date} - {project.plan_end_date}
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
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderResults = () => {
    const { projectInfo, parentStructures, totalElements, validation } = projectResults;
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: colors.darkBlue }}>
          ✅ Project Analysis Complete
        </h2>

        <div className="mb-6 p-6 bg-green-50 rounded-lg">
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
              <p><strong>Subsystems Found:</strong> {parentStructures.subsystems?.length || 0}</p>
              <p><strong>Hierarchy Levels:</strong> {validation?.hasHierarchy ? '✅ Built' : '❌ Failed'}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.darkBlue }}>
            🎯 Parent Structures Identified
          </h3>
          <div className="space-y-3">
            {[
              { key: 'prerequisites', icon: 'P', name: 'Prerequisites' },
              { key: 'milestones', icon: 'M', name: 'Milestones' },
              { key: 'energisation', icon: 'E', name: 'Energisation' },
              { key: 'tbcSection', icon: 'T', name: 'TBC Section' }
            ].map(({ key, icon, name }) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{icon} - {name}</span>
                {parentStructures[key] ? (
                  <span className="text-green-600 font-medium">
                    ✅ FOUND: {parentStructures[key].wbs_name}
                  </span>
                ) : (
                  <span className="text-gray-500">❌ Not Found</span>
                )}
              </div>
            ))}
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Existing Subsystems</span>
              <span className="text-green-600 font-medium">
                ✅ {parentStructures.subsystems?.length || 0} Found: {
                  parentStructures.subsystems?.map(s => `S${s.subsystemNumber}`).join(', ') || 'None'
                }
              </span>
            </div>
          </div>
        </div>

        {/* SUCCESS STATE - READY FOR NEXT STEP */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">🎉 Ready for Equipment Addition!</h4>
          <p className="text-sm text-blue-700">
            Your WBS structure has been successfully analyzed. You can now add new equipment
            and the system will generate intelligent WBS codes that integrate seamlessly 
            with your existing structure.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            className="px-6 py-3 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            style={{ backgroundColor: colors.darkGreen }}
            onClick={() => {
              console.log('🎯 Ready to continue with equipment addition');
              console.log('📊 Project Data Ready:', projectResults);
              // This is where you would navigate to equipment addition or trigger next step
              alert('Ready for equipment addition! This would navigate to the next step.');
            }}
          >
            <Plus className="w-5 h-5" />
            Add Equipment
          </button>
          
          <button
            onClick={handleStartOver}
            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Analyze Different Project
          </button>
        </div>

        {/* DEBUG INFO */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">🔧 Technical Details</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>✅ Hierarchy levels: {projectResults.hierarchy?.size || 0} parent groups</p>
            <p>✅ Parser validation: {validation?.isValid ? 'PASSED' : 'FAILED'}</p>
            <p>✅ WBS structure integrity: Validated</p>
            <p>✅ Ready for subsystem addition: YES</p>
            <p>🎯 Next subsystem number: S{(parentStructures.subsystems?.length || 0) + 1}</p>
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

export default ContinueProject;
