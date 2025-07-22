// src/components/utils/continueProjectIntegration.js - FIXED PATTERN DETECTION
// Fixed to properly detect Project 5737's numeric WBS codes (1001, 1064, etc.)

console.log('📦 Continue Project Integration loaded successfully');

// FIXED: WBS Code Pattern Analysis for Project 5737
const analyzeWBSCodePattern = (existingElements) => {
  console.log('🔍 PATTERN ANALYSIS: Analyzing existing WBS code patterns...');
  
  // Collect all WBS codes from existing elements
  const wbsCodes = existingElements
    .map(el => el.wbs_short_name || el.wbs_code)
    .filter(code => code && code.length > 0)
    .sort();
  
  console.log(`📊 Found ${wbsCodes.length} WBS codes to analyze`);
  console.log(`🔍 Sample codes:`, wbsCodes.slice(0, 10));
  
  let pattern = {
    prefix: '',
    levels: [],
    separator: '.',
    maxCodes: {},
    isStandardPattern: false,
    isProject5737Pattern: false,
    nextLevel1: 2,
    nextLevel2: 1,
    nextLevel3: 1
  };
  
  // FIXED: Project 5737 Detection - Look for numeric codes in 1000+ range
  const project5737Codes = wbsCodes.filter(code => {
    const numCode = parseInt(code);
    return !isNaN(numCode) && numCode >= 1000 && numCode < 2000;
  });
  
  console.log(`🔍 FIXED: Project 5737 codes found: ${project5737Codes.length}`);
  console.log(`🔍 FIXED: Sample P5737 codes:`, project5737Codes.slice(0, 10));
  
  if (project5737Codes.length > 10) {
    console.log('🎯 FIXED: DETECTED Project 5737 pattern (numeric 1000+ codes)');
    
    pattern.isProject5737Pattern = true;
    
    // FIXED: Analyze numeric codes for max values
    const numericCodes = project5737Codes.map(code => parseInt(code)).filter(n => !isNaN(n));
    const maxCode = Math.max(...numericCodes);
    
    pattern.maxCodes[1] = maxCode;
    pattern.nextLevel1 = maxCode + 1;
    
    console.log(`📊 FIXED: Project 5737 Analysis:`);
    console.log(`   Max existing code: ${maxCode}`);
    console.log(`   Next available code: ${pattern.nextLevel1}`);
    console.log(`   Pattern: Simple numeric (${pattern.nextLevel1}, ${pattern.nextLevel1 + 1}, etc.)`);
    
  } else {
    console.log('🎯 DETECTED: Standard WBS pattern');
    pattern.isStandardPattern = true;
    pattern.nextLevel1 = 2;
  }
  
  return pattern;
};

// FIXED: Generate WBS codes for Project 5737 pattern
const generatePatternAwareWBSCode = (pattern, parentCode, childIndex, elementType) => {
  console.log(`🔧 FIXED: Generating code for type: ${elementType}, pattern: ${pattern.isProject5737Pattern ? 'P5737' : 'Standard'}`);
  
  if (pattern.isProject5737Pattern) {
    if (elementType === 'subsystem' || elementType === 'prerequisite') {
      const code = pattern.nextLevel1.toString();
      console.log(`✅ FIXED: Generated ${elementType} code: ${code}`);
      return code;
    } else if (elementType === 'category') {
      const code = `${parentCode}.${childIndex.toString().padStart(2, '0')}`;
      console.log(`✅ FIXED: Generated category code: ${code}`);
      return code;
    } else if (elementType === 'equipment') {
      const code = `${parentCode}.${childIndex.toString().padStart(2, '0')}`;
      console.log(`✅ FIXED: Generated equipment code: ${code}`);
      return code;
    }
  }
  
  // Standard pattern fallback
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

// MAIN FIXED INTEGRATION FUNCTION
export const processContinueProjectWBS = (
  existingWBSNodes, 
  equipmentList, 
  projectName = 'Sample Project',
  subsystemName = 'New Subsystem'
) => {
  console.log('🎯 FIXED processContinueProjectWBS - Correct Pattern Detection');
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
    // 1. FIXED: Analyze WBS code pattern
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
    
    // 7. Generate new WBS elements with FIXED codes
    const newElements = [];
    
    // 7a. Add to Prerequisites (if exists)
    if (structureAnalysis.prerequisites) {
      const prerequisiteCode = generatePatternAwareWBSCode(wbsPattern, '', null, 'prerequisite');
      const prerequisiteEntry = {
        wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
        parent_wbs_id: structureAnalysis.prerequisites.wbs_id,
        wbs_code: prerequisiteCode,
        wbs_short_name: prerequisiteCode,
        wbs_name: `${zoneCode} | ${cleanName}`,
        element_type: 'prerequisite',
        is_new: true
      };
      newElements.push(prerequisiteEntry);
      console.log(`📋 FIXED: Created prerequisite: "${prerequisiteEntry.wbs_name}" (Code: ${prerequisiteEntry.wbs_short_name})`);
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
    console.log(`🏢 FIXED: Created main subsystem: "${mainSubsystem.wbs_name}" (Code: ${mainSubsystem.wbs_short_name})`);
    
    // 7c. Create category structure with FIXED codes
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
        console.log(`📂 FIXED: Created category: "${categoryElement.wbs_name}" (Code: ${categoryElement.wbs_short_name})`);
        
        // Add equipment under category with FIXED codes
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
          console.log(`⚙️ FIXED: Created equipment: "${equipmentElement.wbs_name}" (Code: ${equipmentElement.wbs_short_name})`);
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
      wbsPattern: wbsPattern.isProject5737Pattern ? 'Project 5737 Pattern (FIXED)' : 'Standard Pattern'
    };
    
    console.log('✅ FIXED Integration complete!');
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
