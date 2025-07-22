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
    /^\d{4} \| Summerfield$/, // Project root
    /Preparations and set-up|Protection Panels|HV Switchboards|LV Switchboards/,
    /Transformers|Battery Systems|Earthing|Building Services|Interface Testing/,
    /Ancillary Systems|Unrecognised Equipment|Energisation|Pre-Requisites/,
    /Milestones|Equipment To Be Confirmed/
  ];
  
  wbsNodes.forEach((node, index) => {
    const wbsName = node.wbs_name || node.name || '';
    const wbsCode = node.wbs_code || node.code || '';
    
    // Skip if it matches structure patterns
    const isStructureElement = structurePatterns.some(pattern => pattern.test(wbsName));
    
    if (isStructureElement) {
      console.log(`⏭️ SKIP Structure: "${wbsName}"`);
      skippedCount++;
      return;
    }
    
    // Track subsystem information for later use
    if (wbsName.includes('|') && !wbsName.match(/^\d{2}\s*\|/)) {
      const parts = wbsName.split('|');
      if (parts.length >= 2) {
        const subsystemName = parts[parts.length - 1].trim();
        existingSubsystems.set(subsystemName, wbsCode);
        console.log(`🏢 Subsystem tracked: "${subsystemName}" -> ${wbsCode}`);
      }
    }
    
    // ENHANCED: Extract potential equipment numbers using multiple approaches
    const potentialEquipment = [];
    
    // Method 1: Direct equipment extraction from name
    if (wbsName.includes('|')) {
      const parts = wbsName.split('|');
      const potentialEquipNumber = parts[0].trim();
      
      // ENHANCED: Better validation for equipment numbers
      if (isValidEquipmentNumber(potentialEquipNumber)) {
        potentialEquipment.push(potentialEquipNumber);
        console.log(`✅ FOUND Equipment: "${potentialEquipNumber}" from "${wbsName}"`);
      }
    }
    
    // Add valid equipment numbers
    potentialEquipment.forEach(equipNum => {
      if (!equipmentNumbers.includes(equipNum)) {
        equipmentNumbers.push(equipNum);
        processedCount++;
      }
    });
  });
  
  // Remove duplicates and sort
  const uniqueEquipment = [...new Set(equipmentNumbers)].sort();
  
  console.log(`✅ EXTRACTION COMPLETE:`);
  console.log(`   📊 Total nodes processed: ${wbsNodes.length}`);
  console.log(`   ✅ Equipment found: ${uniqueEquipment.length}`);
  console.log(`   ⏭️ Structure elements skipped: ${skippedCount}`);
  console.log(`   🏢 Subsystems tracked: ${existingSubsystems.size}`);
  
  // Debug output - show some examples
  console.log(`🔍 Sample equipment found:`);
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
    return equipNum ? equipNum.toString().trim().toUpperCase() : '';
  };
  
  const normalizedExisting = existingEquipment.map(normalizeEquipmentNumber);
  const existingSet = new Set(normalizedExisting);
  
  console.log(`📋 Existing equipment count: ${existingEquipment.length}`);
  console.log(`📦 New equipment list count: ${newEquipmentList.length}`);
  
  // Debug: Show first 10 existing equipment numbers
  console.log("🏗️ First 10 existing equipment numbers:");
  existingEquipment.slice(0, 10).forEach(num => console.log(`   ${num}`));
  
  // Debug: Show first 10 new equipment numbers
  console.log("📦 First 10 new equipment numbers:");
  newEquipmentList.slice(0, 10).forEach(item => console.log(`   ${item.equipmentNumber}`));
  
  // ENHANCED: More intelligent comparison
  const newEquipment = [];
  const existingEquipmentInNew = [];
  
  newEquipmentList.forEach(item => {
    const normalizedNew = normalizeEquipmentNumber(item.equipmentNumber);
    
    if (existingSet.has(normalizedNew)) {
      existingEquipmentInNew.push(item);
    } else {
      newEquipment.push(item);
    }
  });
  
  // Calculate removed equipment
  const newEquipmentNumbers = new Set(newEquipmentList.map(item => 
    normalizeEquipmentNumber(item.equipmentNumber)
  ));
  const removedEquipment = existingEquipment.filter(equipNum => 
    !newEquipmentNumbers.has(normalizeEquipmentNumber(equipNum))
  );
  
  console.log(`🆕 New equipment found: ${newEquipment.length}`);
  console.log(`✅ Existing equipment in new list: ${existingEquipmentInNew.length}`);
  console.log(`❌ Removed equipment: ${removedEquipment.length}`);
  
  // Show sample new equipment
  if (newEquipment.length > 0) {
    console.log("🆕 Sample new equipment:");
    newEquipment.slice(0, 10).forEach(item => 
      console.log(`   ${item.equipmentNumber} - ${item.description}`)
    );
  }
  
  return {
    newEquipment,
    existingEquipment: existingEquipmentInNew,
    removedEquipment
  };
};

// Determine equipment category with enhanced logic
export const determineCategoryCode = (equipment, allEquipment = []) => {
  const equipmentNumber = equipment.equipmentNumber?.toString().trim() || '';
  const description = equipment.description?.toString().trim() || '';
  const plu = equipment.plu?.toString().trim().toUpperCase() || '';
  
  console.log(`🔍 Pattern matching for: "${equipmentNumber}" (original: "${equipment.equipmentNumber}")`);
  
  const categoryPatterns = {
    '02': ['+UH', 'UH'], // Protection Panels
    '03': ['+WA', 'WA'], // HV Switchboards
    '04': ['+WC', 'WC'], // LV Switchboards
    '05': ['T', 'NET', 'TA', 'NER'], // Transformers
    '06': ['+GB', 'GB', 'BAN'], // Battery Systems
    '07': ['E', 'EB', 'EEP', 'MEB'], // Earthing
    '08': ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS', 'ESC', '-FM'], // FIXED: Building Services - Added -FM pattern
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
      } else if (categoryCode === '08') {
        // FIXED: Enhanced Building Services matching
        if (pattern.startsWith('+') || pattern.startsWith('-')) {
          if (equipmentNumber.startsWith(pattern)) {
            console.log(`✅ Equipment ${equipmentNumber} matches Building Services pattern: ${pattern}`);
            matched = true;
          }
        } else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS' && pattern !== 'ESC' && pattern !== 'SOLB') {
          if (equipmentNumber.startsWith(pattern) && !equipmentNumber.startsWith('+')) {
            console.log(`✅ Equipment ${equipmentNumber} matches short Building Services pattern: ${pattern}`);
            matched = true;
          }
        } else {
          if (equipmentNumber.includes(pattern) || plu.includes(pattern)) {
            console.log(`✅ Equipment ${equipmentNumber} matches long Building Services pattern: ${pattern}`);
            matched = true;
          }
        }
      } else {
        // Standard pattern matching for other categories
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

// FIXED: Format subsystem name helper with better zone code extraction
export const formatSubsystemName = (subsystem) => {
  // FIXED: Better zone code extraction patterns
  const zonePatterns = [
    /\+Z(\d{2})/i,    // +Z02 (exact 2 digits)
    /\+Z(\d{1})/i,    // +Z2 (single digit)
    /\sZ(\d{2})/i,    // Space Z02
    /\sZ(\d{1})/i,    // Space Z2
    /-Z(\d{2})/i,     // -Z02
    /-Z(\d{1})/i      // -Z2
  ];
  
  for (const pattern of zonePatterns) {
    const zMatch = subsystem.match(pattern);
    if (zMatch) {
      const zoneNumber = zMatch[1].padStart(2, '0'); // Ensure 2 digits
      const zCode = `+Z${zoneNumber}`;
      
      let cleanName = subsystem
        .replace(/\+?Z\d+/gi, '') // Remove zone codes
        .replace(/[-\s]+$/, '')   // Remove trailing dashes/spaces
        .replace(/^[-\s]+/, '')   // Remove leading dashes/spaces
        .replace(/\s+/g, ' ')     // Normalize spaces
        .trim();
      
      // Handle kV formatting
      cleanName = cleanName.replace(/(\d+)\s*kV/, '$1kV');
      
      console.log(`✅ Zone code extracted: ${zCode} from "${subsystem}"`);
      return `${zCode} - ${cleanName || 'Switchroom'}`;
    }
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

// ENHANCED: Generate WBS structure with proper categorization
export const generateModernStructure = (structure, parentCode, subsystemName, subsystemData) => {
  console.log(`🏗️ Generating structure for subsystem: ${subsystemName}`);
  
  // Group equipment by category
  const categoryGroups = processEquipmentByCategory(subsystemData, subsystemData);
  
  // Create category nodes in the correct order
  const orderedCategoryKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];
  let categoryCounter = 1;
  
  orderedCategoryKeys.forEach(categoryKey => {
    if (categoryGroups[categoryKey] && categoryGroups[categoryKey].length > 0) {
      const categoryId = `${parentCode}.${categoryCounter.toString().padStart(2, '0')}`;
      const categoryName = categoryMapping[categoryKey];
      
      // Add category node
      structure.push({
        wbs_code: categoryId,
        parent_wbs_code: parentCode,
        wbs_name: `${categoryKey} | ${categoryName}`
      });
      
      // Add equipment under category
      categoryGroups[categoryKey].forEach((equipment, equipIndex) => {
        const equipmentId = `${categoryId}.${(equipIndex + 1).toString().padStart(3, '0')}`;
        structure.push({
          wbs_code: equipmentId,
          parent_wbs_code: categoryId,
          wbs_name: `${equipment.equipmentNumber} | ${equipment.description}`
        });
      });
      
      categoryCounter++;
    }
  });
  
  console.log(`✅ Generated ${structure.length} WBS elements for ${subsystemName}`);
};

// FIXED: Main categorize equipment function (backward compatibility)
export const categorizeEquipment = (equipment, allEquipment) => {
  return enhancedCategorizeEquipment(equipment, allEquipment);
};
