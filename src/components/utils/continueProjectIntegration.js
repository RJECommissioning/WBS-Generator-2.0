// src/components/utils/continueProjectIntegration.js - FIXED CATEGORIZATION
// Fixed -F equipment categorization and parent-child relationships

console.log('📦 Continue Project Integration loaded successfully');

// KEPT: Your excellent zone code extraction function
const extractZoneCode = (subsystemName) => {
  if (!subsystemName || typeof subsystemName !== 'string') {
    console.warn('⚠️ Invalid subsystem name provided');
    return '+Z99';
  }
  
  console.log(`🔍 Extracting zone code from: "${subsystemName}"`);
  
  const patterns = [
    /\+Z(\d{2})/i,         // +Z02, +Z01 (exact 2 digits after +Z) - HIGHEST PRIORITY
    /\+Z(\d{1})/i,         // +Z2, +Z1 (single digit after +Z)
    /\sZ(\d{2})/i,         // Space Z02 (2 digits)
    /\sZ(\d{1})/i,         // Space Z2 (1 digit) 
    /-Z(\d{2})/i,          // -Z02 (2 digits)
    /-Z(\d{1})/i           // -Z2 (1 digit)
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

// ENHANCED: Generate proper WBS codes
const generateWBSCode = (parentElement, existingElements, childIndex = null) => {
  const parentCode = parentElement.wbs_code || parentElement.wbs_short_name;
  
  if (!parentCode) {
    console.warn('⚠️ Parent element missing WBS code, generating fallback');
    return `NEW_${Date.now()}`;
  }
  
  if (childIndex !== null) {
    return `${parentCode}.${childIndex.toString().padStart(2, '0')}`;
  }
  
  const existingChildren = existingElements.filter(el => 
    el.parent_wbs_id === parentElement.wbs_id
  );
  
  const maxChildNumber = existingChildren.reduce((max, child) => {
    const childCode = child.wbs_code || child.wbs_short_name || '';
    const parts = childCode.split('.');
    const lastPart = parts[parts.length - 1];
    const number = parseInt(lastPart) || 0;
    return Math.max(max, number);
  }, 0);
  
  const nextNumber = maxChildNumber + 1;
  return `${parentCode}.${nextNumber.toString().padStart(2, '0')}`;
};

// FIXED: Enhanced equipment categorization with proper -F handling
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
  
  // FIXED: Enhanced categorization patterns from README
  const categoryPatterns = {
    '02': { // Protection Panels
      patterns: ['+UH', 'UH', '-F', '-KF', '-Y', '-P'], // FIXED: Added -F here!
      description: 'Protection Panels'
    },
    '03': { // HV Switchboards
      patterns: ['+WA', 'WA'],
      description: 'HV Switchboards'  
    },
    '04': { // LV Switchboards
      patterns: ['+WC', 'WC'],
      description: 'LV Switchboards'
    },
    '05': { // Transformers
      patterns: ['T', 'NET', 'TA', 'NER'],
      description: 'Transformers'
    },
    '06': { // Battery Systems  
      patterns: ['+GB', 'GB', 'BAN'],
      description: 'Battery Systems'
    },
    '07': { // Earthing
      patterns: ['E', 'EB', 'EEP', 'MEB'],
      description: 'Earthing'
    },
    '08': { // Building Services - Enhanced patterns
      patterns: ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS', 'ESC', '-FM'],
      description: 'Building Services'
    },
    '10': { // Ancillary Systems
      patterns: ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K', 'SOLB'],
      description: 'Ancillary Systems'
    }
  };

  equipmentList.forEach(item => {
    const equipmentNumber = item.equipmentNumber?.trim() || '';
    let category = '99'; // Default to unrecognised
    let matchedPattern = '';
    
    console.log(`🔍 Categorizing: "${equipmentNumber}"`);
    
    // FIXED: Enhanced pattern matching with special handling for -F
    for (const [categoryCode, categoryInfo] of Object.entries(categoryPatterns)) {
      for (const pattern of categoryInfo.patterns) {
        let matched = false;
        
        if (pattern.startsWith('+') || pattern.startsWith('-')) {
          // Exact prefix match for signed patterns
          if (equipmentNumber.startsWith(pattern)) {
            matched = true;
            matchedPattern = pattern;
          }
        } else if (pattern.length <= 3) {
          // Short pattern matching (but not for longer descriptive patterns)
          if (equipmentNumber.startsWith(pattern) && !equipmentNumber.startsWith('+') && !equipmentNumber.startsWith('-')) {
            matched = true;
            matchedPattern = pattern;
          }
        } else {
          // Long pattern matching for descriptive patterns
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
      
      if (category !== '99') break; // Stop searching once we find a match
    }
    
    if (category === '99') {
      console.log(`❓ "${equipmentNumber}" -> Unrecognised (no pattern matched)`);
    }
    
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(item);
  });
  
  // Log summary with special attention to -F items
  Object.entries(categoryGroups).forEach(([catCode, items]) => {
    const fItems = items.filter(item => item.equipmentNumber?.startsWith('-F'));
    console.log(`📂 Category ${catCode} (${categoryMapping[catCode]}): ${items.length} items${fItems.length > 0 ? ` (${fItems.length} -F items)` : ''}`);
  });
  
  return categoryGroups;
};

// ENHANCED: Main integration function
export const processContinueProjectWBS = (
  existingWBSNodes, 
  equipmentList, 
  projectName = 'Sample Project',
  subsystemName = 'New Subsystem'
) => {
  console.log('🎯 processContinueProjectWBS - Enhanced Version');
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
    // 1. Analyze existing structure
    const structureAnalysis = analyzeExistingStructure(existingWBSNodes);
    
    // 2. Extract zone code
    const zoneCode = extractZoneCode(subsystemName);
    
    // 3. Clean subsystem name
    let cleanName = subsystemName
      .replace(/\+?Z\d+/gi, '')
      .replace(/[-\s]+$/, '')
      .replace(/^[-\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    cleanName = cleanName.replace(/(\d+)\s*kV/, '$1kV');
    
    // 4. Calculate next subsystem number
    const nextSubsystemNumber = structureAnalysis.subsystems.length > 0 
      ? Math.max(...structureAnalysis.subsystems.map(s => s.number)) + 1 
      : 1;
    
    console.log(`🔢 Next subsystem number: S${nextSubsystemNumber}`);
    
    // 5. FIXED: Process equipment with enhanced categorization
    const validEquipment = equipmentList.filter(item => {
      const commissioning = item.commissioning?.trim();
      return commissioning === 'Y' || commissioning === 'TBC';
    });
    
    const categoryGroups = processEquipmentByCategory(validEquipment);
    
    // 6. Generate new WBS elements
    const newElements = [];
    
    // 6a. Add to Prerequisites (if exists)
    if (structureAnalysis.prerequisites) {
      const prerequisiteEntry = {
        wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
        parent_wbs_id: structureAnalysis.prerequisites.wbs_id,
        wbs_code: generateWBSCode(structureAnalysis.prerequisites, [...existingWBSNodes, ...newElements]),
        wbs_name: `${zoneCode} | ${cleanName}`,
        element_type: 'prerequisite',
        is_new: true
      };
      newElements.push(prerequisiteEntry);
      console.log(`📋 Created prerequisite: "${prerequisiteEntry.wbs_name}"`);
    }
    
    // 6b. Create main subsystem
    const rootParent = structureAnalysis.rootElement || { wbs_id: '1', wbs_code: '1' };
    const mainSubsystem = {
      wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
      parent_wbs_id: rootParent.wbs_id,
      wbs_code: generateWBSCode(rootParent, [...existingWBSNodes, ...newElements]),
      wbs_name: `S${nextSubsystemNumber} | ${zoneCode} - ${cleanName}`,
      element_type: 'subsystem',
      subsystem_code: zoneCode,
      is_new: true
    };
    newElements.push(mainSubsystem);
    console.log(`🏢 Created main subsystem: "${mainSubsystem.wbs_name}"`);
    
    // 6c. Create category structure with parent-child relationships
    const orderedCategories = ['02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];
    let categoryIndex = 1;
    
    orderedCategories.forEach(categoryCode => {
      if (categoryGroups[categoryCode] && categoryGroups[categoryCode].length > 0) {
        // Create category node
        const categoryElement = {
          wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
          parent_wbs_id: mainSubsystem.wbs_id,
          wbs_code: generateWBSCode(mainSubsystem, [...existingWBSNodes, ...newElements], categoryIndex),
          wbs_name: `${categoryCode} | ${getCategoryName(categoryCode)}`,
          element_type: 'category',
          is_new: true
        };
        newElements.push(categoryElement);
        
        // ENHANCED: Group equipment by parent relationships for protection panels
        if (categoryCode === '02') {
          // Group by parent panel for protection equipment
          const panelGroups = new Map();
          const standaloneEquipment = [];
          
          categoryGroups[categoryCode].forEach(equipment => {
            const equipNum = equipment.equipmentNumber?.trim() || '';
            
            // Check if this is a child equipment (like -F102)
            if (equipNum.match(/^-[A-Z]+\d+$/)) {
              // This is a child equipment - find its parent from the parent equipment column
              const parentEquip = equipment.parentEquipmentNumber?.trim();
              if (parentEquip) {
                if (!panelGroups.has(parentEquip)) {
                  panelGroups.set(parentEquip, { parent: null, children: [] });
                }
                panelGroups.get(parentEquip).children.push(equipment);
                console.log(`🔗 Child equipment "${equipNum}" linked to parent "${parentEquip}"`);
              } else {
                standaloneEquipment.push(equipment);
              }
            } else {
              // This might be a parent equipment (like +UH101)
              const existingGroup = panelGroups.get(equipNum);
              if (existingGroup) {
                existingGroup.parent = equipment;
              } else {
                panelGroups.set(equipNum, { parent: equipment, children: [] });
              }
            }
          });
          
          // Create WBS structure with parent-child relationships
          let equipmentIndex = 1;
          
          // First add panel groups (parents with children)
          panelGroups.forEach((group, panelId) => {
            if (group.parent) {
              // Add parent panel
              const panelElement = {
                wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
                parent_wbs_id: categoryElement.wbs_id,
                wbs_code: generateWBSCode(categoryElement, [...existingWBSNodes, ...newElements], equipmentIndex),
                wbs_name: `${group.parent.equipmentNumber} | ${group.parent.description || ''}`.trim(),
                element_type: 'equipment',
                equipment_number: group.parent.equipmentNumber,
                commissioning: group.parent.commissioning,
                is_new: true
              };
              newElements.push(panelElement);
              console.log(`🏷️ Created panel: "${panelElement.wbs_name}"`);
              
              // Add children under this panel
              group.children.forEach((child, childIndex) => {
                const childElement = {
                  wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
                  parent_wbs_id: panelElement.wbs_id,
                  wbs_code: generateWBSCode(panelElement, [...existingWBSNodes, ...newElements], childIndex + 1),
                  wbs_name: `${child.equipmentNumber} | ${child.description || ''}`.trim(),
                  element_type: 'equipment',
                  equipment_number: child.equipmentNumber,
                  commissioning: child.commissioning,
                  is_new: true
                };
                newElements.push(childElement);
                console.log(`  🔗 Added child: "${childElement.wbs_name}" under "${panelElement.wbs_name}"`);
              });
              
              equipmentIndex++;
            }
          });
          
          // Add standalone equipment
          standaloneEquipment.forEach((equipment) => {
            const equipmentElement = {
              wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
              parent_wbs_id: categoryElement.wbs_id,
              wbs_code: generateWBSCode(categoryElement, [...existingWBSNodes, ...newElements], equipmentIndex),
              wbs_name: `${equipment.equipmentNumber} | ${equipment.description || ''}`.trim(),
              element_type: 'equipment',
              equipment_number: equipment.equipmentNumber,
              commissioning: equipment.commissioning,
              is_new: true
            };
            newElements.push(equipmentElement);
            equipmentIndex++;
          });
          
        } else {
          // Standard flat equipment structure for non-protection categories
          categoryGroups[categoryCode].forEach((equipment, equipIndex) => {
            const equipmentElement = {
              wbs_id: generateUniqueWBSId([...existingWBSNodes, ...newElements]),
              parent_wbs_id: categoryElement.wbs_id,
              wbs_code: generateWBSCode(categoryElement, [...existingWBSNodes, ...newElements], equipIndex + 1),
              wbs_name: `${equipment.equipmentNumber} | ${equipment.description || ''}`.trim(),
              element_type: 'equipment',
              equipment_number: equipment.equipmentNumber,
              commissioning: equipment.commissioning,
              is_new: true
            };
            newElements.push(equipmentElement);
          });
        }
        
        categoryIndex++;
      }
    });
    
    // 7. Generate summary
    const summary = {
      prerequisiteEntries: structureAnalysis.prerequisites ? 1 : 0,
      subsystems: 1,
      categories: Object.keys(categoryGroups).length,
      equipment: validEquipment.length,
      totalElements: newElements.length,
      subsystemNumber: nextSubsystemNumber,
      zoneCode: zoneCode,
      existingElements: existingWBSNodes.length,
      newElements: newElements.length
    };
    
    console.log('✅ Integration complete!');
    console.log(`📊 Summary: ${summary.totalElements} new elements created`);
    console.log(`   - Prerequisites: ${summary.prerequisiteEntries}`);
    console.log(`   - Subsystems: ${summary.subsystems}`);
    console.log(`   - Categories: ${summary.categories}`);
    console.log(`   - Equipment: ${summary.equipment}`);
    
    return {
      success: true,
      newElements,
      summary,
      structureAnalysis
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
