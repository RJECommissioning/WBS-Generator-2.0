// src/components/utils/wbsUtils.js - FINAL FIX for TBC and Missing Equipment Issues

export const categoryMapping = {
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

// FIXED: Enhanced equipment categorization with proper TBC handling
export const determineCategoryCode = (equipment, allEquipment) => {
  // CRITICAL FIX: Check commissioning status FIRST
  if (equipment.commissioning === 'TBC') {
    console.log(`⏳ Equipment ${equipment.equipmentNumber} is TBC - will be placed in TBC section`);
    return 'TBC'; // Special return value for TBC equipment
  }

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
  
  const categoryPatterns = {
    '02': ['+UH', 'UH'], // Protection Panels
    '03': ['+WA', 'WA'], // HV Switchboards
    '04': ['+WC', 'WC'], // LV Switchboards
    '05': ['T', 'NET', 'TA', 'NER'], // Transformers - FIXED: T should be here
    '06': ['+GB', 'GB', 'BAN'], // Battery Systems
    '07': ['E', 'EB', 'EEP', 'MEB'], // Earthing
    '08': ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS', 'ESC'], // Building Services - FIXED: Added ESC
    '10': ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K', 'SOLB'] // Ancillary Systems - FIXED: Added SOLB
  };
  
  for (const [categoryCode, patterns] of Object.entries(categoryPatterns)) {
    for (const pattern of patterns) {
      if (categoryCode === '05') {
        // ENHANCED: Transformer matching with debugging
        if (pattern === 'T' && equipmentNumber.match(/^T\d+/)) {
          console.log(`🔌 Equipment ${equipmentNumber} matches Transformer pattern T + numbers`);
          return categoryCode;
        }
        if (pattern === 'NET' && equipmentNumber.startsWith('NET')) {
          console.log(`🔌 Equipment ${equipmentNumber} matches NET pattern`);
          return categoryCode;
        }
        if (pattern === 'TA' && equipmentNumber.startsWith('TA')) {
          console.log(`🔌 Equipment ${equipmentNumber} matches TA pattern`);
          return categoryCode;
        }
        if (pattern === 'NER' && equipmentNumber.startsWith('NER')) {
          console.log(`🔌 Equipment ${equipmentNumber} matches NER pattern`);
          return categoryCode;
        }
      } else if (categoryCode === '07') {
        // Special handling for earthing category
        if (pattern === 'E' && equipmentNumber.startsWith('E') && 
            !equipmentNumber.startsWith('+') && !equipmentNumber.startsWith('EB') && 
            !equipmentNumber.startsWith('EEP') && !equipmentNumber.startsWith('ESS') && 
            !equipmentNumber.startsWith('ESC')) {
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
      } else if (categoryCode === '08') {
        // FIXED: Enhanced Building Services matching
        if (pattern === 'ESC' && equipmentNumber.includes('ESC')) {
          console.log(`🏢 Equipment ${equipmentNumber} matches Building Services pattern ESC`);
          return categoryCode;
        }
        if (pattern.startsWith('+')) {
          if (equipmentNumber.startsWith(pattern)) return categoryCode;
        } else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS' && pattern !== 'ESC') {
          if (equipmentNumber.startsWith(pattern) && !equipmentNumber.startsWith('+')) return categoryCode;
        } else {
          if (equipmentNumber.includes(pattern) || plu.includes(pattern)) return categoryCode;
        }
      } else if (categoryCode === '10') {
        // FIXED: Enhanced Ancillary Systems matching
        if (pattern === 'SOLB' && equipmentNumber.includes('SOLB')) {
          console.log(`⚡ Equipment ${equipmentNumber} matches Ancillary Systems pattern SOLB`);
          return categoryCode;
        }
        if (pattern.startsWith('+')) {
          if (equipmentNumber.startsWith(pattern)) return categoryCode;
        } else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS' && pattern !== 'SOLB') {
          if (equipmentNumber.startsWith(pattern) && !equipmentNumber.startsWith('+')) return categoryCode;
        } else {
          if (equipmentNumber.includes(pattern) || plu.includes(pattern)) return categoryCode;
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
  
  console.log(`❓ Equipment ${equipmentNumber} - no pattern matched, categorizing as '99'`);
  return '99'; // Default to unrecognised
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

// FIXED: Enhanced equipment extraction from WBS nodes with better pattern matching
export const extractEquipmentNumbers = (wbsNodes) => {
  console.log('🔧 ENHANCED: Equipment Extraction Process');
  console.log('==========================================');
  
  const equipmentNumbers = [];
  const existingSubsystems = new Map();
  let processedCount = 0;
  let skippedCount = 0;
  
  // Standard WBS categories to skip
  const standardCategories = [
    'Preparations and set-up', 'Protection Panels', 'HV Switchboards', 
    'LV Switchboards', 'Transformers', 'Battery Systems', 'Earthing', 
    'Building Services', 'Interface Testing', 'Ancillary Systems', 
    'Unrecognised Equipment', 'Milestones', 'Pre-requisites', 
    'Phase 1', 'Phase 2', 'Test bay', 'Panel Shop', 'Pad'
  ];
  
  // Pattern to identify WBS structure elements vs equipment
  const wbsStructurePatterns = [
    /^\d{2}\s*\|\s*/, // 01 | Preparations, 02 | Protection, etc.
    /^M\s*\|\s*/, // M | Milestones
    /^P\s*\|\s*/, // P | Pre-requisites
    /^S\d+\s*\|\s*/, // S1 | Subsystem, S2 | Subsystem, etc.
    /^TBC\s*-\s*/, // TBC - Equipment To Be Confirmed
    /^\d{4}.*/ // Project codes like 5737
  ];
  
  // ENHANCED: Better equipment patterns including all T transformer patterns
  const equipmentPatterns = [
    /^[A-Z]+\d+/, // T11, T21, HN10, etc.
    /^[+-][A-Z]+\d+/, // +UH101, -F102, +WA10, etc.
    /^[A-Z]+\d+-[A-Z0-9-]+/, // EG01-1000-01, etc.
    /^[A-Z]+\d+\/[A-Z]/, // -F01/X, etc.
    /^-[A-Z]+.*/, // -ESC-1.1, etc.
    /^[A-Z]+.*-\d+/, // SOLB-1.1-01, etc.
    /^T\d+.*/, // T3800-1, T3800-2, etc.
    /^T1[0-9]$/, // T10, T11, T12, etc. (single/double digit transformers)
    /^T2[0-9]$/ // T20, T21, T22, etc. (single/double digit transformers)
  ];
  
  wbsNodes.forEach(node => {
    const wbsName = node.wbs_name;
    
    // Build subsystem mapping first
    if (wbsName.startsWith('S') && wbsName.includes('|')) {
      const subsystemName = wbsName.split('|')[1]?.trim();
      if (subsystemName) {
        existingSubsystems.set(subsystemName, node.wbs_code);
        // Add variations for better matching
        const cleanName = subsystemName.replace(/^\+/, '').trim();
        existingSubsystems.set(cleanName, node.wbs_code);
        existingSubsystems.set(`+${cleanName}`, node.wbs_code);
      }
    }
    
    // Skip standard WBS categories
    if (standardCategories.some(category => wbsName.includes(category))) {
      skippedCount++;
      if (skippedCount <= 5) {
        console.log(`   🚫 Skipped WBS category: "${wbsName}"`);
      }
      return;
    }
    
    // Skip WBS structure patterns
    if (wbsStructurePatterns.some(pattern => pattern.test(wbsName))) {
      skippedCount++;
      if (skippedCount <= 5) {
        console.log(`   🚫 Skipped WBS structure: "${wbsName}"`);
      }
      return;
    }
    
    // Extract equipment number from WBS name (format: "EQUIPMENT | Description" or "EQUIPMENT - Description")
    if (wbsName.includes(' | ') || wbsName.includes(' - ')) {
      const separator = wbsName.includes(' | ') ? ' | ' : ' - ';
      const equipmentNumber = wbsName.split(separator)[0]?.trim();
      
      if (equipmentNumber && equipmentPatterns.some(pattern => pattern.test(equipmentNumber))) {
        equipmentNumbers.push(equipmentNumber);
        processedCount++;
        if (processedCount <= 15 || equipmentNumber === 'T11' || equipmentNumber === 'T21') {
          console.log(`   ✅ Extracted equipment: "${equipmentNumber}" from "${wbsName}"`);
        }
      } else {
        skippedCount++;
        if (skippedCount <= 5 || equipmentNumber === 'T11' || equipmentNumber === 'T21') {
          console.log(`   🚫 Invalid equipment: "${equipmentNumber}" from "${wbsName}"`);
        }
      }
    }
  });
  
  const uniqueEquipment = [...new Set(equipmentNumbers)];
  
  console.log(`\n📊 ENHANCED Extraction Summary:`);
  console.log(`   Total WBS nodes processed: ${wbsNodes.length}`);
  console.log(`   Equipment extracted: ${uniqueEquipment.length}`);
  console.log(`   WBS structure elements skipped: ${skippedCount}`);
  console.log(`   Duplicate equipment removed: ${equipmentNumbers.length - uniqueEquipment.length}`);
  console.log(`   Subsystems found: ${existingSubsystems.size}`);
  
  return { equipmentNumbers: uniqueEquipment, existingSubsystems };
};

// FIXED: Find next available WBS code
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

// FIXED: Modern structure generation with proper TBC handling
export const generateModernStructure = (nodes, subsystemId, subsystem, data) => {
  let categoryCounter = 1;
  
  const orderedCategoryKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];
  
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
      item.commissioning === 'Y' // FIXED: Only process commissioned equipment here
    );

    // FIXED: Use parent-based categorization - categorize equipment within THIS category
    const categoryEquipment = subsystemEquipment.filter(item => {
      const category = determineCategoryCode(item, data);
      return category === number;
    });
    
    if (categoryEquipment.length > 0) {
      console.log(`   ⚙️  Processing ${categoryEquipment.length} equipment items for category ${number}`);
      
      // Find parent equipment (equipment without parents in the same category)
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
};

// Helper function to validate equipment numbers
const isValidEquipmentNumber = (equipmentNumber) => {
  if (!equipmentNumber || equipmentNumber.length < 2) return false;
  
  // Exclude invalid patterns
  const invalidPatterns = [
    'EXAMPLE', 'Lot ', 'COMBI-', 'FREE ISSUE', 'Wall Internal', 
    '(Copy)', 'Test bay', 'Panel Shop', 'Pad', 'Phase 1', 'Phase 2',
    'Preparations and set-up', 'Protection Panels', 'HV Switchboards',
    'LV Switchboards', 'Transformers', 'Battery Systems', 'Earthing',
    'Building Services', 'Interface Testing', 'Ancillary Systems',
    'Unrecognised Equipment', 'Milestones', 'Pre-requisites'
  ];
  
  return !invalidPatterns.some(pattern => equipmentNumber.includes(pattern));
};

// FIXED: Compare equipment lists for missing equipment functionality
const compareEquipmentLists = (existingEquipment, newEquipmentList) => {
  const existingSet = new Set(existingEquipment);
  const newSet = new Set(newEquipmentList.map(item => item.equipmentNumber));
  
  console.log("🔍 ENHANCED Equipment Comparison Analysis");
  console.log("==========================================");
  console.log(`📋 Existing equipment count: ${existingEquipment.length}`);
  console.log(`📦 New equipment list count: ${newEquipmentList.length}`);
  console.log(`🔢 Unique new equipment numbers: ${newSet.size}`);
  
  // Enhanced debugging
  console.log("\n🔍 Sample existing equipment:");
  existingEquipment.slice(0, 10).forEach(num => console.log(`   ${num}`));
  
  console.log("\n📦 Sample new equipment:");
  newEquipmentList.slice(0, 10).forEach(item => console.log(`   ${item.equipmentNumber} (${item.commissioning})`));
  
  const newEquipment = newEquipmentList.filter(item => !existingSet.has(item.equipmentNumber));
  const existingEquipmentInNew = newEquipmentList.filter(item => existingSet.has(item.equipmentNumber));
  const removedEquipment = existingEquipment.filter(equipNum => !newSet.has(equipNum));
  
  console.log(`\n📊 Results:`);
  console.log(`🆕 New equipment found: ${newEquipment.length}`);
  console.log(`✅ Existing equipment in new list: ${existingEquipmentInNew.length}`);
  console.log(`❌ Removed equipment: ${removedEquipment.length}`);
  
  if (newEquipment.length > 0) {
    console.log(`\n🔍 First 10 'new' equipment items:`);
    newEquipment.slice(0, 10).forEach(item => {
      console.log(`   ${item.equipmentNumber} - ${item.description} (${item.commissioning})`);
    });
  }
  
  return {
    newEquipment,
    existingEquipment: existingEquipmentInNew,
    removedEquipment
  };
};

// FIXED: Complete rewrite of generateMissingEquipmentWBS function
export const generateMissingEquipmentWBS = (newEquipmentList, existingWbsNodes, existingProjectName) => {
  console.log("🔧 ENHANCED: Missing Equipment WBS Generation Started");
  console.log("=================================================");
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
  
  // STEP 3: Find genuinely missing equipment
  const existingEquipmentSet = new Set(existingEquipmentNumbers);
  const missingEquipment = commissionedEquipment.filter(item => {
    const equipmentNumber = item.equipmentNumber?.trim();
    const exists = existingEquipmentSet.has(equipmentNumber);
    
    // Enhanced debugging for T11 and T21
    if (equipmentNumber === 'T11' || equipmentNumber === 'T21') {
      console.log(`🔍 DEBUG ${equipmentNumber}:`);
      console.log(`   Equipment Number: "${equipmentNumber}"`);
      console.log(`   Exists in extracted list: ${exists}`);
      console.log(`   Commissioning: ${item.commissioning}`);
      console.log(`   Subsystem: ${item.subsystem}`);
    }
    
    return !exists; // Return true if equipment is missing
  });
  
  const analysis = compareEquipmentLists(existingEquipmentNumbers, commissionedEquipment);
  
  console.log(`\n🎯 FINAL ANALYSIS:`);
  console.log(`   - Existing equipment: ${existingEquipmentNumbers.length}`);
  console.log(`   - Valid new equipment: ${commissionedEquipment.length}`);
  console.log(`   - Missing equipment: ${missingEquipment.length}`);
  
  if (missingEquipment.length === 0) {
    console.log("✅ SUCCESS: No missing equipment found - all commissioned/TBC equipment exists in WBS structure");
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
  
  // Add all existing nodes to visualization
  existingWbsNodes.forEach(node => {
    allNodes.push({
      ...node,
      isExisting: true
    });
  });
  
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
    // Find subsystem match
    let subsystemWbsCode = null;
    for (const [subsystemName, wbsCode] of existingSubsystems) {
      if (subsystemName.includes(item.subsystem) || item.subsystem.includes(subsystemName)) {
        subsystemWbsCode = wbsCode;
        break;
      }
    }
    
    if (subsystemWbsCode) {
      // Determine category for this equipment
      const category = determineCategoryCode(item, missingEquipment);
      
      if (category === 'TBC') {
        // This should not happen for commissioned equipment, but handle it
        console.log(`⚠️ Commissioned equipment ${item.equipmentNumber} returned TBC category - treating as 99`);
        category = '99';
      }
      
      // Find or create the appropriate category within subsystem
      let targetCategory = allNodes.find(n => 
        n.parent_wbs_code === subsystemWbsCode && 
        n.wbs_name.includes(`${category} |`)
      );
      
      if (!targetCategory) {
        // Create category if it doesn't exist
        const categoryId = `${subsystemWbsCode}.${newNodeCounter++}`;
        const categoryName = categoryMapping[category] || 'Unknown Category';
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
  
  console.log(`\n🎯 Final results:`);
  console.log(`   New WBS nodes created: ${newNodes.length}`);
  console.log(`   Complete visualization nodes: ${allNodes.length}`);
  console.log("✅ Missing equipment WBS generation complete");
  
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

// FIXED: Main WBS generation function with proper TBC handling
export const generateWBS = (data, projectName, projectState, uploadMode) => {
  console.log(`🚀 ENHANCED WBS Generation - Mode: ${uploadMode}`);
  console.log(`📦 Equipment data: ${data.length} items`);
  
  const allNodes = [];
  const newNodes = [];
  let subsystemCounter = projectState?.lastWbsCode ? projectState.lastWbsCode : 3;
  let tbcCounter = 1;

  const existingSubsystemCount = projectState?.subsystems?.length || 0;

  // Add project root
  const projectId = "1";
  allNodes.push({
    wbs_code: projectId,
    parent_wbs_code: null,
    wbs_name: projectName
  });

  // Add milestones
  const milestonesId = "1.1";
  allNodes.push({
    wbs_code: milestonesId,
    parent_wbs_code: projectId,
    wbs_name: "M | Milestones"
  });

  // Add prerequisites
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

  // Process subsystems - ONLY for commissioned equipment
  const rawSubsystems = [...new Set(data.filter(item => item.commissioning === 'Y').map(item => item.subsystem))];
  
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
  
  console.log(`📂 Processing ${subsystems.length} subsystems`);
  
  subsystems.forEach((subsystem, index) => {
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

    // Add prerequisite
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
    generateModernStructure(subsystemStructure, subsystemId, subsystem, data);
    
    subsystemStructure.forEach(node => {
      allNodes.push({
        ...node,
        ...(uploadMode === 'continue' && { isNew: true })
      });
      newNodes.push(node);
    });
    
    subsystemCounter++;
  });

  // FIXED: Handle TBC equipment properly
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

  console.log(`✅ WBS Generation Complete:`);
  console.log(`   Total nodes: ${allNodes.length}`);
  console.log(`   New nodes: ${newNodes.length}`);
  console.log(`   Commissioned equipment: ${data.filter(item => item.commissioning === 'Y').length}`);
  console.log(`   TBC equipment: ${tbcEquipment.length}`);
  console.log(`   Excluded (N): ${data.filter(item => item.commissioning === 'N').length}`);

  return {
    allNodes,
    newNodes,
    projectState: {
      projectName,
      lastWbsCode: subsystemCounter,
      subsystems: [...(projectState?.subsystems || []), ...subsystems.map(formatSubsystemName)],
      wbsNodes: allNodes,
      timestamp: new Date().toISOString()
    }
  };
};
