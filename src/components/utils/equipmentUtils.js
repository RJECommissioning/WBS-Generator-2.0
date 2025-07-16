// src/components/utils/equipmentUtils.js

import { columnMapping, invalidEquipmentPatterns } from './constants';

/**
 * Validates if an equipment number is valid for WBS processing
 * @param {string} equipmentNumber - The equipment number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEquipmentNumber = (equipmentNumber) => {
  if (!equipmentNumber || typeof equipmentNumber !== 'string') return false;
  
  const trimmed = equipmentNumber.trim();
  if (trimmed.length < 1) return false;
  
  // IMPROVED: More specific invalid patterns
  const specificInvalidPatterns = [
    /^EXAMPLE/i,
    /^Lot\s+\d+/i,
    /^COMBI-/i,
    /^FREE\s+ISSUE/i,
    /^Wall\s+Internal/i,
    /\(Copy\)/i,
    /^Test\s+bay$/i,
    /^Panel\s+Shop$/i,
    /^Pad$/i,
    /^Phase\s+[12]$/i
  ];
  
  return !specificInvalidPatterns.some(pattern => pattern.test(trimmed));
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
 * ENHANCED: Extracts equipment numbers from existing WBS structure with extensive debugging
 * @param {Array} wbsNodes - Array of WBS nodes
 * @returns {Object} - Object with equipmentNumbers array and existingSubsystems map
 */
export const extractEquipmentFromWBS = (wbsNodes) => {
  console.log('🔧 ENHANCED: Equipment Extraction from WBS');
  console.log('==========================================');
  
  const equipmentNumbers = [];
  const existingSubsystems = new Map();
  const debugInfo = {
    processed: [],
    skipped: [],
    invalid: [],
    duplicates: []
  };
  
  // EXACT WBS structure elements to skip
  const wbsStructureElements = new Set([
    'Test bay', 'Panel Shop', 'Pad', 'Phase 1', 'Phase 2',
    'Preparations and set-up', 'Protection Panels', 'HV Switchboards',
    'LV Switchboards', 'Transformers', 'Battery Systems', 'Earthing',
    'Building Services', 'Interface Testing', 'Ancillary Systems',
    'Unrecognised Equipment', 'Milestones', 'Pre-requisites'
  ]);
  
  // WBS structure PATTERNS - more precise
  const wbsPatterns = [
    /^M\s*\|\s*Milestones?$/i,
    /^P\s*\|\s*Pre-requisites?$/i,
    /^S\d+\s*\|\s*.+$/,
    /^\d{2}\s*\|\s*(Preparations|Protection|HV|LV|Transformers|Battery|Earthing|Building|Interface|Ancillary|Unrecognised)/i,
    /^TBC\s*-\s*Equipment/i,
    /^\d{4}\s+/
  ];
  
  // Helper function to extract equipment from a WBS name
  const extractEquipmentFromName = (wbsName) => {
    // Try multiple separator patterns in order of likelihood
    const separators = [
      { pattern: ' | ', name: 'pipe with spaces' },
      { pattern: ' - ', name: 'dash with spaces' },
      { pattern: '|', name: 'pipe no spaces' },
      { pattern: '-', name: 'dash no spaces' },
      { pattern: ' : ', name: 'colon with spaces' },
      { pattern: ':', name: 'colon no spaces' },
      { pattern: ' / ', name: 'slash with spaces' },
      { pattern: '/', name: 'slash no spaces' }
    ];
    
    for (const sep of separators) {
      if (wbsName.includes(sep.pattern)) {
        const parts = wbsName.split(sep.pattern);
        if (parts.length >= 2) {
          const equipmentNumber = parts[0].trim();
          const description = parts.slice(1).join(sep.pattern).trim();
          
          if (equipmentNumber && description) {
            return {
              equipmentNumber,
              description,
              separator: sep.name,
              originalName: wbsName
            };
          }
        }
      }
    }
    
    return null;
  };
  
  // Process each WBS node
  wbsNodes.forEach((node, index) => {
    const wbsName = node.wbs_name;
    
    // Build subsystem mapping
    if (wbsName.match(/^S\d+\s*\|\s*/)) {
      const subsystemName = wbsName.split('|')[1]?.trim();
      if (subsystemName) {
        existingSubsystems.set(subsystemName, node.wbs_code);
        const cleanName = subsystemName.replace(/^\+/, '').trim();
        existingSubsystems.set(cleanName, node.wbs_code);
        existingSubsystems.set(`+${cleanName}`, node.wbs_code);
      }
    }
    
    // Skip exact WBS structure matches
    if (wbsStructureElements.has(wbsName)) {
      debugInfo.skipped.push({
        wbsName,
        reason: 'exact WBS structure match',
        wbsCode: node.wbs_code
      });
      return;
    }
    
    // Skip WBS pattern matches
    if (wbsPatterns.some(pattern => pattern.test(wbsName))) {
      debugInfo.skipped.push({
        wbsName,
        reason: 'WBS pattern match',
        wbsCode: node.wbs_code
      });
      return;
    }
    
    // Try to extract equipment
    const extracted = extractEquipmentFromName(wbsName);
    
    if (extracted) {
      const { equipmentNumber, description, separator } = extracted;
      
      // Validate equipment number
      if (!isValidEquipmentNumber(equipmentNumber)) {
        debugInfo.invalid.push({
          wbsName,
          equipmentNumber,
          description,
          reason: 'failed validation',
          wbsCode: node.wbs_code
        });
        return;
      }
      
      // Check for duplicates
      if (equipmentNumbers.includes(equipmentNumber)) {
        debugInfo.duplicates.push({
          wbsName,
          equipmentNumber,
          description,
          wbsCode: node.wbs_code
        });
        return;
      }
      
      // Add to results
      equipmentNumbers.push(equipmentNumber);
      debugInfo.processed.push({
        wbsName,
        equipmentNumber,
        description,
        separator,
        wbsCode: node.wbs_code
      });
      
      // Show first 10 extractions
      if (debugInfo.processed.length <= 10) {
        console.log(`   ✅ Extracted: "${equipmentNumber}" from "${wbsName}" (${separator})`);
      }
    } else {
      debugInfo.skipped.push({
        wbsName,
        reason: 'no equipment pattern found',
        wbsCode: node.wbs_code
      });
    }
  });
  
  // Enhanced logging
  console.log(`\n📊 ENHANCED Extraction Summary:`);
  console.log(`   Total WBS nodes processed: ${wbsNodes.length}`);
  console.log(`   Equipment extracted: ${equipmentNumbers.length}`);
  console.log(`   Items processed: ${debugInfo.processed.length}`);
  console.log(`   Items skipped: ${debugInfo.skipped.length}`);
  console.log(`   Items invalid: ${debugInfo.invalid.length}`);
  console.log(`   Duplicates found: ${debugInfo.duplicates.length}`);
  console.log(`   Subsystems found: ${existingSubsystems.size}`);
  
  // Show breakdown of skipped items
  if (debugInfo.skipped.length > 0) {
    console.log(`\n🔍 Skipped Items Breakdown:`);
    const skipReasons = {};
    debugInfo.skipped.forEach(item => {
      skipReasons[item.reason] = (skipReasons[item.reason] || 0) + 1;
    });
    Object.entries(skipReasons).forEach(([reason, count]) => {
      console.log(`   ${reason}: ${count} items`);
    });
  }
  
  // Show some examples of skipped items that might be equipment
  const potentialEquipment = debugInfo.skipped.filter(item => 
    item.reason === 'no equipment pattern found' && 
    item.wbsName.length > 0 && 
    !item.wbsName.match(/^\d{2}\s*\|/) &&
    !item.wbsName.match(/^[MPS]\d*\s*\|/)
  );
  
  if (potentialEquipment.length > 0) {
    console.log(`\n🚨 Potential Equipment Items Missed (${potentialEquipment.length} items):`);
    potentialEquipment.slice(0, 10).forEach(item => {
      console.log(`   ❓ "${item.wbsName}" (${item.wbsCode})`);
    });
    if (potentialEquipment.length > 10) {
      console.log(`   ... and ${potentialEquipment.length - 10} more`);
    }
  }
  
  return { 
    equipmentNumbers, 
    existingSubsystems,
    debugInfo // Return debug info for further analysis
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
  
  // Show first 10 missing items for debugging
  if (newEquipment.length > 0) {
    console.log(`\n🔍 First 10 "new" equipment items:`);
    newEquipment.slice(0, 10).forEach(item => {
      console.log(`   🆕 ${item.equipmentNumber} - ${item.description} (${item.commissioning})`);
    });
  }
  
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
