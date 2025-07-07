const generateModernStructure = (nodes, subsystemId, subsystem, data, startCounter) => {
    let wbsCounter = startCounter;

    Object.entries(categoryMapping).forEach(([number, name]) => {
      const categoryId = wbsCounter++;
      nodes.push({
        wbs_code: categoryId,
        parent_wbs_code: subsystemId,
        wbs_name: `${number} | ${name}`
      });

      // Special handling for 01 | Preparations and set-up - always create these 3 items
      if (number === '01') {
        ['Test bay', 'Panel Shop', 'Pad'].forEach(item => {
          nodes.push({
            wbs_code: wbsCounter++,
            parent_wbs_code: categoryId,
            wbs_name: item
          });
        });
      }

      let equipmentPatterns = [];
      switch (number) {
        case '01': equipmentPatterns = []; break; // Handled above
        case '02': equipmentPatterns = ['+UH', 'UH', '-F', 'F', 'MP', 'P', 'CT', 'VT', 'MR', 'HMI', 'KF', 'Y']; break;
        case '03': equipmentPatterns = ['+WA', 'WA', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW']; break;
        case '04': equipmentPatterns = ['+WC', 'WC', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K']; break;
        case '05': equipmentPatterns = ['T', 'NET', 'TA', 'NER']; break;
        case '06': equipmentPatterns = ['+GB', 'GB', 'BCR', 'BAN', 'UPS']; break;
        case '07': equipmentPatterns = ['E', 'EB', 'EEP', 'MEB']; break;
        case '08': equipmentPatterns = ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA']; break;
        case '09': equipmentPatterns = ['Interface', 'Testing']; break;
        case '10': equipmentPatterns = ['+CA', 'CA', 'PSU', 'UPS', 'ATS', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD']; break;
      }

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

        subsystemEquipment.forEach(item => {
          const equipmentId = wbsCounter++;
          nodes.push({
            wbs_code: equipmentId,
            parent_wbs_code: categoryId,
            wbs_name: `${item.equipmentNumber} | ${item.description}`
          });

          const childEquipment = data.filter(child => 
            child.parentEquipmentNumber === item.equipmentNumber && 
            child.commissioning === 'Y'
          );
          childEquipment.forEach(child => {
            nodes.push({
              wbs_code: wbsCounter++,
              parent_wbs_code: equipmentId,
              wbs_name: `${child.equipmentNumber} | ${child.description}`
            });
          });
        });
      }

      if (number === '09') {
        ['Phase 1', 'Phase 2'].forEach(phase => {
          nodes.push({
            wbs_code: wbsCounter++,
            parent_wbs_code: categoryId,
            wbs_name: phase
          });
        });
      }
    });

    return wbsCounter;
  };
