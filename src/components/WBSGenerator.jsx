// src/components/WBSGenerator.jsx - Integration update for conditional visualization rendering

// Add this import at the top with your other imports:
import StartNewProjectVisualization from './shared/StartNewProjectVisualization.jsx';

// Then in your WBSGenerator component, replace the existing WBS output section with:

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
        <p className="text-gray-600">ContinueProjectVisualization component will be created next...</p>
      </div>
    )}
    
    {/* Missing Equipment Visualization - Coming Next */}
    {uploadMode === uploadModes.MISSING_EQUIPMENT && (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
          🔧 Missing Equipment Visualization (Coming Soon)
        </h3>
        <p className="text-gray-600">MissingEquipmentVisualization component will be created next...</p>
      </div>
    )}
    
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
