// src/components/utils/wbsUtils.js - ENHANCED EQUIPMENT PATTERNS

// ENHANCED: Equipment categorization patterns
export const categoryPatterns = {
  '01': ['Test bay', 'Panel Shop', 'Pad'],
  
  '02': [
    '+UH', 'UH', // Protection panels
    'UH1', 'UH2', // Protection panel variants
    'DPMS', 'Multi-function', 'Protection', 'RTU', 'SCADA'
  ],
  
  '03': [
    '+WA', 'WA', // HV Switchboards
    'WA1', 'WA2', 'HV Switchgear'
  ],
  
  '04': [
    '+WC', 'WC', // LV Switchboards  
    'WC0', 'WC1', 'WC2', 'LV Switchboard'
  ],
  
  '05': [
    'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
    'T20', 'T21', 'T22', 'T23', 'T24', 'T25', 'T26', 'T27', 'T28', 'T29', 'T30',
    'NET1', 'NET2', 'NET3', 'TA', 'NER', 'Transformer'
  ],
  
  '06': [
    '+GB', 'GB', // Battery systems
    'GB1', 'GB2', 'GB3', 'GB4', 'GB5', 'GB6', 'GB7', 'GB8', 'GB9',
    'BAN', 'Battery', 'UPS'
  ],
  
  '07': [
    'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10',
    'EB', 'EEP', 'MEB', 'Earth', 'Earthing'
  ],
  
  '08': [
    // ENHANCED: Building Services patterns
    '-FM', 'FM', 'FM1', 'FM2', 'FM21', 'FM22', // Fire panels
    '-ESC', 'ESC', 'ESS', 'ISS', // Emergency/security systems
    'HN', 'LT', 'AC', 'HVAC', 'FAN', 'LIGHT', 'AIR',
    'MCP', 'POSD', 'LS1', 'LS2', // Manual call points, detectors
    'Fire', 'Security', 'Lighting', 'Ventilation',
    'Emergency', 'Detection', 'Alarm',
    'EXIT-LGHT', 'EXTL-LGHT', // Emergency lighting
    'GPO', 'SEB', 'PE' // General power, earthing
  ],
  
  '09': ['Phase 1', 'Phase 2', 'Interface'],
  
  '10': [
    'PSU', 'UPS', 'BCR', 'INV', 'CHG', 'REC', 'CONV',
    'SK', 'SK0', 'SK1', 'SK2', 'SK3', 'SK4', 'SK5', // Skids
    'Power Supply', 'Inverter', 'Charger', 'Rectifier',
    'Auxiliary', 'Ancillary'
  ],
  
  '99': [] // Unrecognised - will be default for unmatched items
};

// Category name mapping
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
  '99': 'Unrecognised Equipment',
  'TBC': 'To Be Confirmed'
};

// ENHANCED: Equipment categorization function
export const categorizeEquipment = (equipment, allEquipment = []) => {
  const equipmentNumber = equipment.equipmentNumber?.toString().trim() || '';
  const description = equipment.description?.toString().trim() || '';
  const plu = equipment.plu?.toString().trim() || '';
  const commissioning = equipment.commissioning?.toString().trim() || '';
  
  // Handle TBC items
  if (commissioning === 'TBC') {
    console.log(`⏳ Equipment ${equipmentNumber} is TBC - will be placed in TBC section`);
    return 'TBC';
  }
  
  // Check parent equipment for inheritance
  if (equipment.parentEquipmentNumber) {
    const parent = allEquipment.find(item => 
      item.equipmentNumber === equipment.parentEquipmentNumber
    );
    if (parent) {
      console.log(`🔍 Pattern matching for: "${equipment.parentEquipmentNumber}" (original: "${equipment.parentEquipmentNumber}")`);
      const parentCategory = categorizeEquipment(parent, allEquipment);
      if (parentCategory && parentCategory !== '99') {
        console.log(`🔗 Child "${equipmentNumber}" inherits category ${parentCategory} from parent "${equipment.parentEquipmentNumber}"`);
        return parentCategory;
      }
    }
  }

  // Clean equipment number for matching (remove prefixes)
  const cleanedEquipment = equipmentNumber.replace(/^[+-]/, '').trim();
  console.log(`🔍 Categorizing equipment: "${equipmentNumber}" (cleaned: "${cleanedEquipment}")`);

  // Try to match patterns in each category
  for (const [categoryCode, patterns] of Object.entries(categoryPatterns)) {
    if (categoryCode === '99') continue; // Skip unrecognised category
    
    for (const pattern of patterns) {
      let matched = false;
      
      // ENHANCED: Different matching strategies based on pattern type
      if (pattern.startsWith('+') || pattern.startsWith('-')) {
        // Exact prefix match for special patterns like +UH, +WC, -FM
        if (equipmentNumber.toLowerCase().startsWith(pattern.toLowerCase())) {
          console.log(`✅ Equipment ${equipmentNumber} matches prefix pattern: ${pattern}`);
          matched = true;
        }
      } else if (pattern.length <= 4 && /^[A-Z]+\d*$/.test(pattern)) {
        // Short alphanumeric patterns (UH, FM, GB, etc.)
        const patternLower = pattern.toLowerCase();
        const equipmentLower = cleanedEquipment.toLowerCase();
        
        // Try various matching approaches
        if (equipmentLower.startsWith(patternLower) ||
            equipmentNumber.toLowerCase().includes(patternLower) ||
            description.toLowerCase().includes(patternLower)) {
          console.log(`✅ Equipment ${equipmentNumber} matches short pattern: ${pattern}`);
          matched = true;
        }
      } else {
        // Longer descriptive patterns - check in description, PLU, or equipment number
        const patternLower = pattern.toLowerCase();
        if (description.toLowerCase().includes(patternLower) ||
            plu.toLowerCase().includes(patternLower) ||
            equipmentNumber.toLowerCase().includes(patternLower)) {
          console.log(`✅ Equipment ${equipmentNumber} matches long pattern: ${pattern}`);
          matched = true;
        }
      }
      
      if (matched) {
        console.log(`🎯 Equipment ${equipmentNumber} categorized as: ${categoryCode} (${categoryMapping[categoryCode]})`);
        return categoryCode;
      }
    }
  }
  
  // Default to unrecognised
  console.log(`❓ Equipment ${equipmentNumber} - no pattern matched, categorizing as '99'`);
  return '99';
};

// ENHANCED: Subsystem name formatting with better zone code handling
export const formatSubsystemName = (subsystem) => {
  if (!subsystem) return 'Unknown Subsystem';
  
  // ENHANCED: Better zone code extraction
  const zonePatterns = [
    /\+Z(\d+)/i,     // +Z02 (most common)
    /\sZ(\d+)/i,     // Space Z02
    /-Z(\d+)/i,      // -Z02  
    /Z(\d+)/i        // Z02 (fallback)
  ];
  
  let zCode = null;
  for (const pattern of zonePatterns) {
    const match = subsystem.match(pattern);
    if (match) {
      const zoneNumber = match[1].padStart(2, '0');
      zCode = `+Z${zoneNumber}`;
      break;
    }
  }
  
  if (zCode) {
    // Remove zone code from name and clean up
    let cleanName = subsystem
      .replace(/\+?Z\d+/gi, '')
      .replace(/[-\s]+$/, '')
      .replace(/^[-\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Handle kV formatting
    cleanName = cleanName.replace(/(\d+)\s*kV/, '$1kV');
    
    return `${zCode} - ${cleanName || 'Switchroom'}`;
  }
  
  return subsystem.trim();
};

// ENHANCED: Equipment validation with better invalid pattern detection
export const isValidEquipmentNumber = (equipmentNumber) => {
  if (!equipmentNumber || typeof equipmentNumber !== 'string') return false;
  
  const trimmed = equipmentNumber.trim();
  if (trimmed.length < 2) return false;
  
  // ENHANCED: More comprehensive invalid patterns
  const invalidPatterns = [
    /^EXAMPLE/i,
    /Lot\s/i,
    /COMBI-/i,
    /FREE\s*ISSUE/i,
    /Wall\s*Internal/i,
    /\(Copy\)/i,
    /Test\s*bay/i,
    /Panel\s*Shop/i,
    /^Pad$/i,
    /Phase\s*[12]/i,
    /Preparations\s*and\s*set-up/i,
    /Protection\s*Panels/i,
    /HV\s*Switchboards/i,
    /LV\s*Switchboards/i,
    /Transformers/i,
    /Battery\s*Systems/i,
    /Earthing/i,
    /Building\s*Services/i,
    /Interface\s*Testing/i,
    /Ancillary\s*Systems/i,
    /Unrecognised\s*Equipment/i,
    /Milestones/i,
    /Pre-?requisites/i,
    /Equipment\s*To\s*Be\s*Confirmed/i,
    /^TBC\s*-/i
  ];
  
  // Check for invalid patterns
  for (const pattern of invalidPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  
  // ENHANCED: Valid equipment patterns - at least one must match
  const validPatterns = [
    /^[+-]?[A-Z]{1,4}\d+$/i,           // +UH101, FM21, T11, etc.
    /^[+-]?[A-Z]+\d+[-/][A-Z0-9-]+/i, // Complex codes like EG01-1000-01
    /^[A-Z]+\d+\.\d+$/i,              // Decimal notation SK01.1
    /^[A-Z]{2,}\d*$/i,                // Letter codes with optional numbers
    /^[A-Z]+-\d+$/i,                  // Dash separated codes
    /^[A-Z]+[-/][A-Z0-9]+$/i          // Complex alphanumeric codes
  ];
  
  return validPatterns.some(pattern => pattern.test(trimmed));
};

// ENHANCED: Generate complete WBS structure for continue project mode
export const generateContinueWBS = (
  data, 
  projectName = 'Sample Project', 
  uploadMode = 'continue',
  existingWBSNodes = []
) => {
  console.log(`🏗️ Generating WBS - Mode: ${uploadMode}`);
  console.log(`📦 Input data: ${data.length} equipment items`);
  console.log(`🏗️ Existing nodes: ${existingWBSNodes.length}`);

  const allNodes = [...existingWBSNodes]; // Start with existing nodes
  const newNodes = []; // Track only new nodes
  
  // Group equipment by subsystem
  const subsystemGroups = {};
  data.forEach(item => {
    if (item.subsystem && item.commissioning !== 'N') {
      if (!subsystemGroups[item.subsystem]) {
        subsystemGroups[item.subsystem] = [];
      }
      subsystemGroups[item.subsystem].push(item);
    }
  });

  const subsystems = Object.keys(subsystemGroups);
  console.log(`📂 Found ${subsystems.length} subsystems to process`);
  
  // Process each subsystem
  subsystems.forEach((subsystemName, index) => {
    console.log(`🔧 Processing subsystem: "${subsystemName}"`);
    
    const subsystemEquipment = subsystemGroups[subsystemName];
    const formattedSubsystemName = formatSubsystemName(subsystemName);
    
    // Generate subsystem WBS codes (continue from existing)
    const nextSubsystemNumber = existingWBSNodes.length > 0 ? 
      Math.max(...existingWBSNodes.filter(n => n.wbs_code.match(/^1\.\d+$/)).map(n => parseInt(n.wbs_code.split('.')[1]))) + 1 :
      4; // Start from 1.4 if no existing nodes
    
    const subsystemId = `1.${nextSubsystemNumber + index}`;
    const subsystemLabel = `S${index + 2} | ${formattedSubsystemName}`;
    
    // Add main subsystem node
    const subsystemNode = {
      wbs_code: subsystemId,
      parent_wbs_code: "1",
      wbs_name: subsystemLabel,
      isNew: true
    };
    
    allNodes.push(subsystemNode);
    newNodes.push(subsystemNode);

    // Add to prerequisites
    const prerequisiteId = `1.2.${index + 2}`;
    const prerequisiteNode = {
      wbs_code: prerequisiteId,
      parent_wbs_code: "1.2",
      wbs_name: formattedSubsystemName,
      isNew: true
    };
    
    allNodes.push(prerequisiteNode);
    newNodes.push(prerequisiteNode);

    // Generate category structure under subsystem
    const categories = {};
    
    // Categorize equipment
    subsystemEquipment.forEach(equipment => {
      const category = categorizeEquipment(equipment, subsystemEquipment);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(equipment);
    });

    // Create category nodes
    Object.entries(categories).forEach(([categoryCode, items], categoryIndex) => {
      if (items.length === 0) return;
      
      const categoryName = categoryMapping[categoryCode] || 'Unknown';
      const categoryId = `${subsystemId}.${(categoryIndex + 1).toString().padStart(2, '0')}`;
      
      const categoryNode = {
        wbs_code: categoryId,
        parent_wbs_code: subsystemId,
        wbs_name: `${categoryCode} | ${categoryName}`,
        isNew: true
      };
      
      allNodes.push(categoryNode);
      newNodes.push(categoryNode);
      
      // Add equipment under category
      items.forEach((equipment, equipIndex) => {
        const equipmentId = `${categoryId}.${(equipIndex + 1).toString().padStart(3, '0')}`;
        const equipmentNode = {
          wbs_code: equipmentId,
          parent_wbs_code: categoryId,
          wbs_name: `${equipment.equipmentNumber} | ${equipment.description}`,
          isNew: true
        };
        
        allNodes.push(equipmentNode);
        newNodes.push(equipmentNode);
      });
    });
  });

  console.log(`✅ WBS generation complete`);
  console.log(`📊 Total nodes: ${allNodes.length} (${newNodes.length} new)`);

  return {
    allNodes,
    newNodes,
    summary: {
      subsystems: subsystems.length,
      totalEquipment: data.filter(item => item.commissioning !== 'N').length,
      newElementsCount: newNodes.length
    }
  };
};

export default {
  categorizeEquipment,
  categoryPatterns,
  categoryMapping,
  formatSubsystemName,
  isValidEquipmentNumber,
  generateContinueWBS
};
