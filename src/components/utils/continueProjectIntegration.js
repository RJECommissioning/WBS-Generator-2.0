// src/components/utils/continueProjectIntegration.js - PATTERN-AWARE WBS CODES
// Fixed to detect and adapt to existing project WBS code patterns (e.g., Project 5737)

console.log('📦 Continue Project Integration loaded successfully');

// ADDED: WBS Code Pattern Analysis
const analyzeWBSCodePattern = (existingElements) => {
  console.log('🔍 PATTERN ANALYSIS: Analyzing existing WBS code patterns...');
  
  // Collect all WBS codes from existing elements
  const wbsCodes = existingElements
    .map(el => el.wbs_short_name || el.wbs_code)
    .filter(code => code && code.length > 0)
    .sort();
  
  console.log(`📊 Found ${wbsCodes.length} WBS codes to analyze`);
  console.log(`🔍 Sample codes:`, wbsCodes.slice(0, 10));
  
  // Determine the pattern structure
  let pattern = {
    prefix: '',           // e.g., "5737"
    levels: [],           // Number of digits at each level
    separator: '.',       // Usually "."
    maxCodes: {},         // Highest code found at each level
    isStandardPattern: false,
    isProject5737Pattern: false
  };
  
  // Check for Project 5737 pattern (5737.XXXX.XXXX.XXXX)
  const project5737Codes = wbsCodes.filter(code => code.startsWith('5737.'));
  
  if (project5737Codes.length > 10) {
    console.log('🎯 DETECTED: Project 5737 pattern (5737.XXXX.XXXX.XXXX)');
    
    pattern.prefix = '5737';
    pattern.separator = '.';
    pattern.isProject5737Pattern = true;
    
    // Analyze Project 5737 structure
    const levelAnalysis = { 1: [], 2: [], 3: [], 4: [] };
    
    project5737Codes.forEach(code => {
      const parts = code.split('.');
      if (parts.length >= 2 && parts[0] === '5737') {
        for (let i = 1; i < parts.length; i++) {
          const levelCode = parseInt(parts[i]) || 0;
          if (levelAnalysis[i]) {
            levelAnalysis[i].push(levelCode);
          }
        }
      }
    });
    
    // Find max codes at each level
    Object.entries(levelAnalysis).forEach(([level, codes]) => {
      if (codes.length > 0) {
        pattern.maxCodes[level] = Math.max(...codes);
        console.log(`📊 Level ${level} max code: ${pattern.maxCodes[level]} (from ${codes.length} samples)`);
      }
    });
    
    // Suggest next available codes
    pattern.nextLevel1 = (pattern.maxCodes[1] || 1000) + 1;  // Next subsystem (e.g., 1065)
    pattern.nextLevel2 = 1;  // Category starts at 1
    pattern.nextLevel3 = 1;  // Equipment starts at 1
    
    console.log(`✅ PATTERN ANALYSIS COMPLETE for Project 5737:`);
    console.log(`   Prefix: ${pattern.prefix}`);
    console.log(`   Next Level 1 (Subsystem): ${pattern.nextLevel1}`);
    console.log(`   Pattern: ${pattern.prefix}.${pattern.nextLevel1}.XX.XX`);
    
  } else {
    // Standard pattern detection (for future projects)
    console.log('🎯 DETECTED: Standard WBS pattern');
    pattern.isStandardPattern = true;
    pattern.nextLevel1 = 2; // Standard next subsystem
  }
  
  return pattern;
};

// ENHANCED: Generate WBS codes that match existing project pattern
const generatePatternAwareWBSCode = (pattern, parentCode, childIndex, elementType) => {
  if (pattern.isProject5737Pattern) {
    // Project 5737 specific code generation
    if (elementType === 'subsystem') {
      return `${pattern.prefix}.${pattern.nextLevel1}`;
    } else if (elementType === 'prerequisite') {
      // Prerequisites follow existing pattern under P | Pre-Requisites parent
      return `${pattern.prefix}.${pattern.nextLevel1}`;
    } else if (elementType === 'category') {
      // Categories under subsystem: 5737.1065.01, 5737.1065.02, etc.
      const paddedCategory = childIndex.toString().padStart(2, '0');
      return `${parentCode}.${paddedCategory}`;
    } else if (elementType === 'equipment') {
      // Equipment under category: 5737.1065.01.01, 5737.1065.01.02, etc.
      const paddedEquipment = childIndex.toString().padStart(2, '0');
      return `${parentCode}.${paddedEquipment}`;
    }
  }
  
  // Fallback to standard generation
  if (childIndex !== null) {
    return `${parentCode}.${childIndex.toString().padStart(2, '0')}`;
  }
  
  return `${parentCode}.01`;
};

// KEPT: Your excellent zone code extraction function
const extractZoneCode = (subsystemName) => {
  if (!subsystemName || typeof subsystemName !== 'string') {
    console.warn('⚠️ Invalid subsystem name provided');
    return '+Z99';
  }
  
  console.log(`🔍 Extracting zone code from: "${subsystemName}"`);
  
  const patterns = [
    /\+Z(\d{2})/i,         
    /\+Z(\d{1})/i,         
    /\sZ(\d{2})/i,         
    /\sZ(\d{1})/i,         
    /-Z(\d{2})/i,          
    /-Z(\d{1})/i           
  ];
  
  for (const pattern of patterns) {
    const match = subsystemName.match(pattern);
    if (match) {
      const zoneNumber = match[1].padStart(2, '0');
      const zoneCode = `+Z${zoneNumber}`;
      console.log(`✅ Zone code extracted: ${zoneCode} (from pattern: ${pattern})`);
      return zoneCode;
    }
  }
  
  console.warn(`❌ Could not extract zone code from: "${subsystemName}"`);
  return '+Z99';
};

// ENHANCED: Analyze existing WBS structure
const analyzeExistingStructure = (wbsElements) => {
  console.log('🔍 Analyzing existing WBS structure...');
  
  const analysis = {
    total: wbsElements.length,
    prerequisites: null,
    milestones: null,
    energisation: null,
    subsystems: [],
    tbcSection: null,
    rootElement: null
  };
  
  wbsElements.forEach(element => {
    const name = element.wbs_name || '';
    const wbsId = element.wbs_id;
    
    if (!element.parent_wbs_id || element.parent_wbs_id === '0') {
      analysis.rootElement = element;
    }
    
    if (name.match(/^P\s*\|\s*Pre-?Requisites?/i)) {
      analysis.prerequisites = element;
      console.log(`📋 Prerequisites found: "${name}" (ID: ${wbsId})`);
    } else if (name.match(/^M\s*\|\s*Milestones?/i)) {
      analysis.milestones = element;
      console.log(`🎯 Milestones found: "${name}" (ID: ${wbsId})`);
    } else if (name.match(/^E\s*\|\s*Energisation?/i)) {
      analysis.energisation = element;
      console.log(`⚡ Energisation found: "${name}" (ID: ${wbsId})`);
    } else if (name.match(/^S(\d+)\s*\|\s*/i)) {
      const match = name.match(/^S(\d+)\s*\|\s*/i);
      const subsystemInfo = {
        element: element,
        number: parseInt(match[1]),
        name: name
      };
      analysis.subsystems.push(subsystemInfo);
      console.log(`🏢 Subsystem found: S${subsystemInfo.number} - "${name}" (ID: ${wbsId})`);
    } else if (name.includes('TBC') || name.includes('To Be Confirmed')) {
      analysis.tbcSection = element;
      console.log(`⏳ TBC section found: "${name}" (ID: ${wbsId})`);
    }
  });
  
  analysis.subsystems.sort((a, b) => a.number - b.number);
  
  console.log('📊 Structure Analysis Complete:');
  console.log(`   Total elements: ${analysis.total}`);
  console.log(`   Prerequisites: ${analysis.prerequisites ? '✅' : '❌'}`);
  console.log(`   Milestones: ${analysis.milestones ? '✅' : '❌'}`);
  console.log(`   Energisation: ${analysis.energisation ? '✅' : '❌'}`);
  console.log(`   Existing subsystems: ${analysis.subsystems.length}`);
  console.log(`   Root element: ${analysis.rootElement ? '✅' : '❌'}`);
  
  return analysis;
};

// ENHANCED: Generate unique WBS ID
const generateUniqueWBSId = (existingElements) => {
  const existingIds = new Set(existingElements.map(el => parseInt(el.wbs_id) || 0));
  let newId = Math.max(...existingIds) + 1;
  
  while (existingIds.has(newId)) {
    newId++;
  }
  
  return newId.toString();
};

// ENHANCED: Equipment categorization (kept your working version)
const processEquipmentByCategory = (equipmentList) => {
  console.log('🔧 Processing equipment by category with FIXED -F handling...');
  
  const categoryGroups = {};
  const categoryMapping = {
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
  
  const categoryPatterns = {
    '02': { patterns: ['+UH', 'UH', '-F', '-KF', '-Y', '-P'], description: 'Protection Panels' },
    '03': { patterns: ['+WA', 'WA'], description: 'HV Switchboards' },
    '04': { patterns: ['+WC', 'WC'], description: 'LV Switchboards' },
    '05': { patterns: ['T', 'NET', 'TA', 'NER'], description: 'Transformers' },
    '06': { patterns: ['+GB', 'GB', 'BAN'], description: 'Battery Systems' },
    '07': { patterns: ['E', 'EB', 'EEP', 'MEB'], description: 'Earthing' },
    '08': { patterns: ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS', 'ESC', '-FM'], description: 'Building Services' },
    '10': { patterns: ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K', 'SOLB'], description: 'Ancillary Systems' }
  };

  equipmentList.forEach(item => {
    const equipmentNumber = item.equipmentNumber?.trim() || '';
    let category = '99';
    let matchedPattern = '';
    
    for (const [categoryCode, categoryInfo] of Object.entries(categoryPatterns)) {
      for (const pattern of categoryInfo.patterns) {
        let matched = false;
        
        if (pattern.startsWith('+') || pattern.startsWith('-')) {
          if (equipmentNumber.startsWith(pattern)) {
            matched = true;
            matchedPattern = pattern;
          }
        } else if (pattern.length <= 3) {
          if (equipmentNumber.startsWith(pattern) && !equipmentNumber.startsWith('+') && !equipmentNumber.startsWith('-')) {
            matched = true;
            matchedPattern = pattern;
          }
        } else {
          if (equipmentNumber.includes(pattern) || item.description?.includes(pattern)) {
            matched = true;
            matchedPattern = pattern;
          }
        }
        
        if (matched) {
          category = categoryCode;
          console.log(`✅ "${equipmentNumber}" matched pattern "${pattern}" -> Category ${category} (${categoryInfo.description})`);
          break;
        }
      }
      
      if (category !== '99') break;
    }
    
    if (category === '99') {
      console.log(`❓ "${equipmentNumber}" -> Unrecognised (no pattern matched)`);
    }
    
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(item);
  });
  
  // Log summary
  Object.entries(categoryGroups).forEach(([catCode, items]) => {
    const fItems = items.filter(item => item.equipmentNumber?.startsWith('-F'));
    console.log(`📂 Category ${catCode} (${categoryMapping[catCode]}): ${items.length} items${fItems.length > 0 ? ` (${fItems.length} -F items)` : ''}`);
  });
  
  return categoryGroups;
};

// MAIN ENHANCED INTEGRATION FUNCTION
export const processContinueProjectWBS = (
  existingWBSNodes, 
  equipmentList, 
  projectName = 'Sample Project',
  subsystemName = 'New Subsystem'
) => {
  console.log('🎯 ENHANCED processContinueProjectWBS - Pattern-Aware Version');
  console.log(`📦 Equipment items: ${equipmentList.length}`);
  console.log(`🏗️ Project: ${projectName}`);
  console.log(`🏢 Detected subsystem: "${subsystemName}"`);

  if (!Array.isArray(equipmentList) || equipmentList.length === 0) {
    throw new Error('Equipment list is empty or invalid');
  }
  
  if (!Array.isArray(existingWBSNodes) || existingWBSNodes.length === 0) {
    throw new Error('Existing WBS nodes are required');
  }

  try {
    // 1. ENHANCED: Analyze WBS code pattern
    const wbsPattern = analyzeWBSCodePattern(existingWBSNodes);
    
    // 2. Analyze existing structure
    const structureAnalysis = analyzeExistingStructure(existingWBSNodes);
    
    // 3. Extract zone code
    const zoneCode = extractZoneCode(subsystemName);
    
    // 4. Clean subsystem name
    let cleanName = subsystemName
      .replace(/\+?Z\d+/gi, '')
      .replace(/[-\s]+$/, '')
      .replace(/^[-\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    cleanName = cleanName.replace(/(\d+)\s*kV/, '$1kV');
    
    // 5. Calculate next subsystem number
    const nextSubsystemNumber = structureAnalysis.subsystems.length > 0 
      ? Math.max(...structureAnalysis.subsystems.map(s => s.number)) + 1 
      : 1;
    
    console.log(`🔢 Next subsystem number: S${nextSubsystemNumber}`);
    
    // 6. Process equipment with enhanced categorization
    const validEquipment = equipmentList.filter(item => {
      const commissioning = item.commissioning?.trim();
      return commissioning === 'Y' || commissioning === 'TBC';
    });
    
    const categoryGroups = processEquipmentByCategory(validEquipment);
    
    // 7. Generate new WBS elements with PATTERN-AWARE codes
    const newElements = [];
    
    // 7a. Add to Prerequisites (if exists)
    if (structureAnalysis.prerequisites) {
      const prerequisiteEntry = {
        wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
        parent_wbs_id: structureAnalysis.prerequisites.wbs_id,
        wbs_code: generatePatternAwareWBSCode(wbsPattern, '', null, 'prerequisite'),
        wbs_short_name: generatePatternAwareWBSCode(wbsPattern, '', null, 'prerequisite'),
        wbs_name: `${zoneCode} | ${cleanName}`,
        element_type: 'prerequisite',
        is_new: true
      };
      newElements.push(prerequisiteEntry);
      console.log(`📋 Created prerequisite: "${prerequisiteEntry.wbs_name}" (Code: ${prerequisiteEntry.wbs_short_name})`);
    }
    
    // 7b. Create main subsystem
    const rootParent = structureAnalysis.rootElement || { wbs_id: '1', wbs_code: '1' };
    const mainSubsystemCode = generatePatternAwareWBSCode(wbsPattern, '', null, 'subsystem');
    
    const mainSubsystem = {
      wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
      parent_wbs_id: rootParent.wbs_id,
      wbs_code: mainSubsystemCode,
      wbs_short_name: mainSubsystemCode,
      wbs_name: `S${nextSubsystemNumber} | ${zoneCode} - ${cleanName}`,
      element_type: 'subsystem',
      subsystem_code: zoneCode,
      is_new: true
    };
    newElements.push(mainSubsystem);
    console.log(`🏢 Created main subsystem: "${mainSubsystem.wbs_name}" (Code: ${mainSubsystem.wbs_short_name})`);
    
    // 7c. Create category structure with PATTERN-AWARE codes
    const orderedCategories = ['02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];
    let categoryIndex = 1;
    
    orderedCategories.forEach(categoryCode => {
      if (categoryGroups[categoryCode] && categoryGroups[categoryCode].length > 0) {
        
        const categoryWBSCode = generatePatternAwareWBSCode(wbsPattern, mainSubsystemCode, categoryIndex, 'category');
        
        // Create category node
        const categoryElement = {
          wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
          parent_wbs_id: mainSubsystem.wbs_id,
          wbs_code: categoryWBSCode,
          wbs_short_name: categoryWBSCode,
          wbs_name: `${categoryCode} | ${getCategoryName(categoryCode)}`,
          element_type: 'category',
          is_new: true
        };
        newElements.push(categoryElement);
        console.log(`📂 Created category: "${categoryElement.wbs_name}" (Code: ${categoryElement.wbs_short_name})`);
        
        // Add equipment under category with PATTERN-AWARE codes
        let equipmentIndex = 1;
        
        categoryGroups[categoryCode].forEach((equipment) => {
          const equipmentWBSCode = generatePatternAwareWBSCode(wbsPattern, categoryWBSCode, equipmentIndex, 'equipment');
          
          const equipmentElement = {
            wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
            parent_wbs_id: categoryElement.wbs_id,
            wbs_code: equipmentWBSCode,
            wbs_short_name: equipmentWBSCode,
            wbs_name: `${equipment.equipmentNumber} | ${equipment.description || ''}`.trim(),
            element_type: 'equipment',
            equipment_number: equipment.equipmentNumber,
            commissioning: equipment.commissioning,
            is_new: true
          };
          newElements.push(equipmentElement);
          console.log(`⚙️ Created equipment: "${equipmentElement.wbs_name}" (Code: ${equipmentElement.wbs_short_name})`);
          equipmentIndex++;
        });
        
        categoryIndex++;
      }
    });
    
    // 8. Generate summary
    const summary = {
      prerequisiteEntries: structureAnalysis.prerequisites ? 1 : 0,
      subsystems: 1,
      categories: Object.keys(categoryGroups).length,
      equipment: validEquipment.length,
      totalElements: newElements.length,
      subsystemNumber: nextSubsystemNumber,
      zoneCode: zoneCode,
      existingElements: existingWBSNodes.length,
      newElements: newElements.length,
      wbsPattern: wbsPattern.isProject5737Pattern ? 'Project 5737 Pattern' : 'Standard Pattern'
    };
    
    console.log('✅ ENHANCED Integration complete!');
    console.log(`📊 Summary: ${summary.totalElements} new elements created`);
    console.log(`   - Pattern: ${summary.wbsPattern}`);
    console.log(`   - Prerequisites: ${summary.prerequisiteEntries}`);
    console.log(`   - Subsystems: ${summary.subsystems}`);
    console.log(`   - Categories: ${summary.categories}`);
    console.log(`   - Equipment: ${summary.equipment}`);
    
    return {
      success: true,
      newElements,
      summary,
      structureAnalysis,
      wbsPattern
    };
    
  } catch (error) {
    console.error('❌ Integration error:', error);
    throw error;
  }
};

// Helper function for category names
const getCategoryName = (categoryCode) => {
  const mapping = {
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
  return mapping[categoryCode] || 'Unknown Category';
};

// Legacy wrapper for backward compatibility
export const integrateNewSubsystemWrapper = (existingWBSNodes, equipmentList, subsystemName) => {
  return processContinueProjectWBS(existingWBSNodes, equipmentList, 'Sample Project', subsystemName);
};
