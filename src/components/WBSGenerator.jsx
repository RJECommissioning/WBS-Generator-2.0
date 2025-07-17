import React, { useState, createContext, useContext } from 'react';
import WorkflowSelector from './shared/WorkflowSelector.jsx';
import StartNewProject from './modes/StartNewProject.jsx';
import ContinueProject from './modes/ContinueProject.jsx';
import MissingEquipment from './modes/MissingEquipment.jsx';
import WBSTreeVisualization from './shared/WBSTreeVisualization.jsx';
import ExportPanel from './shared/ExportPanel.jsx';
import { rjeColors } from './utils/constants.js';

const ProjectContext = createContext({
  projectState: null,
  setProjectState: () => {}
});

const WBSGeneratorApp = () => {
  const [projectState, setProjectState] = useState(null);

  return (
    <ProjectContext.Provider value={{ projectState, setProjectState }}>
      <WBSGenerator />
    </ProjectContext.Provider>
  );
};

const WBSGenerator = () => {
  const { projectState, setProjectState } = useContext(ProjectContext);
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

  const commonProps = {
    projectState,
    setProjectState,
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
    missingEquipmentConfig,
    setMissingEquipmentConfig,
    missingEquipmentAnalysis,
    setMissingEquipmentAnalysis,
    clearWBSData
  };

  return (
    <div className="space-y-6">
      <WorkflowSelector 
        uploadMode={uploadMode} 
        setUploadMode={setUploadMode}
        clearWBSData={clearWBSData}
      />

      {uploadMode === 'new' && (
        <StartNewProject {...commonProps} />
      )}

      {uploadMode === 'continue' && (
        <ContinueProject {...commonProps} />
      )}

      {uploadMode === 'missing' && (
        <MissingEquipment {...commonProps} />
      )}

      {(wbsOutput.length > 0 || wbsVisualization.length > 0) && (
        <div className="space-y-6">
          <WBSTreeVisualization 
            wbsNodes={wbsVisualization.length > 0 ? wbsVisualization : wbsOutput} 
          />
          
          <ExportPanel 
            wbsOutput={wbsOutput}
            projectName={projectName}
            uploadMode={uploadMode}
            projectState={projectState}
            equipmentData={equipmentData}
            missingEquipmentAnalysis={missingEquipmentAnalysis}
          />
        </div>
      )}
    </div>
  );
};

export { ProjectContext };
export default WBSGeneratorApp;
