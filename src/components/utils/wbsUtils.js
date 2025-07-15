// src/components/utils/wbsUtils.js

import { 
  categoryMapping, 
  orderedCategoryKeys, 
  equipmentPatterns, 
  allOtherPatterns 
} from './constants';
import { 
  formatSubsystemName, 
  determineCategoryCode 
} from './equipmentUtils';

/**
 * Finds the next available WBS code for a given parent
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
 * Validates P6 WBS structure
 * @param {Array} nodes - Array of WBS nodes
 * @returns {boolean} - True if valid P6 structure
 */
export const validateP6Structure = (nodes) => {
  const rootNodes = nodes.filter(n => n.parent_wbs_code === null);
  if (rootNodes.length !== 1) {
    console.warn(`P6 Warning: Expected 1 root node, found: ${rootNodes.length}`);
    return false;
  }

  const codeSet = new Set(nodes.map(n => n.wbs_code));
  for (const node of nodes) {
    if (node.parent_wbs_code !== null && !codeSet.has(node.parent_wbs_code)) {
      console.warn(`P6 Warning: Parent WBS code ${node.parent_wbs_code} not found for node ${node.wbs_code}`);
      return false;
    }
  }

  // Check hierarchical structure
  for (const node of nodes) {
    if (node.parent_wbs_code !== null) {
      const parentNode = nodes.find(n => n.wbs_code === node.parent_wbs_code);
      if (!parentNode) {
        console.warn(`P6 Warning: Parent node ${node.parent_wbs_code} not found for ${node.wbs_code}`);
        return false;
      }
    }
  }

  return true;
};

/**
 * Generates modern WBS structure for a subsystem
 * @param {Array} nodes - Array to add nodes to
 * @param {string} subsystemId - Subsystem WBS ID
 * @param {string} subsystem - Subsystem name
 * @param {Array} data - Equipment data
 * @returns {void}
 */
export const generateModernStructure = (nodes, subsystemId, subsystem, data) => {
  let categoryCounter = 1;
  
  orderedCategoryKeys.forEach(number => {
    const name = categoryMapping[number];
    const categoryId = `${subsystemId}.${categoryCounter}`;
    nodes.push({
      wbs_code: categoryId,
      parent_wbs_code: subsystemId,
      wbs_name: `${number} | ${name}`
    });

    // Handle category 01 - always add standard items
    if (number === '01') {
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

    // Get equipment patterns for this category
    const categoryEquipmentPatterns = equipmentPatterns[number] || [];

    if (categoryEquipmentPatterns.length > 0) {
      const subsystemEquipment = data.filter(item => 
        item.subsystem === subsystem && 
        item.commissioning === 'Y' && 
        categoryEquipmentPatterns.some(pattern => {
          const equipmentUpper = item.equipmentNumber.toUpperCase();
          const patternUpper = pattern.toUpperCase();
          
          if (number === '07') {
            // Special handling for earthing equipment
            if (pattern === 'E' && equipmentUpper.startsWith('E') && 
                !equipmentUpper.startsWith('+') && !equipmentUpper.startsWith('EB') && 
                !equipmentUpper.startsWith('EEP') && !equipmentUpper.startsWith('ESS')) {
              const charAfterE = equipmentUpper.charAt(1);
              return charAfterE >= '0' && charAfterE <= '9';
            }
            if (pattern === 'EB' && equipmentUpper.startsWith('EB')) {
              const charAfterEB = equipmentUpper.charAt(2);
              return charAfterEB >= '0' && charAfterEB <= '9';
            }
            if (pattern === 'EEP' && equipmentUpper.startsWith('EEP')) {
              const charAfterEEP = equipmentUpper.charAt(3);
              return charAfterEEP >= '0' && charAfterEEP <= '9';
            }
            if (pattern === 'MEB') {
              return equipmentUpper.startsWith('MEB');
            }
            return false;
          }
          
          if (pattern.startsWith('+')) {
            return equipmentUpper.startsWith(patternUpper);
          }
          else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS') {
            return equipmentUpper.startsWith(patternUpper) && 
                   !equipmentUpper.startsWith('+');
          }
          else {
            return equipmentUpper.includes(patternUpper) || 
                   (item.plu && item.plu.toUpperCase().includes(patternUpper));
          }
        })
      );

      // Handle category 99 - unrecognised equipment
      if (number === '99') {
        const unrecognisedEquipment = data.filter(item => 
          item.subsystem === subsystem && 
          item.commissioning === 'Y' && 
          !allOtherPatterns.some(pattern => {
            const equipmentUpper = item.equipmentNumber.toUpperCase();
            const patternUpper = pattern.toUpperCase();
            
            if (pattern === 'E' && equipmentUpper.startsWith('E') && 
                !equipmentUpper.startsWith('+') && !equipmentUpper.startsWith('EB') && 
                !equipmentUpper.startsWith('EEP') && !equipmentUpper.startsWith('ESS')) {
              const charAfterE = equipmentUpper.charAt(1);
              return charAfterE >= '0' && charAfterE <= '9';
            }
            if (pattern === 'EB' && equipmentUpper.startsWith('EB')) {
              const charAfterEB = equipmentUpper.charAt(2);
              return charAfterEB >= '0' && charAfterEB <= '9';
            }
            if (pattern === 'EEP' && equipmentUpper.startsWith('EEP')) {
              const charAfterEEP = equipmentUpper.charAt(3);
              return charAfterEEP >= '0' && charAfterEEP <= '9';
            }
            
            if (pattern.startsWith('+')) {
              return equipmentUpper.startsWith(patternUpper);
            }
            else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS') {
              return equipmentUpper.startsWith(patternUpper) && 
                     !equipmentUpper.startsWith('+');
            }
            else {
              return equipmentUpper.includes(patternUpper) || 
                     (item.plu && item.plu.toUpperCase().includes(patternUpper));
            }
          })
        );

        subsystemEquipment.push(...unrecognisedEquipment);
      }

      // Filter out equipment that has parents in the same category
      const parentEquipment = subsystemEquipment.filter(item => {
        const hasParentInCategory = subsystemEquipment.some(potentialParent => 
          potentialParent.equipmentNumber === item.parentEquipmentNumber
        );
        return !hasParentInCategory;
      });

      // Add equipment to WBS
      let equipmentCounter = 1;
      parentEquipment.forEach(item => {
        const equipmentId = `${categoryId}.${equipmentCounter}`;
        nodes.push({
          wbs_code: equipmentId,
          parent_wbs_code: categoryId,
          wbs_name: `${item.equipmentNumber} | ${item.description}`
        });

        // Recursively add child equipment
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
            
            addChildrenRecursively(child.equipmentNumber, childId);
            childCounter++;
          });
        };

        addChildrenRecursively(item.equipmentNumber, equipmentId);
        equipmentCounter++;
      });
    }

    // Handle category 09 - always add Phase 1 and Phase 2
    if (number === '09') {
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
};

/**
 * Generates complete WBS structure for new project
 * @param {Array} equipmentData - Array of equipment objects
 * @param {string} projectName - Project name
 * @param {Object} projectState - Existing project state (optional)
 * @returns {Object} - Object with allNodes, newNodes, and newProjectState
 */
export const generateNewProjectWBS = (equipmentData, projectName, projectState = null) => {
  const allNodes = [];
  const newNodes = [];
  let subsystemCounter = projectState?.lastWbsCode ? projectState.lastWbsCode : 3;
  let tbcCounter = 1;

  const existingSubsystemCount = projectState?.subsystems?.length || 0;

  // Create root project node
  const projectId = "1";
  allNodes.push({
    wbs_code: projectId,
    parent_wbs_code: null,
    wbs_name: projectName
  });

  // Create Milestones node
  const milestonesId = "1.1";
  allNodes.push({
    wbs_code: milestonesId,
    parent_wbs_code: projectId,
    wbs_name: "M | Milestones"
  });

  // Create Pre-requisites node
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

  // Process subsystems
  const rawSubsystems = [...new Set(equipmentData.filter(item => item.commissioning === 'Y').map(item => item.subsystem))];
  
  // Sort subsystems by Z-code with Substation always last
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
  
  // Add subsystems to WBS
  subsystems.forEach((subsystem, index) => {
    const formattedSubsystemName = formatSubsystemName(subsystem);
    const subsystemId = `1.${subsystemCounter}`;
    const subsystemLabel = `S${existingSubsystemCount + index + 1} | ${formattedSubsystemName}`;
    
    const subsystemNode = {
      wbs_code: subsystemId,
      parent_wbs_code: "1",
      wbs_name: subsystemLabel,
      isNew: projectState ? true : false
    };
    
    allNodes.push(subsystemNode);
    if (projectState) {
      newNodes.push({
        wbs_code: subsystemId,
        parent_wbs_code: "1",
        wbs_name: subsystemLabel
      });
    }

    // Add to prerequisites
    const prerequisiteId = `1.2.${existingSubsystemCount + index + 1}`;
    const prerequisiteNode = {
      wbs_code: prerequisiteId,
      parent_wbs_code: "1.2",
      wbs_name: formattedSubsystemName,
      isNew: projectState ? true : false
    };
    
    allNodes.push(prerequisiteNode);
    if (projectState) {
      newNodes.push({
        wbs_code: prerequisiteId,
        parent_wbs_code: "1.2",
        wbs_name: formattedSubsystemName
      });
    }

    // Generate subsystem structure
    const subsystemStructure = [];
    generateModernStructure(subsystemStructure, subsystemId, subsystem, equipmentData);
    
    subsystemStructure.forEach(node => {
      allNodes.push({
        ...node,
        isNew: projectState ? true : false
      });
      if (projectState) {
        newNodes.push(node);
      }
    });
    
    subsystemCounter++;
  });

  // Handle TBC equipment
  const tbcEquipment = equipmentData.filter(item => item.commissioning === 'TBC');
  if (tbcEquipment.length > 0) {
    const tbcId = `1.${subsystemCounter}`;
    const tbcNode = {
      wbs_code: tbcId,
      parent_wbs_code: "1",
      wbs_name: "TBC - Equipment To Be Confirmed",
      isNew: projectState ? true : false
    };
    
    allNodes.push(tbcNode);
    if (projectState) {
      newNodes.push({
        wbs_code: tbcId,
        parent_wbs_code: "1",
        wbs_name: "TBC - Equipment To Be Confirmed"
      });
    }

    tbcEquipment.forEach(item => {
      const tbcItemNode = {
        wbs_code: `${tbcId}.${tbcCounter}`,
        parent_wbs_code: tbcId,
        wbs_name: `${item.equipmentNumber} | ${item.description}`,
        isNew: projectState ? true : false
      };
      
      allNodes.push(tbcItemNode);
      if (projectState) {
        newNodes.push({
          wbs_code: `${tbcId}.${tbcCounter}`,
          parent_wbs_code: tbcId,
          wbs_name: `${item.equipmentNumber} | ${item.description}`
        });
      }
      tbcCounter++;
    });
  }

  // Validate P6 structure
  const isValidP6Structure = validateP6Structure(allNodes);
  if (!isValidP6Structure) {
    console.warn('WBS structure may have P6 import issues');
  }

  // Create new project state
  const newProjectState = {
    projectName,
    lastWbsCode: subsystemCounter,
    subsystems: [...(projectState?.subsystems || []), ...subsystems.map(formatSubsystemName)],
    wbsNodes: allNodes,
    timestamp: new Date().toISOString()
  };

  return {
    allNodes,
    newNodes: projectState ? newNodes : allNodes,
    newProjectState
  };
};

/**
 * Exports WBS data as CSV string
 * @param {Array} wbsNodes - Array of WBS nodes
 * @returns {string} - CSV string
 */
export const exportWBSAsCSV = (wbsNodes) => {
  const csvContent = [
    'wbs_code,parent_wbs_code,wbs_name',
    ...wbsNodes.map(node => 
      `"${node.wbs_code}","${node.parent_wbs_code || ''}","${node.wbs_name}"`
    )
  ].join('\n');

  return csvContent;
};

/**
 * Downloads CSV file
 * @param {string} csvContent - CSV content string
 * @param {string} filename - Filename for download
 * @returns {void}
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};
