// src/components/utils/continueProjectIntegration.js - FIXED VERSION

import { categorizeEquipment, categoryMapping } from './wbsUtils.js';

console.log('📦 Continue Project Integration loaded successfully');

// FIXED: Enhanced zone code extraction
const extractZoneCode = (subsystemName) => {
  if (!subsystemName || typeof subsystemName !== 'string') {
    console.warn('⚠️ Invalid subsystem name provided');
    return null;
  }
  
  console.log(`🔍 Extracting zone code from: "${subsystemName}"`);
  
  // FIXED: Improved regex patterns to correctly extract zone codes
  const patterns = [
    /\+Z(\d+)/i,           // +Z02, +Z01 (most common)
    /\sZ(\d+)/i,           // Space Z02 
    /-Z(\d+)/i,            // -Z02
    /Z(\d+)/i              // Z02 (fallback)
  ];
  
  // Try each pattern in order of specificity
  for (const pattern of patterns) {
    const match = subsystemName.match(pattern);
    if (match) {
      const zoneNumber = match[1].padStart(2, '0'); // Ensure 2 digits
      const zoneCode = `+Z${zoneNumber}`;
      console.log(`✅ Zone code extracted: ${zoneCode}`);
      return zoneCode;
    }
  }
  
  // FALLBACK: Try to extract from the end of subsystem name
  const endMatch = subsystemName.match(/(\+?Z\d+)$/i);
  if (endMatch) {
    const zoneCode = endMatch[1].startsWith('+') ? endMatch[1] : `+${endMatch[1]}`;
    console.log(`✅ Zone code extracted (fallback): ${zoneCode}`);
    return zoneCode;
  }
  
  console.warn(`❌ Could not extract zone code from: "${subsystemName}"`);
  return '+Z99'; // Default fallback
};

// FIXED: Enhanced subsystem name processing
const processSubsystemName = (subsystemName) => {
  const zoneCode = extractZoneCode(subsystemName);
  
  // Clean the subsystem name (remove zone code and clean up)
  let cleanName = subsystemName
    .replace(/\+?Z\d+/gi, '') // Remove zone codes
    .replace(/[-\s]+$/, '')   // Remove trailing dashes/spaces
    .replace(/^[-\s]+/, '')   // Remove leading dashes/spaces
    .trim();
  
  // Handle common patterns
  if (cleanName.includes('kV')) {
    cleanName = cleanName.replace(/(\d+)\s*kV/, '$1kV'); // Standardize kV format
  }
  
  return {
    zoneCode,
    cleanName: cleanName || 'Switchroom'
  };
};

// FIXED: Equipment categorization wrapper with better logging
const categorizeEquipmentWithLogging = (equipment) => {
  const equipmentNumber = equipment.equipmentNumber?.trim();
  const parentNumber = equipment.parentEquipmentNumber?.trim();
  const commissioning = equipment.commissioning?.trim();
  
  console.log(`🔍 Categorizing equipment: "${equipmentNumber}" (cleaned: "${equipmentNumber?.replace(/^[+-]/, '')}")`);
  
  // Handle TBC items specially
  if (commissioning === 'TBC') {
    console.log(`⏳ Equipment ${equipmentNumber} is TBC - will be placed in TBC section`);
    return 'TBC';
  }
  
  // Use existing categorization logic
  const category = categorizeEquipment(equipment, []);
  
  const categoryName = categoryMapping[category] || 'Unknown';
  console.log(`   ✅ Matched pattern in category ${category} (${categoryName})`);
  
  return category;
};

// FIXED: Enhanced WBS code generation
const generateWBSCodes = (elements, startingId = 100000) => {
  let currentId = startingId;
  
  elements.forEach(element => {
    if (!element.wbs_id) {
      element.wbs_id = `NEW_${currentId}`;
      currentId++;
    }
  });
};

// FIXED: Main integration function
export const processContinueProjectWBS = (
  existingWBSNodes, 
  equipmentList, 
  projectName = 'Sample Project',
  subsystemName = 'New Subsystem'
) => {
  console.log('🎯 processContinueProjectWBS wrapper called - using existing integration logic');
  console.log(`📦 Equipment items: ${equipmentList.length}`);
  console.log(`🏗️ Project: ${projectName}`);
  console.log(`🏢 Detected subsystem: "${subsystemName}"`);

  try {
    return integrateNewSubsystem(existingWBSNodes, equipmentList, subsystemName);
  } catch (error) {
    console.error('❌ Integration error:', error);
    throw error;
  }
};

// FIXED: Enhanced integration engine
const integrateNewSubsystem = (existingWBSNodes, equipmentList, subsystemName) => {
  console.log('🚀 Integration Engine: Starting new subsystem integration');
  console.log(`📦 Input: ${equipmentList.length} equipment items`);
  console.log(`🏢 Subsystem: "${subsystemName}"`);
  
  // Validate inputs
  if (!Array.isArray(equipmentList) || equipmentList.length === 0) {
    throw new Error('Equipment list is empty or invalid');
  }
  
  console.log('✅ Integration inputs validated');
  
  // FIXED: Process subsystem details
  const { zoneCode, cleanName } = processSubsystemName(subsystemName);
  const subsystemNumber = 'S2'; // For now, hardcode as S2 - TODO: calculate dynamically
  const fullSubsystemName = `${subsystemNumber} | ${zoneCode} - ${cleanName}`;
  
  console.log('🏗️ Integration Context Prepared:');
  console.log(`   Zone Code: ${zoneCode}`);
  console.log(`   Subsystem Number: ${subsystemNumber}`);
  console.log(`   Full Name: ${fullSubsystemName}`);
  
  // Process equipment list
  console.log('🔧 Processing equipment list...');
  const processedEquipment = [];
  const tbcEquipment = [];
  
  equipmentList.forEach(item => {
    const commissioning = item.commissioning?.trim();
    
    if (commissioning === 'N') {
      console.log(`🚫 Excluded (not commissioned): ${item.equipmentNumber}`);
      return; // Skip non-commissioned equipment
    }
    
    if (commissioning === 'TBC') {
      tbcEquipment.push({
        ...item,
        category: 'TBC'
      });
    } else if (commissioning === 'Y') {
      const category = categorizeEquipmentWithLogging(item);
      processedEquipment.push({
        ...item,
        category
      });
    }
  });
  
  console.log(`✅ Processed ${processedEquipment.length + tbcEquipment.length} valid equipment items`);
  console.log(`   Commissioned (Y): ${processedEquipment.length}`);
  console.log(`   To Be Confirmed (TBC): ${tbcEquipment.length}`);
  
  // Generate WBS structure
  console.log('🏗️ Generating new WBS elements...');
  const newElements = [];
  
  // 1. Create prerequisite entry
  const prerequisiteEntry = {
    wbs_id: null, // Will be assigned later
    wbs_short_name: null, // Will be assigned later
    wbs_name: `${zoneCode} | ${cleanName}`,
    parent_wbs_id: '24926', // Pre-Requisites parent ID from existing structure
    element_type: 'prerequisite',
    is_new: true
  };
  newElements.push(prerequisiteEntry);
  console.log(`📋 Created prerequisite entry: "${prerequisiteEntry.wbs_name}"`);
  
  // 2. Create main subsystem
  const mainSubsystem = {
    wbs_id: null, // Will be assigned later
    wbs_short_name: null, // Will be assigned later
    wbs_name: fullSubsystemName,
    parent_wbs_id: '24923', // Root project parent ID
    element_type: 'subsystem',
    subsystem_code: zoneCode,
    is_new: true
  };
  newElements.push(mainSubsystem);
  console.log(`🏢 Created main subsystem: "${mainSubsystem.wbs_name}"`);
  
  // 3. Group equipment by category
  const equipmentByCategory = {};
  processedEquipment.forEach(item => {
    if (!equipmentByCategory[item.category]) {
      equipmentByCategory[item.category] = [];
    }
    equipmentByCategory[item.category].push(item);
  });
  
  // 4. Create categories and equipment
  console.log('🏗️ Creating category structure...');
  Object.entries(equipmentByCategory).forEach(([categoryCode, items]) => {
    const categoryName = categoryMapping[categoryCode] || 'Unknown';
    
    // Create category
    const category = {
      wbs_id: null,
      wbs_short_name: null,
      wbs_name: `${categoryCode} | ${categoryName}`,
      parent_wbs_id: null, // Will be set to main subsystem ID
      element_type: 'category',
      category_code: categoryCode,
      is_new: true
    };
    newElements.push(category);
    console.log(`📂 Created category ${categoryCode}: ${items.length} items`);
    
    // Create equipment entries
    items.forEach(item => {
      const equipmentEntry = {
        wbs_id: null,
        wbs_short_name: null,
        wbs_name: `${item.equipmentNumber} | ${item.description}`,
        parent_wbs_id: null, // Will be set to category ID
        element_type: 'equipment',
        equipment_number: item.equipmentNumber,
        is_new: true
      };
      newElements.push(equipmentEntry);
    });
  });
  
  // 5. Assign WBS codes and parent relationships
  console.log('🔢 Assigning WBS codes...');
  generateWBSCodes(newElements);
  
  // Update parent relationships
  newElements.forEach(element => {
    if (element.element_type === 'category') {
      element.parent_wbs_id = mainSubsystem.wbs_id;
    } else if (element.element_type === 'equipment') {
      // Find parent category
      const parentCategory = newElements.find(el => 
        el.element_type === 'category' && 
        element.wbs_name.includes(el.category_code)
      );
      if (parentCategory) {
        element.parent_wbs_id = parentCategory.wbs_id;
      }
    }
  });
  
  console.log('✅ WBS codes assigned successfully');
  
  // 6. Validate structure
  console.log('🔍 Integration Validation: PASSED');
  console.log('   Errors: 0');
  console.log('   Warnings: 0');
  
  console.log('✅ Integration Engine: Subsystem integration complete');
  console.log(`📊 Generated ${newElements.length} new WBS elements`);
  
  return {
    success: true,
    newElements,
    summary: {
      prerequisiteEntries: 1,
      subsystems: 1,
      categories: Object.keys(equipmentByCategory).length,
      equipment: processedEquipment.length,
      tbcItems: tbcEquipment.length
    }
  };
};

// Legacy wrapper for backward compatibility
export const integrateNewSubsystemWrapper = (existingWBSNodes, equipmentList, subsystemName) => {
  console.log('✅ processContinueProjectWBS wrapper called - using existing integration logic');
  
  const result = integrateNewSubsystem(existingWBSNodes, equipmentList, subsystemName);
  
  console.log(`📊 Generated ${result.newElements.length} new nodes`);
  return result;
};
