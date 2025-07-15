// src/components/utils/equipmentUtils.js

import { 
  columnMapping, 
  invalidEquipmentPatterns, 
  standardWBSCategories, 
  wbsStructurePatterns 
} from './constants';

/**
 * Validates if an equipment number is valid
 * @param {string} equipmentNumber - The equipment number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEquipmentNumber = (equipmentNumber) => {
  if (!equipmentNumber || equipmentNumber.length < 2) return false;
  
  // Check against invalid patterns
  return !invalidEquipmentPatterns.some(pattern => 
    equipmentNumber.includes(pattern)
  );
};

/**
 * Determines the category code for equipment (01-10, 99)
 * @param {object} equipment - Equipment object with equipmentNumber and plu
 * @returns {string} - Category code (01-10, 99)
 */
export const determineCategoryCode = (equipment) => {
  const equipmentNumber = equipment.equipmentNumber.toUpperCase();
  const plu = equipment.plu ? equipment.plu.toUpperCase() : '';
  
  const categoryPatterns = {
    '02': ['+UH', 'UH'],
    '03': ['+WA', 'WA'],
    '04': ['+WC', 'WC'],
    '05': ['T', 'NET', 'TA', 'NER'],
    '06': ['+GB', 'GB', 'BAN'],
    '07': ['E', 'EB', 'EEP', 'MEB'],
    '08': ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS'],
    '10': ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K']
  };
  
  for (const [categoryCode, patterns] of Object.entries(categoryPatterns)) {
    for (const pattern of patterns) {
      if (categoryCode === '07') {
        // Special handling for earthing equipment
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
  
  return '99'; // Unrecognised equipment
};

/**
 * Formats subsystem name with Z-code handling
 * @param {string} subsystem - Raw subsystem name
 * @returns {string} - Formatted subsystem name
 */
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

/**
 * Processes Excel file and extracts equipment data
 * @param {File} file - Excel file
 * @returns {Promise<Array>} - Array of equipment objects
 */
export const processExcelFile = async (file) => {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { cellDates: true });
  
  const sheetName = workbook.SheetNames.includes('Equipment_List') 
    ? 'Equipment_List' 
    : workbook.SheetNames[0];
  
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const headerRow = jsonData[0];
  const dataRows = jsonData.slice(1);
  
  const equipmentList = dataRows.map(row => {
    const equipment = {};
    headerRow.forEach((header, index) => {
      const mappedField = columnMapping[header];
      if (mappedField) {
        equipment[mappedField] = row[index] || '';
      }
    });
    return equipment;
  }).filter(item => 
    item.equipmentNumber && 
    item.subsystem && 
    item.description && 
    item.commissioning
  );
  
  return equipmentList;
};

/**
 * Processes CSV file and extracts equipment data
 * @param {File} file - CSV file
 * @returns {Promise<Array>} - Array of equipment objects
 */
export const processCSVFile = async (file) => {
  const text = await file.text();
  const lines = text.split('\n');
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
  
  const equipmentList = lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
    const equipment = {};
    
    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase();
      if (headerLower.includes('subsystem')) {
        equipment.subsystem = values[index] || '';
      } else if (headerLower.includes('parent') && headerLower.includes('equipment')) {
        equipment.parentEquipmentNumber = values[index] || '';
      } else if (headerLower.includes('equipment') && headerLower.includes('number')) {
        equipment.equipmentNumber = values[index] || '';
      } else if (headerLower.includes('description')) {
        equipment.description = values[index] || '';
      } else if (headerLower.includes('commissioning')) {
        equipment.commissioning = values[index];
      }
    });
    
    return equipment;
  }).filter(item => 
    item.equipmentNumber && 
    item.subsystem && 
    item.description && 
    item.commissioning
  );
  
  return equipmentList;
};

/**
 * Processes uploaded file (Excel or CSV)
 * @param {File} file - Uploaded file
 * @returns {Promise<Array>} - Array of equipment objects
 */
export const processEquipmentFile = async (file) => {
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    return await processExcelFile(file);
  } else if (file.name.endsWith('.csv')) {
    return await processCSVFile(file);
  } else {
    throw new Error('Unsupported file format. Please use .xlsx, .xls, or .csv files.');
  }
};

/**
 * Finds matching subsystem in existing subsystems map
 * @param {string} equipmentSubsystem - Equipment subsystem name
 * @param {Map} existingSubsystems - Map of existing subsystems
 * @returns {string|null} - Matching WBS code or null
 */
export const findSubsystemMatch = (equipmentSubsystem, existingSubsystems) => {
  if (!equipmentSubsystem) return null;
  
  // Direct match
  if (existingSubsystems.has(equipmentSubsystem)) {
    return existingSubsystems.get(equipmentSubsystem);
  }
  
  // Try variations (remove/add prefixes, handle Z-codes)
  const variations = [
    equipmentSubsystem.replace(/^\+/, '').trim(),
    equipmentSubsystem.replace(/^-/, '').trim(),
    `+${equipmentSubsystem.replace(/^\+/, '').trim()}`,
    equipmentSubsystem.replace(/Z0(\d+)/, 'Z$1').trim(),
    equipmentSubsystem.replace(/Z(\d+)/, 'Z0$1').trim(),
    equipmentSubsystem.replace(/275\/33\s*kV\s*Substation/, '275/33 kV Substation').trim()
  ];
  
  for (const variation of variations) {
    if (existingSubsystems.has(variation)) {
      return existingSubsystems.get(variation);
    }
  }
  
  // Partial match for complex subsystem names
  for (const [subsystemName, wbsCode] of existingSubsystems) {
    if (subsystemName.toLowerCase().includes(equipmentSubsystem.toLowerCase()) || 
        equipmentSubsystem.toLowerCase().includes(subsystemName.toLowerCase())) {
      return wbsCode;
    }
  }
  
  return null;
};

/**
 * Extracts equipment numbers from WBS nodes
 * @param {Array} wbsNodes - Array of WBS nodes
 * @returns {Object} - Object with equipmentNumbers array and existingSubsystems Map
 */
export const extractEquipmentNumbers = (wbsNodes) => {
  console.log('🔧 FIXED: Equipment Extraction Process');
  console.log('====================================');
  
  const equipmentNumbers = [];
  const existingSubsystems = new Map();
  let processedCount = 0;
  let skippedCount = 0;
  
  // Pattern to identify actual equipment vs WBS structure
  const equipmentPatterns = [
    /^[A-Z]+\d+/, // T11, HN10, etc.
    /^[+-][A-Z]+\d+/, // +UH101, -F102, +WA10, etc.
    /^[A-Z]+\d+-[A-Z0-9-]+/, // EG01-1000-01, etc.
    /^[A-Z]+\d+\/[A-Z]/ // -F01/X, etc.
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
    if (standardWBSCategories.some(category => wbsName.includes(category))) {
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
      
      if (equipmentNumber && isValidEquipmentNumber(equipmentNumber)) {
        equipmentNumbers.push(equipmentNumber);
        processedCount++;
        if (processedCount <= 10) {
          console.log(`   ✅ Extracted equipment: "${equipmentNumber}" from "${wbsName}"`);
        }
      } else {
        skippedCount++;
        if (skippedCount <= 5) {
          console.log(`   🚫 Invalid equipment: "${equipmentNumber}" from "${wbsName}"`);
        }
      }
    }
  });
  
  const uniqueEquipment = [...new Set(equipmentNumbers)];
  
  console.log(`\n📊 FIXED Extraction Summary:`);
  console.log(`   Total WBS nodes processed: ${wbsNodes.length}`);
  console.log(`   Equipment extracted: ${uniqueEquipment.length}`);
  console.log(`   WBS structure elements skipped: ${skippedCount}`);
  console.log(`   Duplicate equipment removed: ${equipmentNumbers.length - uniqueEquipment.length}`);
  console.log(`   Subsystems found: ${existingSubsystems.size}`);
  
  return { equipmentNumbers: uniqueEquipment, existingSubsystems };
};

/**
 * Compares equipment lists to find new, existing, and removed equipment
 * @param {Array} existingEquipment - Array of existing equipment numbers
 * @param {Array} newEquipmentList - Array of new equipment objects
 * @returns {Object} - Object with newEquipment, existingEquipment, and removedEquipment arrays
 */
export const compareEquipmentLists = (existingEquipment, newEquipmentList) => {
  const existingSet = new Set(existingEquipment);
  const newSet = new Set(newEquipmentList.map(item => item.equipmentNumber));
  
  console.log("🔍 DEBUG: Equipment Comparison Analysis");
  console.log(`📋 Existing equipment count: ${existingEquipment.length}`);
  console.log(`📦 New equipment list count: ${newEquipmentList.length}`);
  console.log(`🔢 Unique new equipment numbers: ${newSet.size}`);
  
  const newEquipment = newEquipmentList.filter(item => !existingSet.has(item.equipmentNumber));
  const existingEquipmentInNew = newEquipmentList.filter(item => existingSet.has(item.equipmentNumber));
  const removedEquipment = existingEquipment.filter(equipNum => !newSet.has(equipNum));
  
  console.log(`🆕 New equipment found: ${newEquipment.length}`);
  console.log(`✅ Existing equipment in new list: ${existingEquipmentInNew.length}`);
  console.log(`❌ Removed equipment: ${removedEquipment.length}`);
  
  return {
    newEquipment,
    existingEquipment: existingEquipmentInNew,
    removedEquipment
  };
};
