if (equipmentPatterns.length > 0) {
        const subsystemEquipment = data.filter(item => 
          item.subsystem === subsystem && 
          item.commissioning === 'Y' && 
          (equipmentPatterns.length === 0 || 
           equipmentPatterns.some(pattern => 
             item.equipmentNumber.toUpperCase().startsWith(pattern.toUpperCase()) ||
             item.equipmentNumber.toUpperCase().includes(pattern.toUpperCase()) ||
             (item.plu && item.plu.toUpperCase().includes(pattern.toUpperCase()))
           ))
        );

        if (number === '99') {
          const allOtherPatterns = [
            'Test', 'Panel Shop', 'Pad',
            '+UH', 'UH', '-F', 'F', 'MP', 'P', 'CT', 'VT', 'MR', 'HMI', 'KF', 'Y',
            '+WA', 'WA', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW',
            '+WC', 'WC', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K',
            'T', 'NET', 'TA', 'NER',
            '+GB', 'GB', 'BCR', 'BAN', 'UPS',
            'E', 'EB', 'EEP', 'MEB',
            '+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA',
            'Interface', 'Testing',
            '+CA', 'CA', 'PSU', 'UPS', 'ATS', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD'
          ];

          const unrecognisedEquipment = data.filter(item => 
            item.subsystem === subsystem && 
            item.commissioning === 'Y' && 
            !allOtherPatterns.some(pattern => 
              item.equipmentNumber.toUpperCase().startsWith(pattern.toUpperCase()) ||
              item.equipmentNumber.toUpperCase().includes(pattern.toUpperCase()) ||
              (item.plu && item.plu.toUpperCase().includes(pattern.toUpperCase()))
            )
          );

          subsystemEquipment.push(...unrecognisedEquipment);
        }

        // 🔧 FIX: Only add equipment as top-level items if they don't have a parent in the same category
        const parentEquipment = subsystemEquipment.filter(item => {
          // Check if this item has a parent that's also in the same category
          const hasParentInCategory = subsystemEquipment.some(potentialParent => 
            potentialParent.equipmentNumber === item.parentEquipmentNumber
          );
          return !hasParentInCategory; // Only include items that don't have a parent in this category
        });

        // Add parent equipment as top-level items in the category
        parentEquipment.forEach(item => {
          const equipmentId = wbsCounter++;
          nodes.push({
            wbs_code: equipmentId,
            parent_wbs_code: categoryId,
            wbs_name: `${item.equipmentNumber} - ${item.description}`
          });

          // Recursively add all child equipment under this parent
          const addChildrenRecursively = (parentEquipmentNumber, parentWbsCode) => {
            const childEquipment = data.filter(child => 
              child.parentEquipmentNumber === parentEquipmentNumber && 
              child.commissioning === 'Y'
            );
            
            childEquipment.forEach(child => {
              const childId = wbsCounter++;
              nodes.push({
                wbs_code: childId,
                parent_wbs_code: parentWbsCode,
                wbs_name: `${child.equipmentNumber} - ${child.description}`
              });
              
              // Recursively add children of this child (multi-level hierarchy)
              addChildrenRecursively(child.equipmentNumber, childId);
            });
          };

          // Add all children of this parent equipment
          addChildrenRecursively(item.equipmentNumber, equipmentId);
        });
      }
