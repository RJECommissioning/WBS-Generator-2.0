// src/components/utils/equipmentUtils.js - Equipment file processing and validation

// FIXED: Enhanced equipment validation function
export const isValidEquipmentNumber = (equipmentNumber) => {
  if (!equipmentNumber || equipmentNumber.length < 2) return false;
  
  // Exclude invalid patterns
  const invalidPatterns = [
    'EXAMPLE', 'Lot ', 'COMBI-', 'FREE ISSUE', 'Wall Internal', 
    '(Copy)', 'Test bay', 'Panel Shop', 'Pad', 'Phase 1', 'Phase 2',
    'Preparations and set-up', 'Protection Panels', 'HV Switchboards',
    'LV Switchboards', 'Transformers', 'Battery Systems', 'Earthing',
    'Building Services', 'Interface Testing', 'Ancillary Systems',
    'Unrecognised Equipment', 'Milestones', 'Pre-requisites'
  ];
  
  return !invalidPatterns.some(pattern => equipmentNumber.includes(pattern));
};

// FIXED: Enhanced subsystem matching function
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

// FIXED: Process equipment file (Excel or CSV)
export const processEquipmentFile = async (file) => {
  console.log(`📁 Processing file: ${file.name}`);
  
  let equipmentList = [];
  
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    // Process Excel file
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
    
    const columnMapping = {
      'Subsystem': 'subsystem',
      'Parent Equipment Number': 'parentEquipmentNumber',
      'Equipment Number': 'equipmentNumber',
      'Description': 'description',
      'Commissioning (Y/N)': 'commissioning',
      'Project': 'project',
      'Item No.': 'itemNo',
      'PLU': 'plu',
      'Supplier': 'supplier',
      'Manufacturer': 'manufacturer',
      'Model Number': 'modelNumber',
      'Test Code': 'testCode',
      'Comments': 'comments',
      'Drawings': 'drawings'
    };
    
    equipmentList = dataRows.map(row => {
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
    
  } else if (file.name.endsWith('.csv')) {
    // Process CSV file
    const text = await file.text();
    const lines = text.split('\n');
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
          equipment.commissioning = values[index];
        } else if (headerLower.includes('plu')) {
          equipment.plu = values[index] || '';
        }
      });
      
      return equipment;
    }).filter(item => 
      item.equipmentNumber && 
      item.subsystem && 
      item.description && 
      item.commissioning
    );
    
  } else {
    throw new Error('Unsupported file format. Please use .xlsx, .xls, or .csv files.');
  }
  
  // Validate equipment list
  const validEquipment = equipmentList.filter(item => 
    isValidEquipmentNumber(item.equipmentNumber)
  );
  
  console.log(`📊 File processing complete:`);
  console.log(`   Total rows processed: ${equipmentList.length}`);
  console.log(`   Valid equipment: ${validEquipment.length}`);
  console.log(`   Commissioned (Y): ${validEquipment.filter(item => item.commissioning === 'Y').length}`);
  console.log(`   TBC: ${validEquipment.filter(item => item.commissioning === 'TBC').length}`);
  console.log(`   Not commissioned (N): ${validEquipment.filter(item => item.commissioning === 'N').length}`);
  
  if (validEquipment.length === 0) {
    throw new Error('No valid equipment found. Please ensure your file contains the required columns: Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)');
  }
  
  return validEquipment;
};

// FIXED: Process WBS structure file (for continue/missing equipment modes)
export const processWBSFile = async (file) => {
  console.log(`📁 Processing WBS file: ${file.name}`);
  
  let wbsData = [];
  let projectName = 'Imported Project';
  
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { cellDates: true });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const headerRow = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    wbsData = dataRows.map(row => ({
      wbs_code: row[0]?.toString() || '',
      parent_wbs_code: row[1] ? row[1].toString() : null,
      wbs_name: row[2] || ''
    })).filter(item => item.wbs_code && item.wbs_name);
    
  } else if (file.name.endsWith('.csv')) {
    const text = await file.text();
    const lines = text.split('\n');
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    
    wbsData = lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
      return {
        wbs_code: values[0] || '',
        parent_wbs_code: values[1] || null,
        wbs_name: values[2] || ''
      };
    }).filter(item => item.wbs_code && item.wbs_name);
  } else {
    throw new Error('Unsupported file format. Please use .xlsx, .xls, or .csv files.');
  }

  // Extract project name from root node
  const rootNode = wbsData.find(node => node.parent_wbs_code === null);
  if (rootNode) {
    projectName = rootNode.wbs_name;
  }

  // Calculate last WBS code for continue mode
  const subsystemNodes = wbsData.filter(node => 
    node.wbs_code.startsWith('1.') && 
    node.wbs_code.split('.').length === 2 &&
    node.wbs_name.startsWith('S')
  );
  
  let lastWbsCode = 3;
  if (subsystemNodes.length > 0) {
    const subsystemNumbers = subsystemNodes.map(node => 
      parseInt(node.wbs_code.split('.')[1])
    );
    lastWbsCode = Math.max(...subsystemNumbers) + 1;
  }

  // Extract existing subsystems
  const subsystems = wbsData
    .filter(node => node.wbs_name.startsWith('S') && node.wbs_name.includes('|'))
    .map(node => node.wbs_name.split('|')[1]?.trim() || '')
    .filter(name => name);

  console.log(`📊 WBS file processing complete:`);
  console.log(`   Project: ${projectName}`);
  console.log(`   Total WBS nodes: ${wbsData.length}`);
  console.log(`   Subsystems: ${subsystems.length}`);
  console.log(`   Next WBS code: ${lastWbsCode}`);

  return {
    projectName,
    lastWbsCode,
    subsystems,
    wbsNodes: wbsData
  };
};

// FIXED: Compare equipment lists for missing equipment functionality
export const compareEquipmentLists = (existingEquipment, newEquipmentList) => {
  const existingSet = new Set(existingEquipment);
  const newSet = new Set(newEquipmentList.map(item => item.equipmentNumber));
  
  console.log("🔍 Equipment Comparison Analysis");
  console.log(`📋 Existing equipment count: ${existingEquipment.length}`);
  console.log(`📦 New equipment list count: ${newEquipmentList.length}`);
  console.log(`🔢 Unique new equipment numbers: ${newSet.size}`);
  
  // Debug: Show first 10 existing equipment numbers
  console.log("🏗️ First 10 existing equipment numbers:");
  existingEquipment.slice(0, 10).forEach(num => console.log(`   ${num}`));
  
  // Debug: Show first 10 new equipment numbers
  console.log("📦 First 10 new equipment numbers:");
  newEquipmentList.slice(0, 10).forEach(item => console.log(`   ${item.equipmentNumber}`));
  
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

// FIXED: Export WBS to CSV format
export const exportWBSToCSV = (wbsNodes, filename) => {
  const csvContent = [
    'wbs_code,parent_wbs_code,wbs_name',
    ...wbsNodes.map(node => 
      `"${node.wbs_code}","${node.parent_wbs_code || ''}","${node.wbs_name}"`
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
};

// FIXED: Export project state to JSON
export const exportProjectState = (projectState) => {
  const dataStr = JSON.stringify(projectState, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectState.projectName}_project_state.json`;
  link.click();
  
  URL.revokeObjectURL(url);
};
