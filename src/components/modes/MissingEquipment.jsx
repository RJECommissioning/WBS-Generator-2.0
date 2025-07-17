// src/components/utils/missingEquipmentUtils.js - Missing Equipment Processing

import { 
  extractEquipmentNumbers, 
  findNextWBSCode, 
  determineCategoryCode,
  formatSubsystemName 
} from './wbsUtils.js';
import { 
  findSubsystemMatch, 
  compareEquipmentLists,
  isValidEquipmentNumber 
} from './equipmentUtils.js';

// FIXED: Complete rewrite of generateMissingEquipmentWBS function
export const generateMissingEquipmentWBS = (newEquipmentList, existingWbsNodes, existingProjectName) => {
  console.log("🔧 DEBUG: Missing Equipment WBS Generation Started");
  console.log(`📦 New equipment list received: ${newEquipmentList.length} items`);
  
  if (!existingWbsNodes || existingWbsNodes.length === 0) {
    console.log("❌ No existing WBS structure provided");
    throw new Error('No existing WBS structure provided');
  }

  console.log(`🏗️ Existing WBS nodes: ${existingWbsNodes.length} nodes`);

  // STEP 1: CRITICAL - Filter by commissioning status FIRST
  const commissionedEquipment = newEquipmentList.filter(item => {
    const isCommissioned = item.commissioning === 'Y' || item.commissioning === 'TBC';
    const hasValidEquipmentNumber = isValidEquipmentNumber(item.equipmentNumber);
    
    if (!isCommissioned) {
      console.log(`🚫 Excluded (N): ${item.equipmentNumber} - ${item.description}`);
      return false;
    }
    
    if (!hasValidEquipmentNumber) {
      console.log(`🚫 Invalid equipment number: ${item.equipmentNumber}`);
      return false;
    }
    
    return true;
  });
  
  console.log(`✅ After commissioning filter: ${commissionedEquipment.length} items (from ${newEquipmentList.length} total)`);
  console.log(`   - Commissioned (Y): ${commissionedEquipment.filter(item => item.commissioning === 'Y').length}`);
  console.log(`   - TBC: ${commissionedEquipment.filter(item => item.commissioning === 'TBC').length}`);

  // STEP 2: Extract existing equipment from WBS structure
  const { equipmentNumbers: existingEquipmentNumbers, existingSubsystems } = extractEquipmentNumbers(existingWbsNodes);
  
  console.log(`🔢 Extracted equipment numbers from WBS: ${existingEquipmentNumbers.length}`);
  console.log(`📍 Found existing subsystems: ${existingSubsystems.size}`);
  console.log("🔍 First 10 extracted equipment numbers:");
  existingEquipmentNumbers.slice(0, 10).forEach(num => console.log(`   ${num}`));
  
  // STEP 3: Find genuinely missing equipment
  const existingEquipmentSet = new Set(existingEquipmentNumbers);
  const missingEquipment = commissionedEquipment.filter(item => {
    const equipmentNumber = item.equipmentNumber?.trim();
    const exists = existingEquipmentSet.has(equipmentNumber);
    
    if (!exists) {
      const subsystemMatch = findSubsystemMatch(item.subsystem, existingSubsystems);
      if (!subsystemMatch) {
        console.log(`⚠️ No subsystem match for ${equipmentNumber} in ${item.subsystem}`);
      }
    }
    
    return !exists; // Return true if equipment is missing
  });
  
  const analysis = compareEquipmentLists(existingEquipmentNumbers, commissionedEquipment);
  
  console.log(`🔍 Equipment Analysis:`);
  console.log(`   - Existing equipment: ${existingEquipmentNumbers.length}`);
  console.log(`   - Valid new equipment: ${commissionedEquipment.length}`);
  console.log(`   - Missing equipment: ${missingEquipment.length}`);
  
  if (missingEquipment.length === 0) {
    console.log("✅ No new relevant equipment found - all commissioned/TBC equipment exists in WBS structure");
    return {
      allNodes: existingWbsNodes.map(node => ({ ...node, isExisting: true })),
      newNodes: [],
      analysis: {
        newEquipment: [],
        existingEquipment: analysis.existingEquipment,
        removedEquipment: analysis.removedEquipment
      },
      projectName: existingProjectName
    };
  }

  console.log("🏗️ Building new WBS nodes for missing equipment...");
  
  const allNodes = [];
  const newNodes = [];
  
  // Add all existing nodes to visualization (without isNew flag)
  existingWbsNodes.forEach(node => {
    allNodes.push({
      ...node,
      isExisting: true
    });
  });
  
  console.log(`📋 Added ${existingWbsNodes.length} existing nodes to visualization`);
  
  // Process missing equipment by commissioning status
  const missingCommissioned = missingEquipment.filter(item => item.commissioning === 'Y');
  const missingTBC = missingEquipment.filter(item => item.commissioning === 'TBC');
  
  console.log(`✅ Missing commissioned equipment: ${missingCommissioned.length}`);
  console.log(`⏳ Missing TBC equipment: ${missingTBC.length}`);
  
  // Add missing commissioned equipment to appropriate subsystems
  let newNodeCounter = Math.max(...allNodes.map(n => {
    const parts = n.wbs_code.split('.');
    return parseInt(parts[parts.length - 1]) || 0;
  })) + 1;
  
  missingCommissioned.forEach(item => {
    const subsystemWbsCode = findSubsystemMatch(item.subsystem, existingSubsystems);
    
    if (subsystemWbsCode) {
      // Determine category for this equipment
      const category = determineCategoryCode(item, missingEquipment);
      
      // Find or create the appropriate category within subsystem
      let targetCategory = allNodes.find(n => 
        n.parent_wbs_code === subsystemWbsCode && 
        n.wbs_name.includes(`${category} |`)
      );
      
      if (!targetCategory) {
        // Create category if it doesn't exist
        const categoryId = `${subsystemWbsCode}.${newNodeCounter++}`;
        const categoryName = getCategoryName(category);
        targetCategory = {
          wbs_code: categoryId,
          parent_wbs_code: subsystemWbsCode,
          wbs_name: `${category} | ${categoryName}`,
          isNew: true
        };
        allNodes.push(targetCategory);
        newNodes.push(targetCategory);
      }
      
      // Add equipment to category
      const equipmentId = `${targetCategory.wbs_code}.${newNodeCounter++}`;
      const equipmentNode = {
        wbs_code: equipmentId,
        parent_wbs_code: targetCategory.wbs_code,
        wbs_name: `${item.equipmentNumber} | ${item.description}`,
        isNew: true
      };
      
      allNodes.push(equipmentNode);
      newNodes.push(equipmentNode);
      
      // Handle child equipment
      const childEquipment = missingEquipment.filter(child => 
        child.parentEquipmentNumber === item.equipmentNumber && 
        child.commissioning === 'Y'
      );
      
      let childCounter = 1;
      childEquipment.forEach(child => {
        const childWbsCode = `${equipmentId}.${childCounter}`;
        const childNode = {
          wbs_code: childWbsCode,
          parent_wbs_code: equipmentId,
          wbs_name: `${child.equipmentNumber} | ${child.description}`,
          isNew: true
        };
        
        allNodes.push(childNode);
        newNodes.push(childNode);
        childCounter++;
      });
    } else {
      console.log(`⚠️ No subsystem match found for ${item.equipmentNumber} in ${item.subsystem}`);
    }
  });
  
  // Handle new TBC equipment
  if (missingTBC.length > 0) {
    console.log(`⏳ Processing ${missingTBC.length} TBC equipment items`);
    
    let tbcNode = allNodes.find(node => 
      node.wbs_name.includes('TBC - Equipment To Be Confirmed')
    );
    
    if (!tbcNode) {
      const projectNode = allNodes.find(node => node.parent_wbs_code === null);
      const nextSubsystemCode = findNextWBSCode(projectNode.wbs_code, allNodes);
      
      tbcNode = {
        wbs_code: nextSubsystemCode,
        parent_wbs_code: projectNode.wbs_code,
        wbs_name: "TBC - Equipment To Be Confirmed",
        isNew: true
      };
      
      allNodes.push(tbcNode);
      newNodes.push(tbcNode);
    }
    
    missingTBC.forEach(item => {
      const tbcItemCode = findNextWBSCode(tbcNode.wbs_code, allNodes);
      const tbcItemNode = {
        wbs_code: tbcItemCode,
        parent_wbs_code: tbcNode.wbs_code,
        wbs_name: `${item.equipmentNumber} | ${item.description}`,
        isNew: true
      };
      
      allNodes.push(tbcItemNode);
      newNodes.push(tbcItemNode);
    });
  }
  
  console.log(`🎯 Final results:`);
  console.log(`   New WBS nodes created: ${newNodes.length}`);
  console.log(`   Complete visualization nodes: ${allNodes.length}`);
  
  return {
    allNodes,
    newNodes,
    analysis: {
      newEquipment: missingEquipment,
      existingEquipment: analysis.existingEquipment,
      removedEquipment: analysis.removedEquipment
    },
    projectName: existingProjectName
  };
};

// Helper function to get category name
const getCategoryName = (categoryCode) => {
  const categoryMapping = {
    '01': 'Preparations and set-up',
    '02': 'Protection Panels',
    '03': 'HV Switchboards',
    '04': 'LV Switchboards',
    '05': 'Transformers',
    '06': 'Battery Systems',
    '07': 'Earthing',
    '08': 'Building Services',
    '09': 'Interface Testing',
    '10': 'Ancillary Systems',
    '99': 'Unrecognised Equipment'
  };
  
  return categoryMapping[categoryCode] || 'Unknown Category';
};
