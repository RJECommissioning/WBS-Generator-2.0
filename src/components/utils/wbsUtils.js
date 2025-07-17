import { categoryMapping, equipmentPatterns, standardWBSCategories } from './constants.js';
import { extractEquipmentFromWBS, compareEquipmentLists, findSubsystemMatch } from './equipmentUtils.js';

// FIXED: Parent-based equipment categorization
export const determineCategoryCode = (equipment, allEquipment) => {
  const equipmentNumber = equipment.equipmentNumber?.toUpperCase() || '';
  const plu = equipment.plu ? equipment.plu.toUpperCase() : '';
  
  // STEP 1: Check if this is a child component
  if (equipment.parentEquipmentNumber && equipment.parentEquipmentNumber.trim() !== '') {
    // Find the parent equipment
    const parentEquipment = allEquipment.find(item => 
      item.equipmentNumber === equipment.parentEquipmentNumber
    );
    
    if (parentEquipment) {
      // Categorize child based on parent's category
      const parentCategory = determineCategoryCodeForParent(parentEquipment);
      console.log(`🔗 Child "${equipmentNumber}" inherits category ${parentCategory} from parent "${parentEquipment.equipmentNumber}"`);
      return parentCategory;
    }
  }
  
  // STEP 2: This is a parent equipment - categorize normally
  return determineCategoryCodeForParent(equipment);
};

// Helper function to categorize parent equipment only
const determineCategoryCodeForParent = (equipment) => {
  const equipmentNumber = equipment.equipmentNumber?.toUpperCase() || '';
  const plu = equipment.plu ? equipment.plu.toUpperCase() : '';
  
  for (const [categoryCode, patterns] of Object.entries(equipmentPatterns)) {
    for (const pattern of patterns) {
      if (categoryCode === '07') {
        // Special handling for earthing category
        if (pattern === 'E' && equipmentNumber.startsWith('E') && 
            !equipmentNumber.startsWith('+') && !equipmentNumber.startsWith('EB') && 
            !equipmentNumber.startsWith('EEP') && !equipmentNumber.startsWith('ESS')) {
          const charAfterE = equipmentNumber.charAt(1);
          if (charAfterE >= '0' && charAfterE <= '9') return categoryCode;
        }
        if (pattern === 'EB' && equipmentNumber.startsWith('EB')) {
          const charAfterEB = equipmentNumber.charAt(2);
          if (charAfterEB >= '0' && charAfterEB <= '9') return categoryCode;
        }
        if (pattern === 'EEP' && equipmentNumber.startsWith('EEP')) {
          const charAfterEEP = equipmentNumber.charAt(3);
          if (charAfterEEP >= '0' && charAfterEEP <= '9') return categoryCode;
        }
        if (pattern === 'MEB' && equipmentNumber.startsWith('MEB')) {
          return categoryCode;
        }
      } else {
        // Standard pattern matching
        if (pattern.startsWith('+')) {
          if (equipmentNumber.startsWith(pattern)) return categoryCode;
        } else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS') {
          if (equipmentNumber.startsWith(pattern) && !equipmentNumber.startsWith('+')) return categoryCode;
        } else {
          if (equipmentNumber.includes(pattern) || plu.includes(pattern)) return categoryCode;
        }
      }
    }
  }
  
  return '99'; // Default to unrecognised
};

// FIXED: Enhanced categorization with parent-based logic
export const enhancedCategorizeEquipment = (equipment, allEquipment) => {
  const equipmentNumber = equipment.equipmentNumber || 'Unknown';
  const cleanedNumber = equipmentNumber.replace(/^[+-]/, '');
  
  console.log(`🔍 Categorizing equipment: "${equipmentNumber}" (cleaned: "${cleanedNumber}")`);
  
  // FIXED: Pass allEquipment to enable parent-based categorization
  const category = determineCategoryCode(equipment, allEquipment);
  
  if (category !== '99') {
    console.log(`   ✅ Matched pattern in category ${category} (${categoryMapping[category]})`);
  } else {
    console.log(`   ❓ No pattern matched, categorizing as '99' (Unrecognised)`);
  }
  
  return category;
};

// FIXED: Equipment processing function
export const processEquipmentByCategory = (subsystemEquipment, allEquipment) => {
  const categoryGroups = {};
  
  // Categorize all equipment
  subsystemEquipment.forEach(equipment => {
    const category = enhancedCategorizeEquipment(equipment, allEquipment);
    
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(equipment);
  });
  
  // Log summary
  const summary = Object.entries(categoryGroups)
    .map(([cat, items]) => `${cat}(${items.length})`)
    .join(', ');
  console.log(`   📊 Equipment categorized: ${summary}`);
  
  return categoryGroups;
};

// Format subsystem name helper
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

// Find next available WBS code
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

// FIXED: Modern structure generation with parent-based categorization
export const generateModernStructure = (nodes, subsystemId, subsystem, data, allEquipment) => {
  let categoryCounter = 1;
  
  const orderedCategoryKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];
  
  console.log(`🏗️ Generating structure for subsystem: ${subsystem}`);
  
  orderedCategoryKeys.forEach(number => {
    const name = categoryMapping[number];
    const categoryId = `${subsystemId}.${categoryCounter}`;
    
    // Add category node
    nodes.push({
      wbs_code: categoryId,
      parent_wbs_code: subsystemId,
      wbs_name: `${number} | ${name}`
    });

    // Add preparation items for category 01
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

    // Add interface testing phases for category 09
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

    // Process equipment for this category
    const subsystemEquipment = data.filter(item => 
      item.subsystem === subsystem && 
      item.commissioning === 'Y'
    );

    // FIXED: Use processEquipmentByCategory with allEquipment
    const categoryGroups = processEquipmentByCategory(subsystemEquipment, allEquipment);
    
    if (categoryGroups[number]) {
      console.log(`   ⚙️  Processing ${categoryGroups[number].length} equipment items for category ${number}`);
      
      // Find parent equipment (equipment without parents in the same category)
      const parentEquipment = categoryGroups[number].filter(item => {
        const hasParentInCategory = categoryGroups[number].some(potentialParent => 
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

        // Add children recursively
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

    categoryCounter++;
  });
  
  console.log(`✅ Generated ${nodes.length} nodes for subsystem: ${subsystem}`);
};

// Main WBS generation function
export const generateWBS = (data, projectName, uploadMode, projectState) => {
  console.log(`🚀 Starting WBS generation for project: ${projectName}`);
  console.log(`   Mode: ${uploadMode}`);
  console.log(`   Equipment items: ${data.length}`);
  
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

  // Add milestones and prerequisites
  const milestonesId = "1.1";
  allNodes.push({
    wbs_code: milestonesId,
    parent_wbs_code: projectId,
    wbs_name: "M | Milestones"
  });

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

  // Get unique subsystems from commissioned equipment
  const rawSubsystems = [...new Set(data.filter(item => item.commissioning === 'Y').map(item => item.subsystem))];
  
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
  
  console.log(`📋 Processing ${subsystems.length} subsystems`);
  
  // Process each subsystem
  subsystems.forEach((subsystem, index) => {
    console.log(`\n🔧 Processing subsystem ${index + 1}/${subsystems.length}: ${subsystem}`);
    
    const formattedSubsystemName = formatSubsystemName(subsystem);
    const subsystemId = `1.${subsystemCounter}`;
    const subsystemLabel = `S${existingSubsystemCount + index + 1} | ${formattedSubsystemName}`;
    
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

    // Generate subsystem structure
    const subsystemStructure = [];
    generateModernStructure(subsystemStructure, subsystemId, subsystem, data, data);
    
    subsystemStructure.forEach(node => {
      allNodes.push({
        ...node,
        ...(uploadMode === 'continue' && { isNew: true })
      });
      newNodes.push(node);
    });
    
    subsystemCounter++;
  });

  // Handle TBC equipment
  const tbcEquipment = data.filter(item => item.commissioning === 'TBC');
  if (tbcEquipment.length > 0) {
    console.log(`\n⏳ Processing ${tbcEquipment.length} TBC equipment items`);
    
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

  // Create new project state
  const newProjectState = {
    projectName,
    lastWbsCode: subsystemCounter,
    subsystems: [...(projectState?.subsystems || []), ...subsystems.map(formatSubsystemName)],
    wbsNodes: allNodes,
    timestamp: new Date().toISOString()
  };
  
  console.log(`✅ WBS generation complete:`);
  console.log(`   Total nodes: ${allNodes.length}`);
  console.log(`   New nodes: ${newNodes.length}`);
  console.log(`   Subsystems: ${subsystems.length}`);
  console.log(`   TBC equipment: ${tbcEquipment.length}`);
  
  return {
    allNodes,
    newNodes: uploadMode === 'new' ? allNodes : newNodes,
    newProjectState
  };
};

// NEW: Missing Equipment WBS Generation Function
export const generateMissingEquipmentWBS = async (newEquipmentList, existingWbsNodes, existingProjectName) => {
  console.log("🔧 DEBUG: Missing Equipment WBS Generation Started");
  console.log(`📦 New equipment list received: ${newEquipmentList.length} items`);
  console.log(`🏗️ Existing WBS nodes: ${existingWbsNodes.length} nodes`);

  // STEP 1: Extract equipment from existing WBS structure
  const { equipmentNumbers: existingEquipmentNumbers, existingSubsystems } = extractEquipmentFromWBS(existingWbsNodes);
  
  console.log(`🔢 Extracted equipment numbers from WBS: ${existingEquipmentNumbers.length}`);
  console.log(`📍 Found existing subsystems: ${existingSubsystems.size}`);
  
  // STEP 2: Filter to only relevant equipment (commissioned or TBC)
  const relevantEquipment = newEquipmentList.filter(item => 
    item.commissioning === 'Y' || item.commissioning === 'TBC'
  );
  
  console.log(`✅ Relevant equipment (Y/TBC): ${relevantEquipment.length} items`);
  
  // STEP 3: Compare equipment lists
  const analysis = compareEquipmentLists(existingEquipmentNumbers, relevantEquipment);
  
  console.log(`🔍 Analysis complete:`);
  console.log(`   - New equipment: ${analysis.newEquipment.length}`);
  console.log(`   - Existing equipment: ${analysis.existingEquipment.length}`);
  console.log(`   - Removed equipment: ${analysis.removedEquipment.length}`);
  
  if (analysis.newEquipment.length === 0) {
    console.log("✅ No new equipment found - returning empty result");
    return {
      newWbsNodes: [],
      completeVisualization: existingWbsNodes.map(node => ({ ...node, isExisting: true })),
      analysis: analysis
    };
  }

  // STEP 4: Generate WBS nodes for missing equipment
  const allNodes = [];
  const newNodes = [];
  
  // Add all existing nodes to visualization
  existingWbsNodes.forEach(node => {
    allNodes.push({
      ...node,
      isExisting: true
    });
  });
  
  // STEP 5: Process missing commissioned equipment
  const missingCommissioned = analysis.newEquipment.filter(item => item.commissioning === 'Y');
  
  console.log(`✅ Processing ${missingCommissioned.length} missing commissioned items`);
  
  // Group by subsystem
  const subsystemGroups = {};
  missingCommissioned.forEach(item => {
    if (!subsystemGroups[item.subsystem]) {
      subsystemGroups[item.subsystem] = [];
    }
    subsystemGroups[item.subsystem].push(item);
  });
  
  // Process each subsystem
  Object.entries(subsystemGroups).forEach(([subsystem, equipment]) => {
    console.log(`🔧 Processing subsystem: ${subsystem} (${equipment.length} items)`);
    
    const subsystemWbsCode = findSubsystemMatch(subsystem, existingSubsystems);
    
    if (subsystemWbsCode) {
      console.log(`   Found subsystem match: ${subsystemWbsCode}`);
      
      // Find or create category 99 (Unrecognised Equipment) within subsystem
      let targetCategory = allNodes.find(n => 
        n.parent_wbs_code === subsystemWbsCode && 
        n.wbs_name.includes('99 | Unrecognised Equipment')
      );
      
      if (!targetCategory) {
        // Create category 99 if it doesn't exist
        const categoryId = findNextWBSCode(subsystemWbsCode, allNodes);
        targetCategory = {
          wbs_code: categoryId,
          parent_wbs_code: subsystemWbsCode,
          wbs_name: '99 | Unrecognised Equipment',
          isNew: true
        };
        allNodes.push(targetCategory);
        newNodes.push(targetCategory);
        console.log(`   Created category 99: ${categoryId}`);
      }
      
      // Add equipment to category
      equipment.forEach(item => {
        const equipmentId = findNextWBSCode(targetCategory.wbs_code, allNodes);
        const equipmentNode = {
          wbs_code: equipmentId,
          parent_wbs_code: targetCategory.wbs_code,
          wbs_name: `${item.equipmentNumber} | ${item.description}`,
          isNew: true
        };
        
        allNodes.push(equipmentNode);
        newNodes.push(equipmentNode);
        
        console.log(`   Added equipment: ${item.equipmentNumber} -> ${equipmentId}`);
        
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
          
          allNodes.push(childNode);
          newNodes.push(childNode);
          childCounter++;
        });
      });
    } else {
      console.log(`   ⚠️ No subsystem match found for: ${subsystem}`);
    }
  });
  
  // STEP 6: Handle new TBC equipment
  const missingTBC = analysis.newEquipment.filter(item => item.commissioning === 'TBC');
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
  console.log("✅ Missing equipment WBS generation complete");
  
  return {
    newWbsNodes: newNodes,
    completeVisualization: allNodes,
    analysis: analysis
  };
};
