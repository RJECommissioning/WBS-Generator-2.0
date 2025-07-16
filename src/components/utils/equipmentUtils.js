// src/utils/equipmentUtils.js

import { columnMapping, invalidEquipmentPatterns } from './constants';

/**
 * Validates if an equipment number is valid for WBS processing
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
 * Processes an equipment file (Excel or CSV) and returns standardized equipment array
 * @param {File} file - The uploaded file
 * @returns {Array} - Array of equipment objects
 */
export const processEquipmentFile = async (file) => {
  let equipmentList = [];
  
  try {
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Handle Excel files
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellDates: true });
      
      // Try to find Equipment_List sheet, otherwise use first sheet
      const sheetName = workbook.SheetNames.includes('Equipment_List') 
        ? 'Equipment_List' 
        : workbook.SheetNames[0];
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }
      
      const headerRow = jsonData[0];
      const dataRows = jsonData.slice(1);
      
      // Map data using column mapping
      equipmentList = dataRows.map(row => {
        const equipment = {};
        headerRow.forEach((header, index) => {
          const mappedField = columnMapping[header];
          if (mappedField) {
            equipment[mappedField] = row[index] || '';
          }
        });
        return equipment;
      });
      
    } else if (file.name.endsWith('.csv')) {
      // Handle CSV files
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim()); // Remove empty lines
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }
      
      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
      
      equipmentList = lines.slice(1).map(line => {
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
            equipment.commissioning = values[index] || '';
          } else if (headerLower.includes('plu')) {
            equipment.plu = values[index] || '';
          } else if (headerLower.includes('supplier')) {
            equipment.supplier = values[index] || '';
          } else if (headerLower.includes('manufacturer')) {
            equipment.manufacturer = values[index] || '';
          } else if (headerLower.includes('model')) {
            equipment.modelNumber = values[index] || '';
          } else if (headerLower.includes('project')) {
            equipment.project = values[index] || '';
          } else if (headerLower.includes('item')) {
            equipment.itemNo = values[index] || '';
          } else if (headerLower.includes('test')) {
            equipment.testCode = values[index] || '';
          } else if (headerLower.includes('comment')) {
            equipment.comments = values[index] || '';
          } else if (headerLower.includes('drawing')) {
            equipment.drawings = values[index] || '';
          }
        });
        
        return equipment;
      });
      
    } else {
      throw new Error('Unsupported file format. Please use .xlsx, .xls, or .csv files.');
    }
    
    // Filter and validate equipment
    const validEquipment = equipmentList.filter(item => {
      // Must have required fields
      if (!item.equipmentNumber || !item.subsystem || !item.description || !item.commissioning) {
        return false;
      }
      
      // Must have valid equipment number
      if (!isValidEquipmentNumber(item.equipmentNumber)) {
        return false;
      }
      
      // Must have valid commissioning status
      if (!['Y', 'N', 'TBC'].includes(item.commissioning.toUpperCase())) {
        return false;
      }
      
      return true;
    }).map(item => ({
      ...item,
      // Standardize commissioning values
      commissioning: item.commissioning.toUpperCase(),
      // Clean up strings
      equipmentNumber: item.equipmentNumber.trim(),
      subsystem: item.subsystem.trim(),
      description: item.description.trim(),
      parentEquipmentNumber: item.parentEquipmentNumber ? item.parentEquipmentNumber.trim() : ''
    }));
    
    console.log(`📊 Equipment Processing Summary:`);
    console.log(`   Total rows processed: ${equipmentList.length}`);
    console.log(`   Valid equipment items: ${validEquipment.length}`);
    console.log(`   Commissioned (Y): ${validEquipment.filter(item => item.commissioning === 'Y').length}`);
    console.log(`   TBC: ${validEquipment.filter(item => item.commissioning === 'TBC').length}`);
    console.log(`   Not commissioned (N): ${validEquipment.filter(item => item.commissioning === 'N').length}`);
    
    return validEquipment;
    
  } catch (error) {
    console.error('Equipment file processing error:', error);
    throw new Error(`Failed to process equipment file: ${error.message}`);
  }
};

/**
 * Extracts equipment numbers from existing WBS structure
 * @param {Array} wbsNodes - Array of WBS nodes
 * @returns {Object} - Object with equipmentNumbers array and existingSubsystems map
 */
export const extractEquipmentFromWBS = (wbsNodes) => {
  console.log('🔧 Equipment Extraction from WBS');
  console.log('================================');
  
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
      return;
    }
    
    // Skip WBS structure patterns
    if (wbsStructurePatterns.some(pattern => pattern.test(wbsName))) {
      skippedCount++;
      return;
    }
    
    // Extract equipment number from WBS name (format: "EQUIPMENT | Description" or "EQUIPMENT - Description")
    if (wbsName.includes(' | ') || wbsName.includes(' - ')) {
      const separator = wbsName.includes(' | ') ? ' | ' : ' - ';
      const equipmentNumber = wbsName.split(separator)[0]?.trim();
      
      if (equipmentNumber && isValidEquipmentNumber(equipmentNumber)) {
        equipmentNumbers.push(equipmentNumber);
        processedCount++;
      } else {
        skippedCount++;
      }
    }
  });
  
  const uniqueEquipment = [...new Set(equipmentNumbers)];
  
  console.log(`📊 Extraction Summary:`);
  console.log(`   Total WBS nodes processed: ${wbsNodes.length}`);
  console.log(`   Equipment extracted: ${uniqueEquipment.length}`);
  console.log(`   WBS structure elements skipped: ${skippedCount}`);
  console.log(`   Duplicate equipment removed: ${equipmentNumbers.length - uniqueEquipment.length}`);
  console.log(`   Subsystems found: ${existingSubsystems.size}`);
  
  return { 
    equipmentNumbers: uniqueEquipment, 
    existingSubsystems 
  };
};

/**
 * Compares equipment lists to identify new, existing, and removed equipment
 * @param {Array} existingEquipment - Array of existing equipment numbers
 * @param {Array} newEquipmentList - Array of new equipment objects
 * @returns {Object} - Object with newEquipment, existingEquipment, and removedEquipment arrays
 */
export const compareEquipmentLists = (existingEquipment, newEquipmentList) => {
  console.log("🔍 Equipment Comparison Analysis");
  console.log("===============================");
  
  const existingSet = new Set(existingEquipment);
  const newSet = new Set(newEquipmentList.map(item => item.equipmentNumber));
  
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

/**
 * Finds matching subsystem in existing WBS structure
 * @param {string} equipmentSubsystem - Subsystem name from equipment
 * @param {Map} existingSubsystems - Map of existing subsystems
 * @returns {string|null} - WBS code of matching subsystem or null
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
