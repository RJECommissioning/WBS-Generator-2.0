// src/components/utils/wbsUtils.js - Fixed equipment extraction logic

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

// FIXED: Simplified and more accurate equipment extraction
export const extractEquipmentNumbers = (wbsNodes) => {
  console.log('🔧 ENHANCED: Equipment Extraction Process');
  console.log('==========================================');
  
  const equipmentNumbers = [];
  const existingSubsystems = new Map();
  let processedCount = 0;
  let skippedCount = 0;
  
  // FIXED: Define patterns that should be IGNORED (structure elements)
  const structurePatterns = [
    /^\d{2}\s*\|\s*/, // 01 | Preparations, 02 | Protection, etc.
    /^M\s*\|\s*/, // M | Milestones
    /^P\s*\|\s*/, // P | Pre-requisites
    /^S\d+\s*\|\s*/, // S1 | Subsystem, S2 | Subsystem, etc.
    /^Test bay$/, /^Panel Shop$/, /^Pad$/, /^Phase 1$/, /^Phase 2$/,
    /^\d{4}.*/, // Project codes like 5737
    /^TBC\s*-\s*Equipment\s*To\s*Be\s*Confirmed$/ // TBC section header
  ];
  
  wbsNodes.forEach(node => {
    if (!node.wbs_name || !node.wbs_name.includes('|')) {
      // Skip nodes without pipe separator or no name
      return;
    }
    
    const parts = node.wbs_name.split('|');
    if (parts.length < 2) return;
    
    const firstPart = parts[0].trim();
    const secondPart = parts[1].trim();
    
    // FIXED: Check if this is a structure element that should be ignored
    const isStructureElement = structurePatterns.some(pattern => 
      pattern.test(firstPart) || pattern.test(node.wbs_name)
    );
    
    if (isStructureElement) {
      skippedCount++;
      if (skippedCount <= 5) {
        console.log(`   🚫 Ignored WBS structure: "${node.wbs_name}"`);
      }
      return;
    }
    
    // FIXED: Extract equipment number from the first part (before |)
    // This should match exactly how equipment was added during WBS generation
    const equipmentNumber = firstPart.trim();
    
    // FIXED: Validate that this looks like an equipment number
    if (isValidEquipmentNumber(equipmentNumber)) {
      equipmentNumbers.push(equipmentNumber);
      processedCount++;
      
      if (processedCount <= 15) {
        console.log(`   ✅ Extracted equipment: "${equipmentNumber}" from "${node.wbs_name}"`);
      }
    } else {
      skippedCount++;
      if (skippedCount <= 10) {
        console.log(`   🚫 Skipped: "${node.wbs_name}" (not valid equipment)`);
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
  
  // CRITICAL: Log specific equipment we're looking for
  console.log(`\n🔍 CRITICAL: Checking for key equipment:`);
  console.log(`   T11 found: ${uniqueEquipment.includes('T11') ? '✅ YES' : '❌ NO'}`);
  console.log(`   T21 found: ${uniqueEquipment.includes('T21') ? '✅ YES' : '❌ NO'}`);
  console.log(`   +WC02 found: ${uniqueEquipment.includes('+WC02') ? '✅ YES' : '❌ NO'}`);
  
  // Log sample of extracted equipment
  console.log(`\n📋 Sample extracted equipment:`);
  uniqueEquipment.slice(0, 20).forEach(eq => console.log(`   - ${eq}`));
  
  return { equipmentNumbers: uniqueEquipment, existingSubsystems };
};

// FIXED: Improved equipment number validation
export const isValidEquipmentNumber = (equipmentNumber) => {
  if (!equipmentNumber || typeof equipmentNumber !== 'string') return false;
  
  const trimmed = equipmentNumber.trim();
  if (trimmed.length < 2) return false;
  
  // FIXED: More comprehensive invalid patterns
  const invalidPatterns = [
    'EXAMPLE', 'Lot ', 'COMBI-', 'FREE ISSUE', 'Wall Internal', 
    '(Copy)', 'Test bay', 'Panel Shop', 'Pad', 'Phase 1', 'Phase 2',
    'Preparations and set-up', 'Protection Panels', 'HV Switchboards',
    'LV Switchboards', 'Transformers', 'Battery Systems', 'Earthing',
    'Building Services', 'Interface Testing', 'Ancillary Systems',
    'Unrecognised Equipment', 'Milestones', 'Pre-requisites',
    'Equipment To Be Confirmed', 'TBC -'
  ];
  
  // Check for invalid patterns
  const hasInvalidPattern = invalidPatterns.some(pattern => 
    trimmed.includes(pattern)
  );
  
  if (hasInvalidPattern) return false;
  
  // FIXED: Valid equipment patterns - must match at least one
  const validPatterns = [
    /^[A-Z]+\d+$/,           // T11, HN10, etc.
    /^[+-][A-Z]+\d+$/,       // +UH101, -F102, +WA10, etc.
    /^[A-Z]+\d+[-/][A-Z0-9-]+/, // EG01-1000-01, -F01/X, etc.
    /^[A-Z]+\d+\.\d+$/,      // SK01.1, SK02.2, etc.
    /^[A-Z]{2,}\d+$/         // Any 2+ letter prefix with numbers
  ];
  
  return validPatterns.some(pattern => pattern.test(trimmed));
};

// FIXED: Improved equipment comparison with better debugging
export const compareEquipmentLists = (existingEquipment, newEquipmentList) => {
  console.log("🔍 ENHANCED Equipment Comparison Analysis");
  console.log("==========================================");
  
  // FIXED: Normalize equipment numbers for comparison
  const normalizeEquipmentNumber = (equipNum) => {
    return equipNum ? equipNum.trim().toUpperCase() : '';
  };
  
  // Create normalized sets
  const existingSet = new Set(existingEquipment.map(normalizeEquipmentNumber));
  const newEquipmentMap = new Map();
  
  // FIXED: Filter and normalize new equipment
  const validNewEquipment = newEquipmentList.filter(item => {
    const isValid = item.equipmentNumber && 
                   isValidEquipmentNumber(item.equipmentNumber) &&
                   (item.commissioning === 'Y' || item.commissioning === 'TBC');
    
    if (isValid) {
      const normalized = normalizeEquipmentNumber(item.equipmentNumber);
      newEquipmentMap.set(normalized, item);
    }
    
    return isValid;
  });
  
  const newSet = new Set(Array.from(newEquipmentMap.keys()));
  
  console.log(`📋 Existing equipment count: ${existingEquipment.length}`);
  console.log(`📦 New equipment list count: ${newEquipmentList.length}`);
  console.log(`✅ Valid new equipment count: ${validNewEquipment.length}`);
  console.log(`🔢 Unique new equipment numbers: ${newSet.size}`);
  
  // FIXED: Enhanced debugging for specific equipment
  console.log("\n🔍 Key equipment check:");
  const keyEquipment = ['T11', 'T21', '+WC02', 'HN10', 'HN20'];
  keyEquipment.forEach(eq => {
    const normalizedEq = normalizeEquipmentNumber(eq);
    console.log(`   ${eq}: Existing=${existingSet.has(normalizedEq)}, New=${newSet.has(normalizedEq)}`);
  });
  
  // Find differences
  const newEquipment = validNewEquipment.filter(item => {
    const normalized = normalizeEquipmentNumber(item.equipmentNumber);
    return !existingSet.has(normalized);
  });
  
  const existingEquipmentInNew = validNewEquipment.filter(item => {
    const normalized = normalizeEquipmentNumber(item.equipmentNumber);
    return existingSet.has(normalized);
  });
  
  const removedEquipment = existingEquipment.filter(equipNum => {
    const normalized = normalizeEquipmentNumber(equipNum);
    return !newSet.has(normalized);
  });
  
  console.log(`\n📊 Results:`);
  console.log(`🆕 New equipment found: ${newEquipment.length}`);
  console.log(`✅ Existing equipment in new list: ${existingEquipmentInNew.length}`);
  console.log(`❌ Removed equipment: ${removedEquipment.length}`);
  
  if (removedEquipment.length > 0) {
    console.log(`\n❌ Removed equipment details:`);
    removedEquipment.forEach(eq => console.log(`   - ${eq}`));
  }
  
  if (newEquipment.length > 0) {
    console.log(`\n🔍 First 10 new equipment items:`);
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

// FIXED: Enhanced missing equipment WBS generation
export const generateMissingEquipmentWBS = (newEquipmentList, existingWbsNodes, existingProjectName) => {
  console.log("🔧 ENHANCED: Missing Equipment WBS Generation Started");
  console.log("=================================================");
  console.log(`📦 New equipment list received: ${newEquipmentList.length} items`);
  
  if (!existingWbsNodes || existingWbsNodes.length === 0) {
    console.log("❌ No existing WBS structure provided");
    throw new Error('No existing WBS structure provided');
  }

  console.log(`🏗️ Existing WBS nodes: ${existingWbsNodes.length} nodes`);

  // STEP 1: Extract existing equipment with improved logic
  const { equipmentNumbers: existingEquipmentNumbers, existingSubsystems } = extractEquipmentNumbers(existingWbsNodes);
  
  console.log(`🔢 Extracted equipment numbers from WBS: ${existingEquipmentNumbers.length}`);
  console.log(`📍 Found existing subsystems: ${existingSubsystems.size}`);
  
  // STEP 2: Compare equipment lists with improved logic
  const analysis = compareEquipmentLists(existingEquipmentNumbers, newEquipmentList);
  
  console.log(`\n🎯 FINAL ANALYSIS:`);
  console.log(`   - Existing equipment: ${existingEquipmentNumbers.length}`);
  console.log(`   - New equipment: ${analysis.newEquipment.length}`);
  console.log(`   - Removed equipment: ${analysis.removedEquipment.length}`);
  
  // STEP 3: Handle the case where no missing equipment is found
  if (analysis.newEquipment.length === 0 && analysis.removedEquipment.length === 0) {
    console.log("✅ SUCCESS: No missing equipment found - equipment lists match perfectly");
    return {
      allNodes: existingWbsNodes.map(node => ({ ...node, isExisting: true })),
      newNodes: [],
      analysis: {
        newEquipment: [],
        existingEquipment: analysis.existingEquipment,
        removedEquipment: []
      },
      projectName: existingProjectName
    };
  }
  
  if (analysis.newEquipment.length === 0) {
    console.log("✅ SUCCESS: No new equipment found - all equipment exists in WBS structure");
    return {
      allNodes: existingWbsNodes.map(node => ({ ...node, isExisting: true })),
      newNodes: [],
      analysis,
      projectName: existingProjectName
    };
  }

  // STEP 4: Process missing equipment (if any)
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
  const missingCommissioned = analysis.newEquipment.filter(item => item.commissioning === 'Y');
  const missingTBC = analysis.newEquipment.filter(item => item.commissioning === 'TBC');
  
  console.log(`✅ Missing commissioned equipment: ${missingCommissioned.length}`);
  console.log(`⏳ Missing TBC equipment: ${missingTBC.length}`);
  
  // Add missing equipment to appropriate subsystems
  let newNodeCounter = Math.max(...allNodes.map(n => {
    const parts = n.wbs_code.split('.');
    return parseInt(parts[parts.length - 1]) || 0;
  })) + 1;
  
  // Process missing commissioned equipment
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
      const category = determineCategoryCode(item, analysis.newEquipment);
      
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
    analysis,
    projectName: existingProjectName
  };
};

// ENHANCED: Equipment categorization with proper whitespace handling and TBC support
export const determineCategoryCode = (equipment, allEquipment) => {
  // CRITICAL: Check commissioning status FIRST
  if (equipment.commissioning === 'TBC') {
    console.log(`⏳ Equipment ${equipment.equipmentNumber} is TBC - will be placed in TBC section`);
    return 'TBC'; // Special return value for TBC equipment
  }

  // ENHANCED: Trim whitespace from equipment number
  const equipmentNumber = (equipment.equipmentNumber?.trim().toUpperCase()) || '';
  const plu = equipment.plu ? equipment.plu.trim().toUpperCase() : '';
  
  // STEP 1: Check if this is a child component
  if (equipment.parentEquipmentNumber && equipment.parentEquipmentNumber.trim() !== '') {
    // Find the parent equipment
    const parentEquipment = allEquipment.find(item => 
      item.equipmentNumber?.trim() === equipment.parentEquipmentNumber.trim()
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

// ENHANCED: Helper function with proper whitespace handling and enhanced pattern matching
const determineCategoryCodeForParent = (equipment) => {
  // ENHANCED: Trim whitespace from equipment number
  const equipmentNumber = (equipment.equipmentNumber?.trim().toUpperCase()) || '';
  const plu = equipment.plu ? equipment.plu.trim().toUpperCase() : '';
  
  console.log(`🔍 Pattern matching for: "${equipmentNumber}" (original: "${equipment.equipmentNumber}")`);
  
  const categoryPatterns = {
    '02': ['+UH', 'UH'], // Protection Panels
    '03': ['+WA', 'WA'], // HV Switchboards
    '04': ['+WC', 'WC'], // LV Switchboards
    '05': ['T', 'NET', 'TA', 'NER'], // Transformers
    '06': ['+GB', 'GB', 'BAN'], // Battery Systems
    '07': ['E', 'EB', 'EEP', 'MEB'], // Earthing
    '08': ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS', 'ESC'], // Building Services
    '10': ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K', 'SOLB'] // Ancillary Systems
  };
  
  for (const [categoryCode, patterns] of Object.entries(categoryPatterns)) {
    for (const pattern of patterns) {
      let matched = false;
      
      if (categoryCode === '05') {
        // ENHANCED: Enhanced Transformer matching with better debugging
        if (pattern === 'T') {
          // More precise T pattern matching
          if (equipmentNumber.match(/^T\d+$/)) {
            console.log(`🔌 Equipment ${equipmentNumber} matches Transformer pattern T + numbers (exact match)`);
            matched = true;
          }
        } else if (pattern === 'NET' && equipmentNumber.startsWith('NET')) {
          console.log(`🔌 Equipment ${equipmentNumber} matches NET pattern`);
          matched = true;
        } else if (pattern === 'TA' && equipmentNumber.startsWith('TA')) {
          console.log(`🔌 Equipment ${equipmentNumber} matches TA pattern`);
          matched = true;
        } else if (pattern === 'NER' && equipmentNumber.startsWith('NER')) {
          console.log(`🔌 Equipment ${equipmentNumber} matches NER pattern`);
          matched = true;
        }
      } else if (categoryCode === '07') {
        // Special handling for earthing category
        if (pattern === 'E' && equipmentNumber.startsWith('E') && 
            !equipmentNumber.startsWith('+') && !equipmentNumber.startsWith('EB') && 
            !equipmentNumber.startsWith('EEP') && !equipmentNumber.startsWith('ESS') && 
            !equipmentNumber.startsWith('ESC')) {
          const charAfterE = equipmentNumber.charAt(1);
          if (charAfterE >= '0' && charAfterE <= '9') {
            matched = true;
          }
        } else if (pattern === 'EB' && equipmentNumber.startsWith('EB')) {
          const charAfterEB = equipmentNumber.charAt(2);
          if (charAfterEB >= '0' && charAfterEB <= '9') {
            matched = true;
          }
        } else if (pattern === 'EEP' && equipmentNumber.startsWith('EEP')) {
          const charAfterEEP = equipmentNumber.charAt(3);
          if (charAfterEEP >= '0' && charAfterEEP <= '9') {
            matched = true;
          }
        } else if (pattern === 'MEB' && equipmentNumber.startsWith('MEB')) {
          matched = true;
        }
      } else {
        // ENHANCED: Enhanced standard pattern matching with better debugging
        if (pattern.startsWith('+')) {
          if (equipmentNumber.startsWith(pattern)) {
            console.log(`✅ Equipment ${equipmentNumber} matches + pattern: ${pattern}`);
            matched = true;
          }
        } else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS' && pattern !== 'ESC' && pattern !== 'SOLB') {
          if (equipmentNumber.startsWith(pattern) && !equipmentNumber.startsWith('+')) {
            console.log(`✅ Equipment ${equipmentNumber} matches short pattern: ${pattern}`);
            matched = true;
          }
        } else {
          if (equipmentNumber.includes(pattern) || plu.includes(pattern)) {
            console.log(`✅ Equipment ${equipmentNumber} matches long pattern: ${pattern}`);
            matched = true;
          }
        }
      }
      
      if (matched) {
        console.log(`🎯 Equipment ${equipmentNumber} categorized as: ${categoryCode} (${categoryMapping[categoryCode]})`);
        return categoryCode;
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

// Enhanced categorization with parent-based logic
export const enhancedCategorizeEquipment = (equipment, allEquipment) => {
  const equipmentNumber = equipment.equipmentNumber || 'Unknown';
  const cleanedNumber = equipmentNumber.replace(/^[+-]/, '');
  
  console.log(`🔍 Categorizing equipment: "${equipmentNumber}" (cleaned: "${cleanedNumber}")`);
  
  // ENHANCED: Pass allEquipment to enable parent-based categorization
  const category = determineCategoryCode(equipment, allEquipment);
  
  if (category !== '99') {
    console.log(`   ✅ Matched pattern in category ${category} (${categoryMapping[category]})`);
  } else {
    console.log(`   ❓ No pattern matched, categorizing as '99' (Unrecognised)`);
  }
  
  return category;
};

// ENHANCED: Equipment processing function
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

// ENHANCED: Find next available WBS code
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

// ENHANCED: Modern structure generation with debugging and parent-based categorization
export const generateModernStructure = (nodes, subsystemId, subsystem, data) => {
  let categoryCounter = 1;
  
  const orderedCategoryKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];
  
  // CRITICAL DEBUG: Check for T11/T21 in this subsystem
  const allSubsystemEquipment = data.filter(item => item.subsystem === subsystem);
  const t11InSubsystem = allSubsystemEquipment.find(item => item.equipmentNumber?.trim() === 'T11');
  const t21InSubsystem = allSubsystemEquipment.find(item => item.equipmentNumber?.trim() === 'T21');
  
  if (t11InSubsystem || t21InSubsystem) {
    console.log(`\n🎯 CRITICAL: Processing subsystem "${subsystem}" - Contains T11/T21`);
    console.log(`📊 Total equipment in subsystem: ${allSubsystemEquipment.length}`);
  }
  
  orderedCategoryKeys.forEach(number => {
    const name = categoryMapping[number];
    const categoryId = `${subsystemId}.${categoryCounter}`;
    
    // Add category node
    nodes.push({
      wbs_code: categoryId,
      parent_wbs_code: subsystemId,
      wbs_name: `${number} | ${name}`
    });

    // Get equipment for this category
    const subsystemEquipment = data.filter(item => 
      item.subsystem === subsystem && 
      item.commissioning === 'Y'
    );

    const categoryEquipment = subsystemEquipment.filter(item => {
      const category = determineCategoryCode(item, data);
      return category === number;
    });
    
    if (categoryEquipment.length > 0) {
      const parentEquipment = categoryEquipment.filter(item => {
        const hasParentInCategory = categoryEquipment.some(potentialParent => 
          potentialParent.equipmentNumber?.trim() === item.parentEquipmentNumber?.trim()
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

        const addChildrenRecursively = (parentEquipmentNumber, parentWbsCode) => {
          const childEquipment = data.filter(child => 
            child.parentEquipmentNumber?.trim() === parentEquipmentNumber?.trim() && 
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

    categoryCounter++;
  });
};

// Main WBS generation function with proper TBC handling
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

  // Handle TBC equipment properly
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
