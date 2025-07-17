// src/components/utils/wbsUtils.js - COMPLETE FILE WITH ENHANCED DEBUG

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

// FIXED: Enhanced equipment categorization with proper whitespace handling
export const determineCategoryCode = (equipment, allEquipment) => {
  // CRITICAL FIX: Check commissioning status FIRST
  if (equipment.commissioning === 'TBC') {
    console.log(`⏳ Equipment ${equipment.equipmentNumber} is TBC - will be placed in TBC section`);
    return 'TBC'; // Special return value for TBC equipment
  }

  // FIXED: Trim whitespace from equipment number
  const equipmentNumber = (equipment.equipmentNumber?.trim().toUpperCase()) || '';
  const plu = equipment.plu ? equipment.plu.trim().toUpperCase() : '';
  
  // STEP 1: Check if this is a child component
  if (equipment.parentEquipmentNumber && equipment.parentEquipmentNumber.trim() !== '') {
    // Find the parent equipment
    const parentEquipment = allEquipment.find(item => 
      item.equipmentNumber?.trim() === equipment.parentEquipmentNumber.trim()
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

// FIXED: Helper function with proper whitespace handling and enhanced pattern matching
const determineCategoryCodeForParent = (equipment) => {
  // FIXED: Trim whitespace from equipment number
  const equipmentNumber = (equipment.equipmentNumber?.trim().toUpperCase()) || '';
  const plu = equipment.plu ? equipment.plu.trim().toUpperCase() : '';
  
  console.log(`🔍 Pattern matching for: "${equipmentNumber}" (original: "${equipment.equipmentNumber}")`);
  
  const categoryPatterns = {
    '02': ['+UH', 'UH'], // Protection Panels
    '03': ['+WA', 'WA'], // HV Switchboards
    '04': ['+WC', 'WC'], // LV Switchboards
    '05': ['T', 'NET', 'TA', 'NER'], // Transformers
    '06': ['+GB', 'GB', 'BAN'], // Battery Systems
    '07': ['E', 'EB', 'EEP', 'MEB'], // Earthing
    '08': ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS', 'ESC'], // Building Services
    '10': ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K', 'SOLB'] // Ancillary Systems
  };
  
  for (const [categoryCode, patterns] of Object.entries(categoryPatterns)) {
    for (const pattern of patterns) {
      let matched = false;
      
      if (categoryCode === '05') {
        // FIXED: Enhanced Transformer matching with better debugging
        if (pattern === 'T') {
          // More precise T pattern matching
          if (equipmentNumber.match(/^T\d+$/)) {
            console.log(`🔌 Equipment ${equipmentNumber} matches Transformer pattern T + numbers (exact match)`);
            matched = true;
          }
        } else if (pattern === 'NET' && equipmentNumber.startsWith('NET')) {
          console.log(`🔌 Equipment ${equipmentNumber} matches NET pattern`);
          matched = true;
        } else if (pattern === 'TA' && equipmentNumber.startsWith('TA')) {
          console.log(`🔌 Equipment ${equipmentNumber} matches TA pattern`);
          matched = true;
        } else if (pattern === 'NER' && equipmentNumber.startsWith('NER')) {
          console.log(`🔌 Equipment ${equipmentNumber} matches NER pattern`);
          matched = true;
        }
      } else if (categoryCode === '07') {
        // Special handling for earthing category
        if (pattern === 'E' && equipmentNumber.startsWith('E') && 
            !equipmentNumber.startsWith('+') && !equipmentNumber.startsWith('EB') && 
            !equipmentNumber.startsWith('EEP') && !equipmentNumber.startsWith('ESS') && 
            !equipmentNumber.startsWith('ESC')) {
          const charAfterE = equipmentNumber.charAt(1);
          if (charAfterE >= '0' && charAfterE <= '9') {
            matched = true;
          }
        } else if (pattern === 'EB' && equipmentNumber.startsWith('EB')) {
          const charAfterEB = equipmentNumber.charAt(2);
          if (charAfterEB >= '0' && charAfterEB <= '9') {
            matched = true;
          }
        } else if (pattern === 'EEP' && equipmentNumber.startsWith('EEP')) {
          const charAfterEEP = equipmentNumber.charAt(3);
          if (charAfterEEP >= '0' && charAfterEEP <= '9') {
            matched = true;
          }
        } else if (pattern === 'MEB' && equipmentNumber.startsWith('MEB')) {
          matched = true;
        }
      } else {
        // FIXED: Enhanced standard pattern matching with better debugging
        if (pattern.startsWith('+')) {
          if (equipmentNumber.startsWith(pattern)) {
            console.log(`✅ Equipment ${equipmentNumber} matches + pattern: ${pattern}`);
            matched = true;
          }
        } else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS' && pattern !== 'ESC' && pattern !== 'SOLB') {
          if (equipmentNumber.startsWith(pattern) && !equipmentNumber.startsWith('+')) {
            console.log(`✅ Equipment ${equipmentNumber} matches short pattern: ${pattern}`);
            matched = true;
          }
        } else {
          if (equipmentNumber.includes(pattern) || plu.includes(pattern)) {
            console.log(`✅ Equipment ${equipmentNumber} matches long pattern: ${pattern}`);
            matched = true;
          }
        }
      }
      
      if (matched) {
        console.log(`🎯 Equipment ${equipmentNumber} categorized as: ${categoryCode} (${categoryMapping[categoryCode]})`);
        return categoryCode;
      }
    }
  }
  
  console.log(`❓ Equipment ${equipmentNumber} - no pattern matched, categorizing as '99'`);
  return '99'; // Default to unrecognised
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

// FIXED: Enhanced equipment extraction with better whitespace handling
export const extractEquipmentNumbers = (wbsNodes) => {
  console.log('🔧 ENHANCED: Equipment Extraction Process');
  console.log('==========================================');
  
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
  
  // ENHANCED: Better equipment patterns
  const equipmentPatterns = [
    /^[A-Z]+\d+$/, // T11, T21, HN10, etc. (exact match)
    /^[+-][A-Z]+\d+/, // +UH101, -F102, +WA10, etc.
    /^[A-Z]+\d+-[A-Z0-9-]+/, // EG01-1000-01, etc.
    /^[A-Z]+\d+\/[A-Z]/, // -F01/X, etc.
    /^-[A-Z]+.*/, // -ESC-1.1, etc.
    /^[A-Z]+.*-\d+/, // SOLB-1.1-01, etc.
    /^T\d+.*/ // T3800-1, T3800-2, etc.
  ];
  
  wbsNodes.forEach(node => {
    const wbsName = node.wbs_name;
    
    // Build subsystem mapping first
    if (wbsName && wbsName.startsWith('S') && wbsName.includes('|')) {
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
    if (standardCategories.some(category => wbsName && wbsName.includes(category))) {
      skippedCount++;
      if (skippedCount <= 5) {
        console.log(`   🚫 Skipped WBS category: "${wbsName}"`);
      }
      return;
    }
    
    // Skip WBS structure patterns
    if (wbsName && wbsStructurePatterns.some(pattern => pattern.test(wbsName))) {
      skippedCount++;
      if (skippedCount <= 5) {
        console.log(`   🚫 Skipped WBS structure: "${wbsName}"`);
      }
      return;
    }
    
    // Extract equipment number from WBS name (format: "EQUIPMENT | Description" or "EQUIPMENT - Description")
    if (wbsName && (wbsName.includes(' | ') || wbsName.includes(' - '))) {
      const separator = wbsName.includes(' | ') ? ' | ' : ' - ';
      const equipmentNumber = wbsName.split(separator)[0]?.trim(); // FIXED: Added trim()
      
      if (equipmentNumber && equipmentPatterns.some(pattern => pattern.test(equipmentNumber))) {
        equipmentNumbers.push(equipmentNumber);
        processedCount++;
        if (processedCount <= 15 || equipmentNumber === 'T11' || equipmentNumber === 'T21') {
          console.log(`   ✅ Extracted equipment: "${equipmentNumber}" from "${wbsName}"`);
        }
      } else {
        skippedCount++;
        if (skippedCount <= 5 || equipmentNumber === 'T11' || equipmentNumber === 'T21') {
          console.log(`   🚫 Invalid equipment: "${equipmentNumber}" from "${wbsName}"`);
        }
      }
    }
  });
  
  const uniqueEquipment = [...new Set(equipmentNumbers)];
  
  console.log(`\n📊 ENHANCED Extraction Summary:`);
  console.log(`   Total WBS nodes processed: ${wbsNodes.length}`);
  console.log(`   Equipment extracted: ${uniqueEquipment.length}`);
  console.log(`   WBS structure elements skipped: ${skippedCount}`);
  console.log(`   Duplicate equipment removed: ${equipmentNumbers.length - uniqueEquipment.length}`);
  console.log(`   Subsystems found: ${existingSubsystems.size}`);
  
  return { equipmentNumbers: uniqueEquipment, existingSubsystems };
};

// FIXED: Find next available WBS code
export const findNextWBSCode = (parentWbsCode, existingNodes) => {
  const childNodes = existingNodes.filter(node => 
    node.parent_wbs_code === parentWbsCode
  );
  
  if (childNodes.length === 0) {
    return `${parentWbsCode}.1`;
  }
  
  const maxChildNumber = Math.max(...childNodes.map(node => {
    const parts = node.wbs_code.split('.');
    return parseInt(parts[parts.length - 1]) || 0;
  }));
  
  return `${parentWbsCode}.${maxChildNumber + 1}`;
};

// ENHANCED DEBUG: Complete generateModernStructure with debugging
export const generateModernStructure = (nodes, subsystemId, subsystem, data) => {
  let categoryCounter = 1;
  
  const orderedCategoryKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];
  
  // ====== CRITICAL DEBUG: Check for T11/T21 in this subsystem ======
  const allSubsystemEquipment = data.filter(item => item.subsystem === subsystem);
  const t11InSubsystem = allSubsystemEquipment.find(item => item.equipmentNumber?.trim() === 'T11');
  const t21InSubsystem = allSubsystemEquipment.find(item => item.equipmentNumber?.trim() === 'T21');
  
  if (t11InSubsystem || t21InSubsystem) {
    console.log(`\n🎯 CRITICAL: Processing subsystem "${subsystem}" - Contains T11/T21`);
    console.log(`📊 Total equipment in subsystem: ${allSubsystemEquipment.length}`);
    
    if (t11InSubsystem) {
      console.log(`📍 T11 Details:`);
      console.log(`   Equipment Number: "${t11InSubsystem.equipmentNumber}"`);
      console.log(`   Parent Equipment Number: "${t11InSubsystem.parentEquipmentNumber}"`);
      console.log(`   Commissioning: "${t11InSubsystem.commissioning}"`);
      console.log(`   Description: "${t11InSubsystem.description}"`);
    }
    if (t21InSubsystem) {
      console.log(`📍 T21 Details:`);
      console.log(`   Equipment Number: "${t21InSubsystem.equipmentNumber}"`);
      console.log(`   Parent Equipment Number: "${t21InSubsystem.parentEquipmentNumber}"`);
      console.log(`   Commissioning: "${t21InSubsystem.commissioning}"`);
      console.log(`   Description: "${t21InSubsystem.description}"`);
    }
  }
  
  orderedCategoryKeys.forEach(number => {
    const name = categoryMapping[number];
    const categoryId = `${subsystemId}.${categoryCounter}`;
    
    // Add category node
    nodes.push({
      wbs_code: categoryId,
      parent_wbs_code: subsystemId,
      wbs_name: `${number} | ${name}`
    });

    // ====== SUPER ENHANCED DEBUG FOR CATEGORY 05 (TRANSFORMERS) ======
    if (number === '05' && (t11InSubsystem || t21InSubsystem)) {
      console.log(`\n🔧 SUPER DEBUG: Category 05 (Transformers) Processing`);
      console.log(`========================================================`);
      
      // Step 1: Get all subsystem equipment with commissioning Y
      const subsystemEquipment = data.filter(item => 
        item.subsystem === subsystem && 
        item.commissioning === 'Y'
      );
      
      console.log(`📦 Subsystem commissioned equipment: ${subsystemEquipment.length} items`);
      
      // Step 2: Find all transformer equipment in subsystem
      const transformerEquipment = subsystemEquipment.filter(item => 
        item.equipmentNumber && item.equipmentNumber.trim().match(/^T\d+$/)
      );
      
      console.log(`🔌 Transformer equipment in subsystem:`);
      transformerEquipment.forEach(item => {
        console.log(`   - ${item.equipmentNumber} (Parent: "${item.parentEquipmentNumber}") - ${item.description}`);
      });
      
      // Step 3: Categorize each transformer
      console.log(`\n🏷️ Categorizing transformers:`);
      transformerEquipment.forEach(item => {
        const category = determineCategoryCode(item, data);
        console.log(`   ${item.equipmentNumber} → Category: ${category}`);
      });
      
      // Step 4: Filter for category 05 specifically
      const categoryEquipment = subsystemEquipment.filter(item => {
        const category = determineCategoryCode(item, data);
        return category === number;
      });
      
      console.log(`\n📋 Equipment in category 05: ${categoryEquipment.length} items`);
      const transformersInCategory = categoryEquipment.filter(item => 
        item.equipmentNumber && item.equipmentNumber.trim().match(/^T\d+$/)
      );
      
      console.log(`🔌 Transformers in category 05:`);
      transformersInCategory.forEach(item => {
        console.log(`   - ${item.equipmentNumber} (Parent: "${item.parentEquipmentNumber}")`);
      });
      
      // Step 5: CRITICAL - Parent-child filtering logic
      console.log(`\n👨‍👦 Parent-Child Filtering Analysis:`);
      console.log(`====================================`);
      
      const parentEquipment = categoryEquipment.filter(item => {
        // Check if this item's parent exists in the SAME category
        const hasParentInCategory = categoryEquipment.some(potentialParent => 
          potentialParent.equipmentNumber?.trim() === item.parentEquipmentNumber?.trim()
        );
        
        const isParent = !hasParentInCategory;
        
        console.log(`🔍 ${item.equipmentNumber}:`);
        console.log(`   Parent Equipment Number: "${item.parentEquipmentNumber}"`);
        console.log(`   Has parent in same category: ${hasParentInCategory}`);
        console.log(`   Will be processed as parent: ${isParent}`);
        
        // CRITICAL: If this is T11 or T21, show detailed analysis
        if (item.equipmentNumber?.trim() === 'T11' || item.equipmentNumber?.trim() === 'T21') {
          console.log(`   🚨 CRITICAL: ${item.equipmentNumber} parent analysis:`);
          
          if (item.parentEquipmentNumber?.trim()) {
            // Check if parent exists in data at all
            const parentExistsInData = data.some(d => 
              d.equipmentNumber?.trim() === item.parentEquipmentNumber?.trim()
            );
            console.log(`   Parent "${item.parentEquipmentNumber}" exists in data: ${parentExistsInData}`);
            
            // Check if parent is in same subsystem
            const parentInSameSubsystem = data.some(d => 
              d.equipmentNumber?.trim() === item.parentEquipmentNumber?.trim() &&
              d.subsystem === subsystem
            );
            console.log(`   Parent in same subsystem: ${parentInSameSubsystem}`);
            
            // Check if parent is commissioned
            const parentCommissioned = data.some(d => 
              d.equipmentNumber?.trim() === item.parentEquipmentNumber?.trim() &&
              d.commissioning === 'Y'
            );
            console.log(`   Parent is commissioned: ${parentCommissioned}`);
            
            // Check if parent would be in category 05
            if (parentExistsInData) {
              const parentItem = data.find(d => 
                d.equipmentNumber?.trim() === item.parentEquipmentNumber?.trim()
              );
              if (parentItem) {
                const parentCategory = determineCategoryCode(parentItem, data);
                console.log(`   Parent would be in category: ${parentCategory}`);
                console.log(`   Parent in same category (05): ${parentCategory === '05'}`);
              }
            }
          } else {
            console.log(`   🚨 ${item.equipmentNumber} has NO parent - should be treated as parent equipment`);
          }
        }
        
        return isParent;
      });
      
      console.log(`\n👨‍👦 Final parent equipment list: ${parentEquipment.length} items`);
      console.log(`🔌 Parent transformers that will be added to WBS:`);
      const parentTransformers = parentEquipment.filter(item => 
        item.equipmentNumber && item.equipmentNumber.trim().match(/^T\d+$/)
      );
      
      parentTransformers.forEach(item => {
        console.log(`   ✅ ${item.equipmentNumber} - ${item.description}`);
      });
      
      const hasT11AsParent = parentTransformers.some(t => t.equipmentNumber?.trim() === 'T11');
      const hasT21AsParent = parentTransformers.some(t => t.equipmentNumber?.trim() === 'T21');
      
      console.log(`\n🎯 FINAL VERDICT:`);
      console.log(`   T11 will be added to WBS: ${hasT11AsParent ? '✅ YES' : '❌ NO'}`);
      console.log(`   T21 will be added to WBS: ${hasT21AsParent ? '✅ YES' : '❌ NO'}`);
      
      // Process parent equipment and add to WBS
      let equipmentCounter = 1;
      parentEquipment.forEach(item => {
        const equipmentId = `${categoryId}.${equipmentCounter}`;
        
        if (item.equipmentNumber?.trim() === 'T11' || item.equipmentNumber?.trim() === 'T21') {
          console.log(`🎉 SUCCESS: Adding ${item.equipmentNumber} to WBS with code ${equipmentId}`);
        }
        
        nodes.push({
          wbs_code: equipmentId,
          parent_wbs_code: categoryId,
          wbs_name: `${item.equipmentNumber} | ${item.description}`
        });

        // Add children recursively
        const addChildrenRecursively = (parentEquipmentNumber, parentWbsCode) => {
          const childEquipment = data.filter(child => 
            child.parentEquipmentNumber?.trim() === parentEquipmentNumber?.trim() && 
            child.commissioning === 'Y'
          );
          
          if (childEquipment.length > 0) {
            console.log(`👶 Adding ${childEquipment.length} children for parent ${parentEquipmentNumber}`);
          }
          
          let childCounter = 1;
          childEquipment.forEach(child => {
            const childId = `${parentWbsCode}.${childCounter}`;
            
            console.log(`👶 Adding child: ${child.equipmentNumber} (${childId})`);
            
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
      
    } else {
      // Standard processing for non-transformer categories or subsystems without T11/T21
      const subsystemEquipment = data.filter(item => 
        item.subsystem === subsystem && 
        item.commissioning === 'Y'
      );

      const categoryEquipment = subsystemEquipment.filter(item => {
        const category = determineCategoryCode(item, data);
        return category === number;
      });
      
      if (categoryEquipment.length > 0) {
        const parentEquipment = categoryEquipment.filter(item => {
          const hasParentInCategory = categoryEquipment.some(potentialParent => 
            potentialParent.equipmentNumber?.trim() === item.parentEquipmentNumber?.trim()
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

          const addChildrenRecursively = (parentEquipmentNumber, parentWbsCode) => {
            const childEquipment = data.filter(child => 
              child.parentEquipmentNumber?.trim() === parentEquipmentNumber?.trim() && 
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
    }

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

    categoryCounter++;
  });
};

// Helper function to validate equipment numbers
export const isValidEquipmentNumber = (equipmentNumber) => {
  if (!equipmentNumber || equipmentNumber.trim().length < 2) return false;
  
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

// Compare equipment lists for missing equipment functionality
export const compareEquipmentLists = (existingEquipment, newEquipmentList) => {
  const existingSet = new Set(existingEquipment);
  const newSet = new Set(newEquipmentList.map(item => item.equipmentNumber));
  
  console.log("🔍 ENHANCED Equipment Comparison Analysis");
  console.log("==========================================");
  console.log(`📋 Existing equipment count: ${existingEquipment.length}`);
  console.log(`📦 New equipment list count: ${newEquipmentList.length}`);
  console.log(`🔢 Unique new equipment numbers: ${newSet.size}`);
  
  // Enhanced debugging
  console.log("\n🔍 Sample existing equipment:");
  existingEquipment.slice(0, 10).forEach(num => console.log(`   ${num}`));
  
  console.log("\n📦 Sample new equipment:");
  newEquipmentList.slice(0, 10).forEach(item => console.log(`   ${item.equipmentNumber} (${item.commissioning})`));
  
  const newEquipment = newEquipmentList.filter(item => !existingSet.has(item.equipmentNumber));
  const existingEquipmentInNew = newEquipmentList.filter(item => existingSet.has(item.equipmentNumber));
  const removedEquipment = existingEquipment.filter(equipNum => !newSet.has(equipNum));
  
  console.log(`\n📊 Results:`);
  console.log(`🆕 New equipment found: ${newEquipment.length}`);
  console.log(`✅ Existing equipment in new list: ${existingEquipmentInNew.length}`);
  console.log(`❌ Removed equipment: ${removedEquipment.length}`);
  
  if (newEquipment.length > 0) {
    console.log(`\n🔍 First 10 'new' equipment items:`);
    newEquipment.slice(0, 10).forEach(item => {
      console.log(`   ${item.equipmentNumber} - ${item.description} (${item.commissioning})`);
    });
  }
  
  return {
    newEquipment,
    existingEquipment: existingEquipmentInNew,
    removedEquipment
  };
};

// FIXED: Missing Equipment WBS Generation function
export const generateMissingEquipmentWBS = (newEquipmentList, existingWbsNodes, existingProjectName) => {
  console.log("🔧 ENHANCED: Missing Equipment WBS Generation Started");
  console.log("=================================================");
  console.log(`📦 New equipment list received: ${newEquipmentList.length} items`);
  
  if (!existingWbsNodes || existingWbsNodes.length === 0) {
    console.log("❌ No existing WBS structure provided");
    throw new Error('No existing WBS structure provided');
  }

  console.log(`🏗️ Existing WBS nodes: ${existingWbsNodes.length} nodes`);

  // STEP 1: CRITICAL - Filter by commissioning status FIRST
  const commissionedEquipment = newEquipmentList.filter(item => {
    const isCommissioned = item.commissioning === 'Y' || item.commissioning === 'TBC';
    const hasValidEquipmentNumber = isValidEquipmentNumber(item.equipmentNumber);
    
    if (!isCommissioned) {
      console.log(`🚫 Excluded (N): ${item.equipmentNumber} - ${item.description}`);
      return false;
    }
    
    if (!hasValidEquipmentNumber) {
      console.log(`🚫 Invalid equipment number: ${item.equipmentNumber}`);
      return false;
    }
    
    return true;
  });
  
  console.log(`✅ After commissioning filter: ${commissionedEquipment.length} items (from ${newEquipmentList.length} total)`);
  console.log(`   - Commissioned (Y): ${commissionedEquipment.filter(item => item.commissioning === 'Y').length}`);
  console.log(`   - TBC: ${commissionedEquipment.filter(item => item.commissioning === 'TBC').length}`);

  // STEP 2: Extract existing equipment from WBS structure
  const { equipmentNumbers: existingEquipmentNumbers, existingSubsystems } = extractEquipmentNumbers(existingWbsNodes);
  
  console.log(`🔢 Extracted equipment numbers from WBS: ${existingEquipmentNumbers.length}`);
  console.log(`📍 Found existing subsystems: ${existingSubsystems.size}`);
  
  // STEP 3: Find genuinely missing equipment
  const existingEquipmentSet = new Set(existingEquipmentNumbers);
  const missingEquipment = commissionedEquipment.filter(item => {
    const equipmentNumber = item.equipmentNumber?.trim();
    const exists = existingEquipmentSet.has(equipmentNumber);
    
    // Enhanced debugging for T11 and T21
    if (equipmentNumber === 'T11' || equipmentNumber === 'T21') {
      console.log(`🔍 DEBUG ${equipmentNumber}:`);
      console.log(`   Equipment Number: "${equipmentNumber}"`);
      console.log(`   Exists in extracted list: ${exists}`);
      console.log(`   Commissioning: ${item.commissioning}`);
      console.log(`   Subsystem: ${item.subsystem}`);
    }
    
    return !exists; // Return true if equipment is missing
  });
  
  const analysis = compareEquipmentLists(existingEquipmentNumbers, commissionedEquipment);
  
  console.log(`\n🎯 FINAL ANALYSIS:`);
  console.log(`   - Existing equipment: ${existingEquipmentNumbers.length}`);
  console.log(`   - Valid new equipment: ${commissionedEquipment.length}`);
  console.log(`   - Missing equipment: ${missingEquipment.length}`);
  
  if (missingEquipment.length === 0) {
    console.log("✅ SUCCESS: No missing equipment found - all commissioned/TBC equipment exists in WBS structure");
    return {
      allNodes: existingWbsNodes.map(node => ({ ...node, isExisting: true })),
      newNodes: [],
      analysis: {
        newEquipment: [],
        existingEquipment: analysis.existingEquipment,
        removedEquipment: analysis.removedEquipment
      },
      projectName: existingProjectName
    };
  }

  console.log("🏗️ Building new WBS nodes for missing equipment...");
  
  const allNodes = [];
  const newNodes = [];
  
  // Add all existing nodes to visualization
  existingWbsNodes.forEach(node => {
    allNodes.push({
      ...node,
      isExisting: true
    });
  });
  
  // Process missing equipment by commissioning status
  const missingCommissioned = missingEquipment.filter(item => item.commissioning === 'Y');
  const missingTBC = missingEquipment.filter(item => item.commissioning === 'TBC');
  
  console.log(`✅ Missing commissioned equipment: ${missingCommissioned.length}`);
  console.log(`⏳ Missing TBC equipment: ${missingTBC.length}`);
  
  // Add missing commissioned equipment to appropriate subsystems
  let newNodeCounter = Math.max(...allNodes.map(n => {
    const parts = n.wbs_code.split('.');
    return parseInt(parts[parts.length - 1]) || 0;
  })) + 1;
  
  missingCommissioned.forEach(item => {
    // Find subsystem match
    let subsystemWbsCode = null;
    for (const [subsystemName, wbsCode] of existingSubsystems) {
      if (subsystemName.includes(item.subsystem) || item.subsystem.includes(subsystemName)) {
        subsystemWbsCode = wbsCode;
        break;
      }
    }
    
    if (subsystemWbsCode) {
      // Determine category for this equipment
      const category = determineCategoryCode(item, missingEquipment);
      
      if (category === 'TBC') {
        // This should not happen for commissioned equipment, but handle it
        console.log(`⚠️ Commissioned equipment ${item.equipmentNumber} returned TBC category - treating as 99`);
        category = '99';
      }
      
      // Find or create the appropriate category within subsystem
      let targetCategory = allNodes.find(n => 
        n.parent_wbs_code === subsystemWbsCode && 
        n.wbs_name.includes(`${category} |`)
      );
      
      if (!targetCategory) {
        // Create category if it doesn't exist
        const categoryId = `${subsystemWbsCode}.${newNodeCounter++}`;
        const categoryName = categoryMapping[category] || 'Unknown Category';
        targetCategory = {
          wbs_code: categoryId,
          parent_wbs_code: subsystemWbsCode,
          wbs_name: `${category} | ${categoryName}`,
          isNew: true
        };
        allNodes.push(targetCategory);
        newNodes.push(targetCategory);
      }
      
      // Add equipment to category
      const equipmentId = `${targetCategory.wbs_code}.${newNodeCounter++}`;
      const equipmentNode = {
        wbs_code: equipmentId,
        parent_wbs_code: targetCategory.wbs_code,
        wbs_name: `${item.equipmentNumber} | ${item.description}`,
        isNew: true
      };
      
      allNodes.push(equipmentNode);
      newNodes.push(equipmentNode);
      
      // Handle child equipment
      const childEquipment = missingEquipment.filter(child => 
        child.parentEquipmentNumber === item.equipmentNumber && 
        child.commissioning === 'Y'
      );
      
      let childCounter = 1;
      childEquipment.forEach(child => {
        const childWbsCode = `${equipmentId}.${childCounter}`;
        const childNode = {
          wbs_code: childWbsCode,
          parent_wbs_code: equipmentId,
          wbs_name: `${child.equipmentNumber} | ${child.description}`,
          isNew: true
        };
        
        allNodes.push(childNode);
        newNodes.push(childNode);
        childCounter++;
      });
    }
  });
  
  // Handle new TBC equipment
  if (missingTBC.length > 0) {
    console.log(`⏳ Processing ${missingTBC.length} TBC equipment items`);
    
    let tbcNode = allNodes.find(node => 
      node.wbs_name.includes('TBC - Equipment To Be Confirmed')
    );
    
    if (!tbcNode) {
      const projectNode = allNodes.find(node => node.parent_wbs_code === null);
      const nextSubsystemCode = findNextWBSCode(projectNode.wbs_code, allNodes);
      
      tbcNode = {
        wbs_code: nextSubsystemCode,
        parent_wbs_code: projectNode.wbs_code,
        wbs_name: "TBC - Equipment To Be Confirmed",
        isNew: true
      };
      
      allNodes.push(tbcNode);
      newNodes.push(tbcNode);
    }
    
    missingTBC.forEach(item => {
      const tbcItemCode = findNextWBSCode(tbcNode.wbs_code, allNodes);
      const tbcItemNode = {
        wbs_code: tbcItemCode,
        parent_wbs_code: tbcNode.wbs_code,
        wbs_name: `${item.equipmentNumber} | ${item.description}`,
        isNew: true
      };
      
      allNodes.push(tbcItemNode);
      newNodes.push(tbcItemNode);
    });
  }
  
  console.log(`\n🎯 Final results:`);
  console.log(`   New WBS nodes created: ${newNodes.length}`);
  console.log(`   Complete visualization nodes: ${allNodes.length}`);
  console.log("✅ Missing equipment WBS generation complete");
  
  return {
    allNodes,
    newNodes,
    analysis: {
      newEquipment: missingEquipment,
      existingEquipment: analysis.existingEquipment,
      removedEquipment: analysis.removedEquipment
    },
    projectName: existingProjectName
  };
};

// Main WBS generation function with proper TBC handling
export const generateWBS = (data, projectName, projectState, uploadMode) => {
  console.log(`🚀 ENHANCED WBS Generation - Mode: ${uploadMode}`);
  console.log(`📦 Equipment data: ${data.length} items`);
  
  const allNodes = [];
  const newNodes = [];
  let subsystemCounter = projectState?.lastWbsCode ? projectState.lastWbsCode : 3;
  let tbcCounter = 1;

  const existingSubsystemCount = projectState?.subsystems?.length || 0;

  // Add project root
  const projectId = "1";
  allNodes.push({
    wbs_code: projectId,
    parent_wbs_code: null,
    wbs_name: projectName
  });

  // Add milestones
  const milestonesId = "1.1";
  allNodes.push({
    wbs_code: milestonesId,
    parent_wbs_code: projectId,
    wbs_name: "M | Milestones"
  });

  // Add prerequisites
  const prerequisitesId = "1.2";
  allNodes.push({
    wbs_code: prerequisitesId,
    parent_wbs_code: projectId,
    wbs_name: "P | Pre-requisites"
  });

  // Add existing nodes if continuing project
  if (projectState?.wbsNodes && projectState.wbsNodes.length > 0) {
    const existingNodes = projectState.wbsNodes.filter(node => 
      node.wbs_code !== "1" && 
      node.wbs_code !== "1.1" && 
      node.wbs_code !== "1.2" &&
      !node.wbs_name.includes("TBC - Equipment To Be Confirmed")
    );
    
    existingNodes.forEach(node => {
      if (!allNodes.some(existing => existing.wbs_code === node.wbs_code)) {
        allNodes.push({
          ...node,
          isExisting: true
        });
      }
    });
  }

  // Process subsystems - ONLY for commissioned equipment
  const rawSubsystems = [...new Set(data.filter(item => item.commissioning === 'Y').map(item => item.subsystem))];
  
  const subsystems = rawSubsystems.sort((a, b) => {
    const aFormatted = formatSubsystemName(a);
    const bFormatted = formatSubsystemName(b);
    
    const aIsSubstation = a.toLowerCase().includes('substation');
    const bIsSubstation = b.toLowerCase().includes('substation');
    
    if (aIsSubstation && !bIsSubstation) return 1;
    if (!aIsSubstation && bIsSubstation) return -1;
    if (aIsSubstation && bIsSubstation) return 0;
    
    const aZMatch = aFormatted.match(/Z(\d+)/);
    const bZMatch = bFormatted.match(/Z(\d+)/);
    
    if (aZMatch && bZMatch) {
      const aZNum = parseInt(aZMatch[1]);
      const bZNum = parseInt(bZMatch[1]);
      return aZNum - bZNum;
    }
    
    return aFormatted.localeCompare(bFormatted);
  });
  
  console.log(`📂 Processing ${subsystems.length} subsystems`);
  
  subsystems.forEach((subsystem, index) => {
    const formattedSubsystemName = formatSubsystemName(subsystem);
    const subsystemId = `1.${subsystemCounter}`;
    const subsystemLabel = `S${existingSubsystemCount + index + 1} | ${formattedSubsystemName}`;
    
    const subsystemNode = {
      wbs_code: subsystemId,
      parent_wbs_code: "1",
      wbs_name: subsystemLabel,
      ...(uploadMode === 'continue' && { isNew: true })
    };
    
    allNodes.push(subsystemNode);
    newNodes.push({
      wbs_code: subsystemId,
      parent_wbs_code: "1",
      wbs_name: subsystemLabel
    });

    // Add prerequisite
    const prerequisiteId = `1.2.${existingSubsystemCount + index + 1}`;
    const prerequisiteNode = {
      wbs_code: prerequisiteId,
      parent_wbs_code: "1.2",
      wbs_name: formattedSubsystemName,
      ...(uploadMode === 'continue' && { isNew: true })
    };
    
    allNodes.push(prerequisiteNode);
    newNodes.push({
      wbs_code: prerequisiteId,
      parent_wbs_code: "1.2",
      wbs_name: formattedSubsystemName
    });

    // Generate subsystem structure
    const subsystemStructure = [];
    generateModernStructure(subsystemStructure, subsystemId, subsystem, data);
    
    subsystemStructure.forEach(node => {
      allNodes.push({
        ...node,
        ...(uploadMode === 'continue' && { isNew: true })
      });
      newNodes.push(node);
    });
    
    subsystemCounter++;
  });

  // Handle TBC equipment properly
  const tbcEquipment = data.filter(item => item.commissioning === 'TBC');
  if (tbcEquipment.length > 0) {
    console.log(`⏳ Processing ${tbcEquipment.length} TBC equipment items`);
    
    const tbcId = `1.${subsystemCounter}`;
    const tbcNode = {
      wbs_code: tbcId,
      parent_wbs_code: "1",
      wbs_name: "TBC - Equipment To Be Confirmed",
      ...(uploadMode === 'continue' && { isNew: true })
    };
    
    allNodes.push(tbcNode);
    newNodes.push({
      wbs_code: tbcId,
      parent_wbs_code: "1",
      wbs_name: "TBC - Equipment To Be Confirmed"
    });

    tbcEquipment.forEach(item => {
      const tbcItemNode = {
        wbs_code: `${tbcId}.${tbcCounter}`,
        parent_wbs_code: tbcId,
        wbs_name: `${item.equipmentNumber} | ${item.description}`,
        ...(uploadMode === 'continue' && { isNew: true })
      };
      
      allNodes.push(tbcItemNode);
      newNodes.push({
        wbs_code: `${tbcId}.${tbcCounter}`,
        parent_wbs_code: tbcId,
        wbs_name: `${item.equipmentNumber} | ${item.description}`
      });
      tbcCounter++;
    });
  }

  console.log(`✅ WBS Generation Complete:`);
  console.log(`   Total nodes: ${allNodes.length}`);
  console.log(`   New nodes: ${newNodes.length}`);
  console.log(`   Commissioned equipment: ${data.filter(item => item.commissioning === 'Y').length}`);
  console.log(`   TBC equipment: ${tbcEquipment.length}`);
  console.log(`   Excluded (N): ${data.filter(item => item.commissioning === 'N').length}`);

  return {
    allNodes,
    newNodes,
    projectState: {
      projectName,
      lastWbsCode: subsystemCounter,
      subsystems: [...(projectState?.subsystems || []), ...subsystems.map(formatSubsystemName)],
      wbsNodes: allNodes,
      timestamp: new Date().toISOString()
    }
  };
};
