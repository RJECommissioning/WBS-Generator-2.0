// src/components/utils/wbsUtils.js - Updated with parent-based categorization logic

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
  
  const categoryPatterns = {
    '02': ['+UH', 'UH'], // Protection Panels
    '03': ['+WA', 'WA'], // HV Switchboards
    '04': ['+WC', 'WC'], // LV Switchboards
    '05': ['T', 'NET', 'TA', 'NER'], // Transformers
    '06': ['+GB', 'GB', 'BAN'], // Battery Systems
    '07': ['E', 'EB', 'EEP', 'MEB'], // Earthing
    '08': ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS'], // Building Services
    '10': ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K'] // Ancillary Systems
  };
  
  for (const [categoryCode, patterns] of Object.entries(categoryPatterns)) {
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

// FIXED: Modern structure generation with parent-based categorization
export const generateModernStructure = (nodes, subsystemId, subsystem, data, allEquipment) => {
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
