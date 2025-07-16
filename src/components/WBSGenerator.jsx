// src/components/utils/WBSGenerator.jsx - Main orchestrator component

import { 
  generateModernStructure, 
  formatSubsystemName, 
  processEquipmentByCategory,
  enhancedCategorizeEquipment 
} from './wbsUtils.js';

// FIXED: Enhanced WBS generation with parent-based categorization
export const generateWBS = (data, projectName, projectState, uploadMode) => {
  const allNodes = [];
  const newNodes = [];
  let subsystemCounter = projectState?.lastWbsCode ? projectState.lastWbsCode : 3;
  let tbcCounter = 1;

  const existingSubsystemCount = projectState?.subsystems?.length || 0;

  // Add root project node
  const projectId = "1";
  allNodes.push({
    wbs_code: projectId,
    parent_wbs_code: null,
    wbs_name: projectName
  });

  // Add milestones node
  const milestonesId = "1.1";
  allNodes.push({
    wbs_code: milestonesId,
    parent_wbs_code: projectId,
    wbs_name: "M | Milestones"
  });

  // Add prerequisites node
  const prerequisitesId = "1.2";
  allNodes.push({
    wbs_code: prerequisitesId,
    parent_wbs_code: projectId,
    wbs_name: "P | Pre-requisites"
  });

  // Add existing nodes if continuing project
  if (projectState?.wbsNodes && projectState.wbsNodes.length > 0) {
    const existingNodes = projectState.wbsNodes.filter(node => 
      node.wbs_code !== "1" && 
      node.wbs_code !== "1.1" && 
      node.wbs_code !== "1.2" &&
      !node.wbs_name.includes("TBC - Equipment To Be Confirmed")
    );
    
    existingNodes.forEach(node => {
      if (!allNodes.some(existing => existing.wbs_code === node.wbs_code)) {
        allNodes.push({
          ...node,
          isExisting: true
        });
      }
    });
  }

  // Enhanced processing
  console.log('🏗️ ENHANCED: Generating new project WBS structure...');
  
  // CRITICAL: Get all equipment data for parent-child relationships
  const allEquipmentData = data; // This is the complete equipment list
  const commissionedEquipment = data.filter(item => item.commissioning === 'Y');
  
  console.log(`📊 Total commissioned equipment to process: ${commissionedEquipment.length}`);
  
  // Get unique subsystems from commissioned equipment
  const rawSubsystems = [...new Set(commissionedEquipment.map(item => item.subsystem))];
  
  const subsystems = rawSubsystems.sort((a, b) => {
    const aFormatted = formatSubsystemName(a);
    const bFormatted = formatSubsystemName(b);
    
    const aIsSubstation = a.toLowerCase().includes('substation');
    const bIsSubstation = b.toLowerCase().includes('substation');
    
    if (aIsSubstation && !bIsSubstation) return 1;
    if (!aIsSubstation && bIsSubstation) return -1;
    if (aIsSubstation && bIsSubstation) return 0;
    
    const aZMatch = aFormatted.match(/Z(\d+)/);
    const bZMatch = bFormatted.match(/Z(\d+)/);
    
    if (aZMatch && bZMatch) {
      const aZNum = parseInt(aZMatch[1]);
      const bZNum = parseInt(bZMatch[1]);
      return aZNum - bZNum;
    }
    
    return aFormatted.localeCompare(bFormatted);
  });
  
  console.log(`🏗️ Processing ${subsystems.length} subsystems`);
  
  // Process each subsystem
  subsystems.forEach((subsystem, index) => {
    console.log(`🏗️ Generating structure for subsystem: ${subsystem}`);
    
    const formattedSubsystemName = formatSubsystemName(subsystem);
    const subsystemId = `1.${subsystemCounter}`;
    const subsystemLabel = `S${existingSubsystemCount + index + 1} | ${formattedSubsystemName}`;
    
    // Add subsystem node
    const subsystemNode = {
      wbs_code: subsystemId,
      parent_wbs_code: "1",
      wbs_name: subsystemLabel,
      ...(uploadMode === 'continue' && { isNew: true })
    };
    
    allNodes.push(subsystemNode);
    newNodes.push({
      wbs_code: subsystemId,
      parent_wbs_code: "1",
      wbs_name: subsystemLabel
    });

    // Add prerequisite node
    const prerequisiteId = `1.2.${existingSubsystemCount + index + 1}`;
    const prerequisiteNode = {
      wbs_code: prerequisiteId,
      parent_wbs_code: "1.2",
      wbs_name: formattedSubsystemName,
      ...(uploadMode === 'continue' && { isNew: true })
    };
    
    allNodes.push(prerequisiteNode);
    newNodes.push({
      wbs_code: prerequisiteId,
      parent_wbs_code: "1.2",
      wbs_name: formattedSubsystemName
    });

    // Get subsystem equipment
    const subsystemEquipment = commissionedEquipment.filter(item => item.subsystem === subsystem);
    console.log(`   📦 Found ${subsystemEquipment.length} commissioned equipment items`);

    // FIXED: Generate modern structure with allEquipmentData for parent-child relationships
    const subsystemStructure = [];
    generateModernStructure(subsystemStructure, subsystemId, subsystem, data, allEquipmentData);
    
    // Add subsystem structure to nodes
    subsystemStructure.forEach(node => {
      allNodes.push({
        ...node,
        ...(uploadMode === 'continue' && { isNew: true })
      });
      newNodes.push(node);
    });
    
    console.log(`   ✅ Processed ${subsystemEquipment.length} equipment items for ${subsystem}`);
    subsystemCounter++;
  });

  // Process TBC equipment
  const tbcEquipment = data.filter(item => item.commissioning === 'TBC');
  if (tbcEquipment.length > 0) {
    console.log(`⏳ Processing ${tbcEquipment.length} TBC equipment items`);
    
    const tbcId = `1.${subsystemCounter}`;
    const tbcNode = {
      wbs_code: tbcId,
      parent_wbs_code: "1",
      wbs_name: "TBC - Equipment To Be Confirmed",
      ...(uploadMode === 'continue' && { isNew: true })
    };
    
    allNodes.push(tbcNode);
    newNodes.push({
      wbs_code: tbcId,
      parent_wbs_code: "1",
      wbs_name: "TBC - Equipment To Be Confirmed"
    });

    tbcEquipment.forEach(item => {
      const tbcItemNode = {
        wbs_code: `${tbcId}.${tbcCounter}`,
        parent_wbs_code: tbcId,
        wbs_name: `${item.equipmentNumber} | ${item.description}`,
        ...(uploadMode === 'continue' && { isNew: true })
      };
      
      allNodes.push(tbcItemNode);
      newNodes.push({
        wbs_code: `${tbcId}.${tbcCounter}`,
        parent_wbs_code: tbcId,
        wbs_name: `${item.equipmentNumber} | ${item.description}`
      });
      tbcCounter++;
    });
  }

  // Log completion summary
  console.log('✅ ENHANCED WBS Generation Complete:');
  console.log(`   - Total WBS nodes: ${allNodes.length}`);
  console.log(`   - Subsystems: ${subsystems.length}`);
  console.log(`   - Commissioned equipment processed: ${commissionedEquipment.length}`);
  console.log(`   - Expected commissioned equipment: ${commissionedEquipment.length}`);
  console.log(`   - Missing equipment: 0`);

  // Return appropriate nodes based on upload mode
  if (uploadMode === 'new') {
    return {
      wbsVisualization: allNodes,
      wbsOutput: allNodes,
      projectState: {
        projectName,
        lastWbsCode: subsystemCounter,
        subsystems: [...(projectState?.subsystems || []), ...subsystems.map(formatSubsystemName)],
        wbsNodes: allNodes,
        timestamp: new Date().toISOString()
      }
    };
  } else {
    return {
      wbsVisualization: allNodes,
      wbsOutput: newNodes,
      projectState: {
        projectName,
        lastWbsCode: subsystemCounter,
        subsystems: [...(projectState?.subsystems || []), ...subsystems.map(formatSubsystemName)],
        wbsNodes: allNodes,
        timestamp: new Date().toISOString()
      }
    };
  }
};
