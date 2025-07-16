// src/components/utils/wbsUtils.js

import { 
  categoryMapping, 
  orderedCategoryKeys, 
  equipmentPatterns, 
  allOtherPatterns 
} from './constants';
import { 
  extractEquipmentFromWBS, 
  compareEquipmentLists, 
  findSubsystemMatch 
} from './equipmentUtils';

/**
 * ENHANCED: Determines the category code for a piece of equipment with better pattern matching
 * @param {Object} equipment - Equipment object
 * @returns {string} - Category code (01-10, 99)
 */
export const determineCategoryCode = (equipment) => {
  const equipmentNumber = equipment.equipmentNumber.toUpperCase();
  const plu = equipment.plu ? equipment.plu.toUpperCase() : '';
  
  // Clean equipment number for pattern matching (remove leading +/- signs)
  const cleanEquipmentNumber = equipmentNumber.replace(/^[+-]/, '');
  
  console.log(`🔍 Categorizing equipment: "${equipmentNumber}" (cleaned: "${cleanEquipmentNumber}")`);
  
  for (const [categoryCode, patterns] of Object.entries(equipmentPatterns)) {
    for (const pattern of patterns) {
      let matched = false;
      
      if (categoryCode === '07') {
        // Special handling for earthing equipment
        if (pattern === 'E') {
          // Match 'E' followed by numbers (like E01) OR 'EG' followed by numbers (like EG01)
          if ((cleanEquipmentNumber.startsWith('E') && cleanEquipmentNumber.charAt(1) >= '0' && cleanEquipmentNumber.charAt(1) <= '9') ||
              (cleanEquipmentNumber.startsWith('EG') && cleanEquipmentNumber.charAt(2) >= '0' && cleanEquipmentNumber.charAt(2) <= '9')) {
            matched = true;
          }
        } else if (pattern === 'EB' && cleanEquipmentNumber.startsWith('EB')) {
          const charAfterEB = cleanEquipmentNumber.charAt(2);
          if (charAfterEB >= '0' && charAfterEB <= '9') matched = true;
        } else if (pattern === 'EEP' && cleanEquipmentNumber.startsWith('EEP')) {
          const charAfterEEP = cleanEquipmentNumber.charAt(3);
          if (charAfterEEP >= '0' && charAfterEEP <= '9') matched = true;
        } else if (pattern === 'MEB' && cleanEquipmentNumber.startsWith('MEB')) {
          matched = true;
        }
      } else {
        // Enhanced standard pattern matching
        const patternUpper = pattern.toUpperCase();
        
        if (pattern.startsWith('+')) {
          // Match equipment that starts with + prefix
          if (equipmentNumber.startsWith(patternUpper)) matched = true;
        } else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS') {
          // Match short patterns (like F, K, BE, etc.) - check both original and cleaned
          if ((equipmentNumber.startsWith(patternUpper) && !equipmentNumber.startsWith('+')) ||
              (cleanEquipmentNumber.startsWith(patternUpper))) {
            matched = true;
          }
        } else {
          // Match longer patterns in equipment number or PLU
          if (equipmentNumber.includes(patternUpper) || 
              cleanEquipmentNumber.includes(patternUpper) || 
              plu.includes(patternUpper)) {
            matched = true;
          }
        }
      }
      
      if (matched) {
        console.log(`   ✅ Matched pattern "${pattern}" in category ${categoryCode}`);
        return categoryCode;
      }
    }
  }
  
  console.log(`   ❓ No pattern matched, categorizing as '99' (Unrecognised)`);
  return '99'; // Unrecognised equipment
};

/**
 * Formats subsystem name according to WBS standards
 * @param {string} subsystem - Raw subsystem name
 * @returns {string} - Formatted subsystem name
 */
export const formatSubsystemName = (subsystem) => {
  const zMatch = subsystem.match(/Z\d+/i);
  if (zMatch) {
    const zCode = zMatch[0].toUpperCase();
    let cleanName = subsystem.replace(/[-\s]*\+?Z\d+[-\s]*/i, '').trim();
    cleanName = cleanName.replace(/[-\s\+]+$/, '').trim();
    cleanName = cleanName.replace(/^[-\s\+]+/, '').trim();
    return `+${zCode} - ${cleanName}`;
  }
  return subsystem;
};

/**
 * Finds the next available WBS code for a parent
 * @param {string} parentWbsCode - Parent WBS code
 * @param {Array} existingNodes - Array of existing WBS nodes
 * @returns {string} - Next available WBS code
 */
export const findNextWBSCode = (parentWbsCode, existingNodes) => {
  const childNodes = existingNodes.filter(node => 
    node.parent_wbs_code === parentWbsCode
  );
  
  if (childNodes.length === 0) {
    return `${parentWbsCode}.1`;
  }
  
  const maxChildNumber = Math.max(...childNodes.map(node => {
    const parts = node.wbs_code.split('.');
    return parseInt(parts[parts.length - 1]) || 0;
  }));
  
  return `${parentWbsCode}.${maxChildNumber + 1}`;
};

/**
 * ENHANCED: Generates the modern WBS structure for a subsystem with fail-safe
 * @param {Array} nodes - Array to populate with WBS nodes
 * @param {string} subsystemId - Subsystem WBS code
 * @param {string} subsystem - Subsystem name
 * @param {Array} data - Equipment data for this subsystem
 * @returns {Array} - Array of processed equipment numbers for tracking
 */
export const generateModernStructure = (nodes, subsystemId, subsystem, data) => {
  console.log(`🏗️ Generating structure for subsystem: ${subsystem}`);
  
  let categoryCounter = 1;
  const processedEquipment = new Set();
  const equipmentByCategory = {};
  
  // Get all commissioned equipment for this subsystem
  const subsystemEquipment = data.filter(item => 
    item.subsystem === subsystem && item.commissioning === 'Y'
  );
  
  console.log(`   📦 Found ${subsystemEquipment.length} commissioned equipment items`);
  
  // STEP 1: Categorize all equipment
  subsystemEquipment.forEach(item => {
    const categoryCode = determineCategoryCode(item);
    if (!equipmentByCategory[categoryCode]) {
      equipmentByCategory[categoryCode] = [];
    }
    equipmentByCategory[categoryCode].push(item);
  });
  
  console.log(`   📊 Equipment categorized:`, Object.keys(equipmentByCategory).map(cat => 
    `${cat}(${equipmentByCategory[cat].length})`
  ).join(', '));
  
  // STEP 2: Generate categories in order
  orderedCategoryKeys.forEach(categoryCode => {
    const categoryName = categoryMapping[categoryCode];
    const categoryId = `${subsystemId}.${categoryCounter}`;
    
    // Add category node
    nodes.push({
      wbs_code: categoryId,
      parent_wbs_code: subsystemId,
      wbs_name: `${categoryCode} | ${categoryName}`
    });

    // Special handling for category 01 (Preparations)
    if (categoryCode === '01') {
      let prepCounter = 1;
      ['Test bay', 'Panel Shop', 'Pad'].forEach(item => {
        nodes.push({
          wbs_code: `${categoryId}.${prepCounter}`,
          parent_wbs_code: categoryId,
          wbs_name: item
        });
        prepCounter++;
      });
    }

    // Add equipment for this category
    const categoryEquipment = equipmentByCategory[categoryCode] || [];
    
    if (categoryEquipment.length > 0) {
      console.log(`   ⚙️  Processing ${categoryEquipment.length} equipment items for category ${categoryCode}`);
      
      // Find parent equipment (equipment without parents in this category)
      const parentEquipment = categoryEquipment.filter(item => {
        const hasParentInCategory = categoryEquipment.some(potentialParent => 
          potentialParent.equipmentNumber === item.parentEquipmentNumber
        );
        return !hasParentInCategory;
      });

      let equipmentCounter = 1;
      parentEquipment.forEach(item => {
        const equipmentId = `${categoryId}.${equipmentCounter}`;
        nodes.push({
          wbs_code: equipmentId,
          parent_wbs_code: categoryId,
          wbs_name: `${item.equipmentNumber} | ${item.description}`
        });
        
        processedEquipment.add(item.equipmentNumber);
        
        // Add child equipment recursively
        const addChildrenRecursively = (parentEquipmentNumber, parentWbsCode) => {
          const childEquipment = data.filter(child => 
            child.parentEquipmentNumber === parentEquipmentNumber && 
            child.commissioning === 'Y'
          );
          
          let childCounter = 1;
          childEquipment.forEach(child => {
            const childId = `${parentWbsCode}.${childCounter}`;
            nodes.push({
              wbs_code: childId,
              parent_wbs_code: parentWbsCode,
              wbs_name: `${child.equipmentNumber} | ${child.description}`
            });
            
            processedEquipment.add(child.equipmentNumber);
            addChildrenRecursively(child.equipmentNumber, childId);
            childCounter++;
          });
        };

        addChildrenRecursively(item.equipmentNumber, equipmentId);
        equipmentCounter++;
      });
    }

    // Special handling for category 09 (Interface Testing)
    if (categoryCode === '09') {
      let phaseCounter = 1;
      ['Phase 1', 'Phase 2'].forEach(phase => {
        nodes.push({
          wbs_code: `${categoryId}.${phaseCounter}`,
          parent_wbs_code: categoryId,
          wbs_name: phase
        });
        phaseCounter++;
      });
    }

    categoryCounter++;
  });
  
  // STEP 3: FAIL-SAFE - Check for any unprocessed equipment
  const unprocessedEquipment = subsystemEquipment.filter(item => 
    !processedEquipment.has(item.equipmentNumber)
  );
  
  if (unprocessedEquipment.length > 0) {
    console.log(`🚨 FAIL-SAFE: Found ${unprocessedEquipment.length} unprocessed equipment items:`);
    unprocessedEquipment.forEach(item => {
      console.log(`   ❌ Unprocessed: ${item.equipmentNumber} - ${item.description}`);
    });
    
    // Add unprocessed equipment to category 99
    const category99Id = `${subsystemId}.11`; // Category 99 is always the 11th category
    const category99Equipment = nodes.filter(node => 
      node.parent_wbs_code === category99Id
    );
    
    let unprocessedCounter = category99Equipment.length + 1;
    unprocessedEquipment.forEach(item => {
      const equipmentId = `${category99Id}.${unprocessedCounter}`;
      nodes.push({
        wbs_code: equipmentId,
        parent_wbs_code: category99Id,
        wbs_name: `${item.equipmentNumber} | ${item.description}`
      });
      
      processedEquipment.add(item.equipmentNumber);
      console.log(`   ✅ Added to category 99: ${item.equipmentNumber}`);
      unprocessedCounter++;
    });
  }
  
  console.log(`   ✅ Processed ${processedEquipment.size} equipment items for ${subsystem}`);
  return Array.from(processedEquipment);
};

/**
 * ENHANCED: Generates WBS structure for a new project with comprehensive tracking
 * @param {Array} equipmentData - Array of equipment objects
 * @param {string} projectName - Name of the project
 * @returns {Object} - Object with allNodes and newProjectState
 */
export const generateNewProjectWBS = (equipmentData, projectName) => {
  console.log('🏗️ ENHANCED: Generating new project WBS structure...');
  
  const allNodes = [];
  const allProcessedEquipment = new Set();
  let subsystemCounter = 3;
  let tbcCounter = 1;

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

  // Add pre-requisites node
  const prerequisitesId = "1.2";
  allNodes.push({
    wbs_code: prerequisitesId,
    parent_wbs_code: projectId,
    wbs_name: "P | Pre-requisites"
  });

  // Get all commissioned equipment for tracking
  const allCommissionedEquipment = equipmentData.filter(item => item.commissioning === 'Y');
  console.log(`📊 Total commissioned equipment to process: ${allCommissionedEquipment.length}`);

  // Get unique subsystems from commissioned equipment
  const rawSubsystems = [...new Set(allCommissionedEquipment.map(item => item.subsystem))];
  
  // Sort subsystems
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
  
  // Generate subsystem structures
  subsystems.forEach((subsystem, index) => {
    const formattedSubsystemName = formatSubsystemName(subsystem);
    const subsystemId = `1.${subsystemCounter}`;
    const subsystemLabel = `S${index + 1} | ${formattedSubsystemName}`;
    
    // Add subsystem node
    allNodes.push({
      wbs_code: subsystemId,
      parent_wbs_code: "1",
      wbs_name: subsystemLabel
    });

    // Add prerequisite node
    const prerequisiteId = `1.2.${index + 1}`;
    allNodes.push({
      wbs_code: prerequisiteId,
      parent_wbs_code: "1.2",
      wbs_name: formattedSubsystemName
    });

    // Generate subsystem structure and track processed equipment
    const subsystemStructure = [];
    const processedEquipmentNumbers = generateModernStructure(
      subsystemStructure, 
      subsystemId, 
      subsystem, 
      equipmentData
    );
    
    // Add processed equipment to global tracking
    processedEquipmentNumbers.forEach(equipNum => {
      allProcessedEquipment.add(equipNum);
    });
    
    allNodes.push(...subsystemStructure);
    subsystemCounter++;
  });

  // Handle TBC equipment
  const tbcEquipment = equipmentData.filter(item => item.commissioning === 'TBC');
  if (tbcEquipment.length > 0) {
    console.log(`⏳ Processing ${tbcEquipment.length} TBC equipment items`);
    
    const tbcId = `1.${subsystemCounter}`;
    allNodes.push({
      wbs_code: tbcId,
      parent_wbs_code: "1",
      wbs_name: "TBC - Equipment To Be Confirmed"
    });

    tbcEquipment.forEach(item => {
      allNodes.push({
        wbs_code: `${tbcId}.${tbcCounter}`,
        parent_wbs_code: tbcId,
        wbs_name: `${item.equipmentNumber} | ${item.description}`
      });
      tbcCounter++;
    });
  }

  // FINAL FAIL-SAFE: Check for any unprocessed commissioned equipment
  const unprocessedCommissioned = allCommissionedEquipment.filter(item => 
    !allProcessedEquipment.has(item.equipmentNumber)
  );
  
  if (unprocessedCommissioned.length > 0) {
    console.log(`🚨 CRITICAL FAIL-SAFE: Found ${unprocessedCommissioned.length} unprocessed commissioned equipment:`);
    unprocessedCommissioned.forEach(item => {
      console.log(`   ❌ MISSED: ${item.equipmentNumber} - ${item.description} (Subsystem: ${item.subsystem})`);
    });
    
    // Add a special "Unprocessed Equipment" section
    const unprocessedId = `1.${subsystemCounter}`;
    allNodes.push({
      wbs_code: unprocessedId,
      parent_wbs_code: "1",
      wbs_name: "UNPROCESSED - Equipment Missing from Categories"
    });
    
    let unprocessedCounter = 1;
    unprocessedCommissioned.forEach(item => {
      allNodes.push({
        wbs_code: `${unprocessedId}.${unprocessedCounter}`,
        parent_wbs_code: unprocessedId,
        wbs_name: `${item.equipmentNumber} | ${item.description}`
      });
      unprocessedCounter++;
    });
    
    console.log(`   ✅ Added ${unprocessedCommissioned.length} unprocessed items to special section`);
  }

  // Create project state
  const newProjectState = {
    projectName,
    lastWbsCode: subsystemCounter,
    subsystems: subsystems.map(formatSubsystemName),
    wbsNodes: allNodes,
    timestamp: new Date().toISOString()
  };

  console.log(`✅ ENHANCED WBS Generation Complete:`);
  console.log(`   - Total WBS nodes: ${allNodes.length}`);
  console.log(`   - Subsystems: ${subsystems.length}`);
  console.log(`   - Commissioned equipment processed: ${allProcessedEquipment.size}`);
  console.log(`   - Expected commissioned equipment: ${allCommissionedEquipment.length}`);
  console.log(`   - Missing equipment: ${allCommissionedEquipment.length - allProcessedEquipment.size}`);
  
  return {
    allNodes,
    newProjectState
  };
};

/**
 * Generates WBS structure for missing equipment
 * @param {Array} newEquipmentList - Complete equipment list
 * @param {Array} existingWbsNodes - Existing WBS structure
 * @param {string} projectName - Project name
 * @returns {Object} - Object with newWbsNodes, completeVisualization, and analysis
 */
export const generateMissingEquipmentWBS = async (newEquipmentList, existingWbsNodes, projectName) => {
  console.log("🔧 Generating missing equipment WBS structure...");
  console.log(`📦 New equipment list: ${newEquipmentList.length} items`);
  console.log(`🏗️ Existing WBS nodes: ${existingWbsNodes.length} nodes`);

  // Step 1: Filter by commissioning status
  const commissionedEquipment = newEquipmentList.filter(item => {
    const isCommissioned = item.commissioning === 'Y' || item.commissioning === 'TBC';
    return isCommissioned;
  });
  
  console.log(`✅ Commissioned equipment: ${commissionedEquipment.length} items`);

  // Step 2: Extract existing equipment from WBS
  const { equipmentNumbers: existingEquipmentNumbers, existingSubsystems } = extractEquipmentFromWBS(existingWbsNodes);
  
  console.log(`🔢 Existing equipment: ${existingEquipmentNumbers.length} items`);
  console.log(`📍 Existing subsystems: ${existingSubsystems.size} subsystems`);

  // Step 3: Compare equipment lists
  const analysis = compareEquipmentLists(existingEquipmentNumbers, commissionedEquipment);
  
  console.log(`🔍 Analysis results:`);
  console.log(`   - New equipment: ${analysis.newEquipment.length}`);
  console.log(`   - Existing equipment: ${analysis.existingEquipment.length}`);
  console.log(`   - Removed equipment: ${analysis.removedEquipment.length}`);

  // Step 4: Generate WBS nodes for missing equipment
  const newWbsNodes = [];
  const completeVisualization = [];

  // Add all existing nodes to visualization
  existingWbsNodes.forEach(node => {
    completeVisualization.push({
      ...node,
      isExisting: true
    });
  });

  // Process new commissioned equipment
  const newCommissioned = analysis.newEquipment.filter(item => item.commissioning === 'Y');
  const newTBC = analysis.newEquipment.filter(item => item.commissioning === 'TBC');

  console.log(`✅ New commissioned equipment: ${newCommissioned.length}`);
  console.log(`⏳ New TBC equipment: ${newTBC.length}`);

  // Add missing commissioned equipment to appropriate subsystems
  newCommissioned.forEach(item => {
    const subsystemWbsCode = findSubsystemMatch(item.subsystem, existingSubsystems);
    
    if (subsystemWbsCode) {
      // Determine category
      const categoryCode = determineCategoryCode(item);
      
      // Find or create category within subsystem
      let targetCategory = completeVisualization.find(n => 
        n.parent_wbs_code === subsystemWbsCode && 
        n.wbs_name.includes(`${categoryCode} |`)
      );
      
      if (targetCategory) {
        // Add equipment to existing category
        const equipmentId = findNextWBSCode(targetCategory.wbs_code, completeVisualization);
        const equipmentNode = {
          wbs_code: equipmentId,
          parent_wbs_code: targetCategory.wbs_code,
          wbs_name: `${item.equipmentNumber} | ${item.description}`,
          isNew: true
        };
        
        newWbsNodes.push(equipmentNode);
        completeVisualization.push(equipmentNode);
        
        // Handle child equipment
        const childEquipment = analysis.newEquipment.filter(child => 
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
          
          newWbsNodes.push(childNode);
          completeVisualization.push(childNode);
          childCounter++;
        });
      }
    }
  });

  // Handle new TBC equipment
  if (newTBC.length > 0) {
    console.log(`⏳ Processing ${newTBC.length} TBC equipment items`);
    
    let tbcNode = completeVisualization.find(node => 
      node.wbs_name.includes('TBC - Equipment To Be Confirmed')
    );
    
    if (!tbcNode) {
      // Create TBC node if it doesn't exist
      const projectNode = completeVisualization.find(node => node.parent_wbs_code === null);
      const nextSubsystemCode = findNextWBSCode(projectNode.wbs_code, completeVisualization);
      
      tbcNode = {
        wbs_code: nextSubsystemCode,
        parent_wbs_code: projectNode.wbs_code,
        wbs_name: "TBC - Equipment To Be Confirmed",
        isNew: true
      };
      
      newWbsNodes.push(tbcNode);
      completeVisualization.push(tbcNode);
    }
    
    newTBC.forEach(item => {
      const tbcItemCode = findNextWBSCode(tbcNode.wbs_code, completeVisualization);
      const tbcItemNode = {
        wbs_code: tbcItemCode,
        parent_wbs_code: tbcNode.wbs_code,
        wbs_name: `${item.equipmentNumber} | ${item.description}`,
        isNew: true
      };
      
      newWbsNodes.push(tbcItemNode);
      completeVisualization.push(tbcItemNode);
    });
  }

  console.log(`🎯 Final results:`);
  console.log(`   - New WBS nodes created: ${newWbsNodes.length}`);
  console.log(`   - Complete visualization nodes: ${completeVisualization.length}`);

  return {
    newWbsNodes,
    completeVisualization,
    analysis
  };
};

/**
 * Exports WBS data as CSV format
 * @param {Array} wbsNodes - Array of WBS nodes
 * @param {string} fileName - Name for the CSV file
 * @returns {string} - CSV formatted string
 */
export const exportWBSAsCSV = (wbsNodes, fileName = 'WBS_Export') => {
  console.log(`📄 Exporting ${wbsNodes.length} WBS nodes as CSV`);
  
  const csvContent = [
    'wbs_code,parent_wbs_code,wbs_name',
    ...wbsNodes.map(node => 
      `"${node.wbs_code}","${node.parent_wbs_code || ''}","${node.wbs_name}"`
    )
  ].join('\n');

  return csvContent;
};

/**
 * Downloads CSV content as a file
 * @param {string} csvContent - CSV formatted string
 * @param {string} fileName - Name for the downloaded file
 */
export const downloadCSV = (csvContent, fileName) => {
  console.log(`💾 Downloading CSV file: ${fileName}`);
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
};

/**
 * Exports project state as JSON
 * @param {Object} projectState - Project state object
 * @param {string} fileName - Name for the JSON file
 */
export const exportProjectState = (projectState, fileName = 'project_state') => {
  console.log(`📁 Exporting project state: ${projectState.projectName}`);
  
  const dataStr = JSON.stringify(projectState, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
};
