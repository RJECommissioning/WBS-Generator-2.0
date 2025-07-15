// src/components/WBSGenerator.jsx

import React, { useState, createContext, useContext } from 'react';
import WorkflowSelector from './shared/WorkflowSelector';
import StartNewProject from './modes/StartNewProject';
import ContinueProject from './modes/ContinueProject';
import MissingEquipment from './modes/MissingEquipment';
import WBSTreeVisualization from './shared/WBSTreeVisualization';
import ExportPanel from './shared/ExportPanel';

// Context for project state management
const ProjectContext = createContext({
  projectState: null,
  setProjectState: () => {}
});

export const useProject = () => useContext(ProjectContext);

const WBSGenerator = () => {
  const [projectState, setProjectState] = useState(null);
  const [uploadMode, setUploadMode] = useState('new');
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

  const handleModeChange = (mode) => {
    clearWBSData();
  };

  // Common props to pass to all mode components
  const commonProps = {
    equipmentData,
    setEquipmentData,
    wbsOutput,
    setWbsOutput,
    wbsVisualization,
    setWbsVisualization,
    isProcessing,
    setIsProcessing,
    projectName,
    setProjectName,
    projectState,
    setProjectState,
    missingEquipmentConfig,
    setMissingEquipmentConfig,
    missingEquipmentAnalysis,
    setMissingEquipmentAnalysis
  };

  const renderModeComponent = () => {
    switch (uploadMode) {
      case 'new':
        return <StartNewProject {...commonProps} />;
      case 'continue':
        return <ContinueProject {...commonProps} />;
      case 'missing':
        return <MissingEquipment {...commonProps} />;
      default:
        return null;
    }
  };

  const hasWBSData = wbsOutput.length > 0 || wbsVisualization.length > 0;

  return (
    <ProjectContext.Provider value={{ projectState, setProjectState }}>
      <div className="space-y-6">
        <WorkflowSelector 
          uploadMode={uploadMode} 
          setUploadMode={setUploadMode}
          onModeChange={handleModeChange}
        />
        
        {renderModeComponent()}
        
        {hasWBSData && (
          <div className="space-y-6">
            <WBSTreeVisualization 
              wbsNodes={wbsVisualization.length > 0 ? wbsVisualization : wbsOutput} 
            />
            
            <ExportPanel 
              wbsOutput={wbsOutput}
              uploadMode={uploadMode}
              projectName={projectName}
              projectState={projectState}
              equipmentData={equipmentData}
              missingEquipmentAnalysis={missingEquipmentAnalysis}
            />
          </div>
        )}
      </div>
    </ProjectContext.Provider>
  );
};

export default WBSGenerator;
