import React, { useState, useRef, createContext, useContext } from 'react';
import { Upload, Download, Settings, Plus, FileText, Zap, ChevronRight, ChevronDown, Eye, EyeOff, Info } from 'lucide-react';

// RJE Brand Colors
const rjeColors = {
  lightGreen: '#B8D582',
  mediumGreen: '#7DB544',
  darkGreen: '#4A9B4B',
  teal: '#2E8B7A',
  blue: '#1E7FC2',
  darkBlue: '#0F5A8F'
};

// Context for project state management
const ProjectContext = createContext({
  projectState: null,
  setProjectState: () => {}
});

// Main App Component
const WBSGeneratorApp = () => {
  const [projectState, setProjectState] = useState(null);

  return (
    <ProjectContext.Provider value={{ projectState, setProjectState }}>
      <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${rjeColors.lightGreen}, ${rjeColors.blue})` }}>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div 
            className="rounded-2xl shadow-2xl mb-8 text-white"
            style={{ background: `linear-gradient(135deg, ${rjeColors.darkBlue}, ${rjeColors.teal})` }}
          >
            <div className="p-8 text-center">
              <h1 className="text-4xl font-bold mb-4">WBS Generator v2.0</h1>
              <p className="text-xl opacity-90">Advanced Work Breakdown Structure Generation</p>
              <p className="text-sm mt-2 opacity-75">Modern Architecture (v4.0) - Production Ready</p>
            </div>
          </div>

          {/* Main Generator Interface */}
          <WBSGenerator />
        </div>
      </div>
    </ProjectContext.Provider>
  );
};

// Main WBS Generator Component
const WBSGenerator = () => {
  const { projectState, setProjectState } = useContext(ProjectContext);
  const [uploadMode, setUploadMode] = useState('new');
  const [equipmentData, setEquipmentData] = useState([]);
  const [wbsOutput, setWbsOutput] = useState([]); // For export (new items only)
  const [wbsVisualization, setWbsVisualization] = useState([]); // For visualization (complete structure)
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectName, setProjectName] = useState('Sample Project');
  const [missingEquipmentConfig, setMissingEquipmentConfig] = useState({
    parentWbsCode: '',
    startingWbsCode: ''
  });
  const fileInputRef = useRef(null);
  const projectStateInputRef = useRef(null);

  const categoryMapping = {
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

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      let equipmentList = [];
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Handle Excel files
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
      
      console.log(`Loaded ${equipmentList.length} equipment items`);
      
      if (equipmentList.length === 0) {
        alert('No valid equipment found. Please ensure your file contains the required columns: Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)');
        return;
      }
      
      setEquipmentData(equipmentList);
      generateWBS(equipmentList);
      
    } catch (error) {
      console.error('File processing error:', error);
      alert('Error processing file. Please ensure the file contains the required columns: Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProjectStateUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let wbsData = [];
      let projectName = 'Continued Project';
      let lastWbsCode = 3;
      let subsystems = [];

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

      // Find root node for project name
      const rootNode = wbsData.find(node => node.parent_wbs_code === null || node.parent_wbs_code === '');
      if (rootNode) {
        projectName = rootNode.wbs_name;
      }

      // Find the highest subsystem number to continue from
      const subsystemNodes = wbsData.filter(node => 
        node.wbs_code.startsWith('1.') && 
        node.wbs_code.split('.').length === 2 &&
        node.wbs_name.startsWith('S')
      );
      
      if (subsystemNodes.length > 0) {
        const subsystemNumbers = subsystemNodes.map(node => 
          parseInt(node.wbs_code.split('.')[1])
        );
        lastWbsCode = Math.max(...subsystemNumbers) + 1;
      }

      // Extract existing subsystems
      subsystems = wbsData
        .filter(node => node.wbs_name.startsWith('S') && node.wbs_name.includes('|'))
        .map(node => node.wbs_name.split('|')[1]?.trim() || '')
        .filter(name => name);

      const loadedState = {
        projectName,
        lastWbsCode,
        subsystems,
        wbsNodes: wbsData,
        timestamp: new Date().toISOString()
      };

      setProjectState(loadedState);
      setProjectName(loadedState.projectName);
      
      // Set visualization to show existing structure
      setWbsVisualization(loadedState.wbsNodes);
      
      // Clear export output until new equipment is added
      setWbsOutput([]);
      
    } catch (error) {
      console.error('Project state loading error:', error);
      alert('Error loading project state file. Please ensure the file has columns: wbs_code, parent_wbs_code, wbs_name');
    }
  };

  const generateWBS = (data) => {
    const allNodes = []; // For complete structure (preview)
    const newNodes = []; // For export (new items only)
    let subsystemCounter = projectState?.lastWbsCode ? projectState.lastWbsCode : 3;
    let tbcCounter = 1;

    // Calculate how many subsystems already exist (for proper S-numbering)
    const existingSubsystemCount = projectState?.subsystems?.length || 0;

    // Always create the base structure first
    const projectId = "1";
    allNodes.push({
      wbs_code: projectId,
      parent_wbs_code: null,
      wbs_name: projectName,
      isExisting: !projectState // Mark as existing if continuing project
    });

    // M | Milestones
    const milestonesId = "1.1";
    allNodes.push({
      wbs_code: milestonesId,
      parent_wbs_code: projectId,
      wbs_name: "M | Milestones",
      isExisting: !projectState
    });

    // P | Pre-requisites
    const prerequisitesId = "1.2";
    allNodes.push({
      wbs_code: prerequisitesId,
      parent_wbs_code: projectId,
      wbs_name: "P | Pre-requisites",
      isExisting: !projectState
    });

    // If continuing a project, add existing subsystem nodes (for preview only)
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
            isExisting: true // Mark as existing for preview
          });
        }
      });
    }

    // Process subsystems with Z-code ordering
    const rawSubsystems = [...new Set(data.filter(item => item.commissioning === 'Y').map(item => item.subsystem))];
    
    // Function to extract Z-code from subsystem name and format it properly
    const formatSubsystemName = (subsystem) => {
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
    
    // Sort subsystems by Z-code with Substation always last
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
    
    // Add new subsystems
    subsystems.forEach((subsystem, index) => {
      const formattedSubsystemName = formatSubsystemName(subsystem);
      const subsystemId = `1.${subsystemCounter}`;
      const subsystemLabel = `S${existingSubsystemCount + index + 1} | ${formattedSubsystemName}`;
      
      const subsystemNode = {
        wbs_code: subsystemId,
        parent_wbs_code: "1",
        wbs_name: subsystemLabel,
        isNew: true
      };
      
      allNodes.push(subsystemNode);
      newNodes.push({
        wbs_code: subsystemId,
        parent_wbs_code: "1",
        wbs_name: subsystemLabel
      });

      // Add to prerequisites
      const prerequisiteId = `1.2.${existingSubsystemCount + index + 1}`;
      const prerequisiteNode = {
        wbs_code: prerequisiteId,
        parent_wbs_code: "1.2",
        wbs_name: formattedSubsystemName,
        isNew: true
      };
      
      allNodes.push(prerequisiteNode);
      newNodes.push({
        wbs_code: prerequisiteId,
        parent_wbs_code: "1.2",
        wbs_name: formattedSubsystemName
      });

      // Generate structure for this subsystem
      const subsystemStructure = [];
      generateModernStructure(subsystemStructure, subsystemId, subsystem, data);
      
      // Add to both complete and new nodes
      subsystemStructure.forEach(node => {
        allNodes.push({
          ...node,
          isNew: true
        });
        newNodes.push(node);
      });
      
      subsystemCounter++;
    });

    // Handle TBC equipment
    const tbcEquipment = data.filter(item => item.commissioning === 'TBC');
    if (tbcEquipment.length > 0) {
      const tbcId = `1.${subsystemCounter}`;
      const tbcNode = {
        wbs_code: tbcId,
        parent_wbs_code: "1",
        wbs_name: "TBC - Equipment To Be Confirmed",
        isNew: true
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
          isNew: true
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

    // Validate the complete structure
    const isValidP6Structure = validateP6Structure(allNodes);
    if (!isValidP6Structure) {
      console.warn('WBS structure may have P6 import issues');
    }

    // Set output to NEW nodes only for export
    setWbsOutput(newNodes);
    
    // Set visualization to COMPLETE structure for preview
    setWbsVisualization(allNodes);
    
    const newProjectState = {
      projectName,
      lastWbsCode: subsystemCounter,
      subsystems: [...(projectState?.subsystems || []), ...subsystems.map(formatSubsystemName)],
      wbsNodes: allNodes, // Store complete structure for future continues
      timestamp: new Date().toISOString()
    };
    
    setProjectState(newProjectState);
  };

  const validateP6Structure = (nodes) => {
    const rootNodes = nodes.filter(n => n.parent_wbs_code === null || n.parent_wbs_code === '');
    if (rootNodes.length !== 1) {
      console.warn(`P6 Warning: Expected 1 root node, found: ${rootNodes.length}`);
      return false;
    }

    const codeSet = new Set(nodes.map(n => n.wbs_code));
    for (const node of nodes) {
      if (node.parent_wbs_code !== null && node.parent_wbs_code !== '' && !codeSet.has(node.parent_wbs_code)) {
        console.warn(`P6 Warning: Parent WBS code ${node.parent_wbs_code} not found for node ${node.wbs_code}`);
        return false;
      }
    }

    return true;
  };

  const generateModernStructure = (nodes, subsystemId, subsystem, data) => {
    let categoryCounter = 1;
    
    // Process categories in proper sequential order: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 99
    const orderedCategoryKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '99'];
    
    orderedCategoryKeys.forEach(number => {
      const name = categoryMapping[number];
      const categoryId = `${subsystemId}.${categoryCounter}`;
      nodes.push({
        wbs_code: categoryId,
        parent_wbs_code: subsystemId,
        wbs_name: `${number} | ${name}`
      });

      // Special handling for 01 | Preparations and set-up - always create these 3 items
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

      let equipmentPatterns = [];
      switch (number) {
        case '01': equipmentPatterns = []; break; // Handled above
        case '02': equipmentPatterns = ['+UH', 'UH']; break;
        case '03': equipmentPatterns = ['+WA', 'WA']; break;
        case '04': equipmentPatterns = ['+WC', 'WC']; break;
        case '05': equipmentPatterns = ['T', 'NET', 'TA', 'NER']; break;
        case '06': equipmentPatterns = ['+GB', 'GB', 'BAN']; break;
        case '07': equipmentPatterns = ['E', 'EB', 'EEP', 'MEB']; break;
        case '08': equipmentPatterns = ['+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS']; break;
        case '09': equipmentPatterns = ['Interface', 'Testing']; break;
        case '10': equipmentPatterns = ['+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K']; break;
      }

      if (equipmentPatterns.length > 0) {
        const subsystemEquipment = data.filter(item => 
          item.subsystem === subsystem && 
          item.commissioning === 'Y' && 
          (equipmentPatterns.length === 0 || 
           equipmentPatterns.some(pattern => {
             const equipmentUpper = item.equipmentNumber.toUpperCase();
             const patternUpper = pattern.toUpperCase();
             
             // Special handling for earthing equipment (category 07)
             if (number === '07') {
               if (pattern === 'E' && equipmentUpper.startsWith('E') && 
                   !equipmentUpper.startsWith('+') && !equipmentUpper.startsWith('EB') && 
                   !equipmentUpper.startsWith('EEP') && !equipmentUpper.startsWith('ESS')) {
                 const charAfterE = equipmentUpper.charAt(1);
                 return charAfterE >= '0' && charAfterE <= '9';
               }
               if (pattern === 'EB' && equipmentUpper.startsWith('EB')) {
                 const charAfterEB = equipmentUpper.charAt(2);
                 return charAfterEB >= '0' && charAfterEB <= '9';
               }
               if (pattern === 'EEP' && equipmentUpper.startsWith('EEP')) {
                 const charAfterEEP = equipmentUpper.charAt(3);
                 return charAfterEEP >= '0' && charAfterEEP <= '9';
               }
               if (pattern === 'MEB') {
                 return equipmentUpper.startsWith('MEB');
               }
               return false;
             }
             
             if (pattern.startsWith('+')) {
               return equipmentUpper.startsWith(patternUpper);
             }
             else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS') {
               return equipmentUpper.startsWith(patternUpper) && 
                      !equipmentUpper.startsWith('+');
             }
             else {
               return equipmentUpper.includes(patternUpper) || 
                      (item.plu && item.plu.toUpperCase().includes(patternUpper));
             }
           }))
        );

        if (number === '99') {
          const allOtherPatterns = [
            '+UH', 'UH',
            '+WA', 'WA',
            '+WC', 'WC',
            'T', 'NET', 'TA', 'NER',
            '+GB', 'GB', 'BAN',
            'E', 'EB', 'EEP', 'MEB',
            '+HN', 'HN', 'PC', 'FM', 'FIP', 'LT', 'LTP', 'LCT', 'GPO', 'VDO', 'ACS', 'ACR', 'CTV', 'HRN', 'EHT', 'HTP', 'MCP', 'DET', 'ASD', 'IND', 'BEA', 'Fire', 'ESS',
            'Interface', 'Testing',
            '+CA', 'CA', 'PSU', 'UPS', 'BCR', 'G', 'BSG', 'GTG', 'GT', 'GC', 'WTG', 'SVC', 'HFT', 'RA', 'R', 'FC', 'CP', 'LCS', 'IOP', 'ITP', 'IJB', 'CPU', 'X', 'XB', 'XD', 'H', 'D', 'CB', 'GCB', 'SA', 'LSW', 'MCC', 'DOL', 'VFD', 'ATS', 'MTS', 'Q', 'K'
          ];

          const unrecognisedEquipment = data.filter(item => 
            item.subsystem === subsystem && 
            item.commissioning === 'Y' && 
            !allOtherPatterns.some(pattern => {
              const equipmentUpper = item.equipmentNumber.toUpperCase();
              const patternUpper = pattern.toUpperCase();
              
              if (pattern === 'E' && equipmentUpper.startsWith('E') && 
                  !equipmentUpper.startsWith('+') && !equipmentUpper.startsWith('EB') && 
                  !equipmentUpper.startsWith('EEP') && !equipmentUpper.startsWith('ESS')) {
                const charAfterE = equipmentUpper.charAt(1);
                return charAfterE >= '0' && charAfterE <= '9';
              }
              if (pattern === 'EB' && equipmentUpper.startsWith('EB')) {
                const charAfterEB = equipmentUpper.charAt(2);
                return charAfterEB >= '0' && charAfterEB <= '9';
              }
              if (pattern === 'EEP' && equipmentUpper.startsWith('EEP')) {
                const charAfterEEP = equipmentUpper.charAt(3);
                return charAfterEEP >= '0' && charAfterEEP <= '9';
              }
              
              if (pattern.startsWith('+')) {
                return equipmentUpper.startsWith(patternUpper);
              }
              else if (pattern.length <= 3 && pattern !== 'Fire' && pattern !== 'ESS') {
                return equipmentUpper.startsWith(patternUpper) && 
                       !equipmentUpper.startsWith('+');
              }
              else {
                return equipmentUpper.includes(patternUpper) || 
                       (item.plu && item.plu.toUpperCase().includes(patternUpper));
              }
            })
          );

          subsystemEquipment.push(...unrecognisedEquipment);
        }

        const parentEquipment = subsystemEquipment.filter(item => {
          const hasParentInCategory = subsystemEquipment.some(potentialParent => 
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

  const exportProjectState = () => {
    if (!projectState) return;
    
    const dataStr = JSON.stringify(projectState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectState.projectName}_project_state.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const exportWBSCSV = () => {
    if (wbsOutput.length === 0) return;

    const csvContent = [
      'wbs_code,parent_wbs_code,wbs_name',
      ...wbsOutput.map(node => 
        `"${node.wbs_code}","${node.parent_wbs_code || ''}","${node.wbs_name}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}_WBS_P6_Import.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const exportCompleteWBSCSV = () => {
    if (wbsVisualization.length === 0) return;

    const csvContent = [
      'wbs_code,parent_wbs_code,wbs_name',
      ...wbsVisualization.map(node => 
        `"${node.wbs_code}","${node.parent_wbs_code || ''}","${node.wbs_name}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}_Complete_WBS_Structure.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
          Choose Your Workflow
        </h2>
        
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
          <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
            📋 Important Notes:
          </h4>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>• Only equipment with <strong>Commissioning = "Y"</strong> will be included in WBS output</li>
            <li>• Equipment with <strong>Commissioning = "TBC"</strong> will be placed in separate TBC section</li>
            <li>• Equipment with <strong>Commissioning = "N"</strong> will be ignored</li>
            <li>• <strong>Required columns:</strong> Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)</li>
            <li>• Equipment categorization uses comprehensive equipment key with 100+ equipment codes</li>
          </ul>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setUploadMode('new')}
            className={`p-6 rounded-lg border-2 transition-all ${
              uploadMode === 'new' ? 'border-opacity-100 shadow-lg' : 'border-opacity-30 hover:border-opacity-60'
            }`}
            style={{ 
              borderColor: rjeColors.mediumGreen,
              backgroundColor: uploadMode === 'new' ? `${rjeColors.mediumGreen}20` : 'white'
            }}
          >
            <Zap className="w-8 h-8 mx-auto mb-3" style={{ color: rjeColors.mediumGreen }} />
            <div className="font-semibold text-lg mb-2">Start New Project</div>
            <div className="text-sm text-gray-600">Begin with fresh WBS structure</div>
          </button>
          
          <button
            onClick={() => setUploadMode('continue')}
            className={`p-6 rounded-lg border-2 transition-all ${
              uploadMode === 'continue' ? 'border-opacity-100 shadow-lg' : 'border-opacity-30 hover:border-opacity-60'
            }`}
            style={{ 
              borderColor: rjeColors.darkGreen,
              backgroundColor: uploadMode === 'continue' ? `${rjeColors.darkGreen}20` : 'white'
            }}
          >
            <Plus className="w-8 h-8 mx-auto mb-3" style={{ color: rjeColors.darkGreen }} />
            <div className="font-semibold text-lg mb-2">Continue Project</div>
            <div className="text-sm text-gray-600">Add subsystems to existing WBS</div>
          </button>
          
          <button
            onClick={() => setUploadMode('missing')}
            className={`p-6 rounded-lg border-2 transition-all ${
              uploadMode === 'missing' ? 'border-opacity-100 shadow-lg' : 'border-opacity-30 hover:border-opacity-60'
            }`}
            style={{ 
              borderColor: rjeColors.teal,
              backgroundColor: uploadMode === 'missing' ? `${rjeColors.teal}20` : 'white'
            }}
          >
            <Settings className="w-8 h-8 mx-auto mb-3" style={{ color: rjeColors.teal }} />
            <div className="font-semibold text-lg mb-2">Add Missing Equipment</div>
            <div className="text-sm text-gray-600">Insert individual equipment items</div>
          </button>
        </div>
      </div>

      {uploadMode === 'new' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
            🚀 Start New Project
          </h2>
          
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.mediumGreen + '15' }}>
            <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
              What happens next:
            </h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Upload your equipment list (Excel or CSV)</li>
              <li>• <strong>Required columns:</strong> Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)</li>
              <li>• System will create fresh WBS structure</li>
              <li>• Equipment will be categorized into numbered sections (01-10, 99)</li>
              <li>• Only commissioned equipment (Y) will be included</li>
            </ul>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: rjeColors.darkBlue }}>
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full p-3 border-2 rounded-lg focus:outline-none"
              style={{ borderColor: rjeColors.lightGreen }}
              placeholder="Enter your project name..."
            />
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: rjeColors.mediumGreen }}>
            <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: rjeColors.mediumGreen }} />
            <p className="text-lg font-medium mb-2">Upload Equipment List</p>
            <p className="text-gray-600 mb-4">Excel (.xlsx) or CSV files supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-6 py-3 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
              style={{ backgroundColor: rjeColors.mediumGreen }}
            >
              {isProcessing ? 'Processing Equipment List...' : 'Choose Equipment File'}
            </button>
          </div>
        </div>
      )}

      {uploadMode === 'continue' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
            ➕ Continue Existing Project
          </h2>
          
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.darkGreen + '15' }}>
            <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
              What happens next:
            </h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• First, load your existing WBS structure (CSV or Excel file)</li>
              <li>• Then upload additional equipment list</li>
              <li>• <strong>Required columns:</strong> Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)</li>
              <li>• New equipment will be added to existing WBS structure</li>
              <li>• WBS codes will continue from where you left off</li>
            </ul>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold mb-3" style={{ color: rjeColors.darkBlue }}>
              Step 1: Load Existing WBS Structure
            </h4>
            <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
              <p className="text-sm text-gray-700">
                <strong>Expected file format:</strong> CSV or Excel with columns: <code>wbs_code</code>, <code>parent_wbs_code</code>, <code>wbs_name</code>
              </p>
              <p className="text-sm text-gray-700 mt-1">
                You can use a previously exported WBS CSV file or create your own with the same structure.
              </p>
            </div>
            <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: rjeColors.darkGreen }}>
              <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: rjeColors.darkGreen }} />
              <p className="text-md font-medium mb-2">Load Existing WBS Structure</p>
              <p className="text-gray-600 mb-4">CSV or Excel (.xlsx) file with WBS structure</p>
              <input
                ref={projectStateInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleProjectStateUpload}
                className="hidden"
              />
              <button
                onClick={() => projectStateInputRef.current?.click()}
                className="px-4 py-2 text-white rounded-lg font-medium"
                style={{ backgroundColor: rjeColors.darkGreen }}
              >
                Load WBS Structure
              </button>
              {projectState && (
                <div className="mt-3 text-sm text-green-600">
                  ✅ Loaded: {projectState.projectName} - {projectState.subsystems.length} subsystems - Last WBS Code: {projectState.lastWbsCode}
                </div>
              )}
            </div>
          </div>

          {projectState && (
            <div>
              <h4 className="font-semibold mb-3" style={{ color: rjeColors.darkBlue }}>
                Step 2: Upload Additional Equipment
              </h4>
              <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: rjeColors.darkGreen }}>
                <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: rjeColors.darkGreen }} />
                <p className="text-lg font-medium mb-2">Upload Additional Equipment List</p>
                <p className="text-gray-600 mb-4">Excel (.xlsx) or CSV files supported</p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="continue-file-upload"
                />
                <button
                  onClick={() => document.getElementById('continue-file-upload')?.click()}
                  disabled={isProcessing}
                  className="px-6 py-3 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: rjeColors.darkGreen }}
                >
                  {isProcessing ? 'Processing Equipment List...' : 'Choose Equipment File'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadMode === 'missing' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
            🔧 Add Missing Equipment
          </h2>
          
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.teal + '15' }}>
            <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
              What happens next:
            </h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Specify where to insert missing equipment in existing WBS</li>
              <li>• Upload equipment list with individual items</li>
              <li>• <strong>Required columns:</strong> Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)</li>
              <li>• Equipment will be inserted at specified WBS location</li>
              <li>• Useful for adding forgotten equipment or design changes</li>
            </ul>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold mb-3" style={{ color: rjeColors.darkBlue }}>
              Configuration
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Parent WBS Code</label>
                <input
                  type="text"
                  placeholder="e.g., 1136 or 5737.1064.1575.1136"
                  value={missingEquipmentConfig.parentWbsCode}
                  onChange={(e) => setMissingEquipmentConfig(prev => ({
                    ...prev,
                    parentWbsCode: e.target.value
                  }))}
                  className="w-full p-3 border-2 rounded-lg focus:outline-none"
                  style={{ borderColor: rjeColors.lightGreen }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Starting WBS Code</label>
                <input
                  type="text"
                  placeholder="e.g., 1144"
                  value={missingEquipmentConfig.startingWbsCode}
                  onChange={(e) => setMissingEquipmentConfig(prev => ({
                    ...prev,
                    startingWbsCode: e.target.value
                  }))}
                  className="w-full p-3 border-2 rounded-lg focus:outline-none"
                  style={{ borderColor: rjeColors.lightGreen }}
                />
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: rjeColors.teal }}>
            <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: rjeColors.teal }} />
            <p className="text-lg font-medium mb-2">Upload Missing Equipment List</p>
            <p className="text-gray-600 mb-4">Excel (.xlsx) or CSV files supported</p>
            <input
              type="file"
              accept=".csv,.xlsx,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="missing-file-upload"
            />
            <button
              onClick={() => document.getElementById('missing-file-upload')?.click()}
              disabled={isProcessing}
              className="px-6 py-3 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
              style={{ backgroundColor: rjeColors.teal }}
            >
              {isProcessing ? 'Processing Equipment List...' : 'Choose Equipment File'}
            </button>
          </div>
        </div>
      )}

      {(wbsOutput.length > 0 || wbsVisualization.length > 0) && (
        <div className="space-y-6">
          <WBSTreeVisualization wbsNodes={wbsVisualization} />
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
              Export WBS Structure - Modern Architecture (v4.0) - WBS Generator v2.0
            </h3>
            
            {/* Export Status Information */}
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
              <div className="flex items-center mb-2">
                <Info className="w-5 h-5 mr-2" style={{ color: rjeColors.darkBlue }} />
                <h4 className="font-semibold" style={{ color: rjeColors.darkBlue }}>
                  Export Options:
                </h4>
              </div>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• <strong>New Items CSV:</strong> Contains only newly added equipment ({wbsOutput.length} nodes) - Use for P6 import</li>
                <li>• <strong>Complete Structure CSV:</strong> Contains entire WBS structure ({wbsVisualization.length} nodes) - Use for full project backup</li>
                <li>• <strong>Project State JSON:</strong> Technical backup for continuing project later</li>
              </ul>
            </div>
            
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={exportWBSCSV}
                disabled={wbsOutput.length === 0}
                className="flex items-center px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: rjeColors.teal }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export New Items CSV ({wbsOutput.length} nodes)
              </button>
              <button
                onClick={exportCompleteWBSCSV}
                disabled={wbsVisualization.length === 0}
                className="flex items-center px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: rjeColors.blue }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Complete Structure CSV ({wbsVisualization.length} nodes)
              </button>
              <button
                onClick={exportProjectState}
                disabled={!projectState}
                className="flex items-center px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: rjeColors.darkGreen }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export Project State (JSON)
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
              <p className="text-sm text-gray-700">
                <strong>💡 Continue Project Workflow:</strong> Use the <strong>New Items CSV</strong> to import only the newly added equipment into P6. 
                Use the <strong>Complete Structure CSV</strong> to continue adding more subsystems later.
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.mediumGreen}20` }}>
                <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                  {wbsVisualization.length}
                </div>
                <div className="text-sm text-gray-600">Total WBS Nodes</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkGreen}20` }}>
                <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                  {wbsOutput.length}
                </div>
                <div className="text-sm text-gray-600">New Nodes</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.teal}20` }}>
                <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                  {equipmentData.filter(item => item.commissioning === 'Y').length}
                </div>
                <div className="text-sm text-gray-600">Commissioned (Y)</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.blue}20` }}>
                <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                  {equipmentData.filter(item => item.commissioning === 'TBC').length}
                </div>
                <div className="text-sm text-gray-600">TBC Equipment</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkBlue}20` }}>
                <div className="text-2xl font-bold text-white" style={{ backgroundColor: rjeColors.darkBlue }}>
                  {equipmentData.filter(item => item.commissioning === 'N').length}
                </div>
                <div className="text-sm text-gray-600">Excluded (N)</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm" style={{ color: rjeColors.darkBlue }}>
                  New Items Preview (For P6 Import)
                </h4>
                <span className="text-xs text-gray-500">
                  {wbsOutput.length > 0 ? `${wbsOutput[0]?.wbs_code} - ${wbsOutput[wbsOutput.length - 1]?.wbs_code}` : 'No new items'}
                </span>
              </div>
              <div className="text-sm font-mono">
                {wbsOutput.slice(0, 20).map(node => (
                  <div key={node.wbs_code} className="py-1">
                    <span className="text-blue-600">{node.wbs_code}</span>
                    <span className="text-gray-400"> | </span>
                    <span className="text-green-600">{node.parent_wbs_code || 'ROOT'}</span>
                    <span className="text-gray-400"> | </span>
                    <span>{node.wbs_name}</span>
                  </div>
                ))}
                {wbsOutput.length > 20 && (
                  <div className="text-gray-500 py-2">... and {wbsOutput.length - 20} more new nodes</div>
                )}
                {wbsOutput.length === 0 && (
                  <div className="text-gray-500 py-2">No new items to export. Load existing WBS structure and add equipment.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced WBS Tree Visualization Component
const WBSTreeVisualization = ({ wbsNodes }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [showVisualization, setShowVisualization] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const buildTree = (nodes) => {
    const nodeMap = new Map();
    
    nodes.forEach(node => {
      nodeMap.set(node.wbs_code, { ...node, children: [] });
    });
    
    const roots = [];
    nodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.wbs_code);
      if (node.parent_wbs_code === null || node.parent_wbs_code === '') {
        roots.push(nodeWithChildren);
      } else {
        const parent = nodeMap.get(node.parent_wbs_code);
        if (parent) {
          parent.children.push(nodeWithChildren);
        }
      }
    });
    
    return roots;
  };

  const toggleNode = (wbsCode) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(wbsCode)) {
      newExpanded.delete(wbsCode);
    } else {
      newExpanded.add(wbsCode);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    setExpandedNodes(new Set(wbsNodes.map(node => node.wbs_code)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const getNodeBackgroundColor = (wbsName, isNew, isExisting) => {
    let baseColor = 'transparent';
    
    if (wbsName.includes('01 |')) baseColor = rjeColors.lightGreen + '20';
    else if (wbsName.includes('02 |')) baseColor = rjeColors.mediumGreen + '20';
    else if (wbsName.includes('03 |')) baseColor = rjeColors.darkGreen + '20';
    else if (wbsName.includes('04 |')) baseColor = rjeColors.teal + '20';
    else if (wbsName.includes('05 |')) baseColor = rjeColors.blue + '20';
    else if (wbsName.includes('06 |')) baseColor = rjeColors.darkBlue + '20';
    else if (wbsName.includes('07 |')) baseColor = rjeColors.lightGreen + '25';
    else if (wbsName.includes('08 |')) baseColor = rjeColors.mediumGreen + '25';
    else if (wbsName.includes('09 |')) baseColor = rjeColors.darkGreen + '25';
    else if (wbsName.includes('10 |')) baseColor = rjeColors.teal + '25';
    else if (wbsName.includes('99 |')) baseColor = rjeColors.blue + '25';
    else if (wbsName.includes('M |')) baseColor = rjeColors.mediumGreen + '30';
    else if (wbsName.includes('P |')) baseColor = rjeColors.teal + '30';
    else if (wbsName.includes('S') && wbsName.includes('|')) baseColor = rjeColors.darkBlue + '30';
    
    return baseColor;
  };

  const TreeNode = ({ node, level }) => {
    const isExpanded = expandedNodes.has(node.wbs_code);
    const hasChildren = node.children.length > 0;
    
    const nodeMatchesSearch = searchTerm === '' || 
      node.wbs_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.wbs_code.toString().includes(searchTerm);

    if (!nodeMatchesSearch && searchTerm !== '') {
      const hasMatchingChildren = node.children.some(child => 
        child.wbs_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.wbs_code.toString().includes(searchTerm)
      );
      if (!hasMatchingChildren) return null;
    }

    return (
      <div className="select-none">
        <div 
          className={`flex items-center py-2 px-3 rounded-lg mb-1 cursor-pointer hover:shadow-sm transition-all ${
            level === 0 ? 'border-l-4' : ''
          } ${node.isNew ? 'border-r-4 border-r-green-400' : ''} ${node.isExisting ? 'opacity-70' : ''}`}
          style={{ 
            marginLeft: `${level * 20}px`,
            backgroundColor: getNodeBackgroundColor(node.wbs_name, node.isNew, node.isExisting),
            borderLeftColor: level === 0 ? rjeColors.darkBlue : 'transparent'
          }}
          onClick={() => hasChildren && toggleNode(node.wbs_code)}
        >
          <div className="flex items-center flex-1">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-2" style={{ color: rjeColors.darkBlue }} />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" style={{ color: rjeColors.darkBlue }} />
              )
            ) : (
              <div className="w-4 h-4 mr-2" />
            )}
            
            <div className="flex-1">
              <div className="flex items-center">
                <span 
                  className={`text-sm font-medium mr-3 px-2 py-1 rounded ${
                    node.isNew ? 'bg-green-600 text-white' : 
                    node.isExisting ? 'bg-gray-500 text-white' : 'text-white'
                  }`}
                  style={{ backgroundColor: node.isNew ? '#16a34a' : node.isExisting ? '#6b7280' : rjeColors.darkBlue }}
                >
                  {node.wbs_code}
                </span>
                <span className={`font-medium ${node.isExisting ? 'text-gray-600' : 'text-gray-800'}`}>
                  {node.wbs_name}
                </span>
                {node.isNew && (
                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    NEW
                  </span>
                )}
                {node.isExisting && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    EXISTING
                  </span>
                )}
              </div>
            </div>
            
            {hasChildren && (
              <span 
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: rjeColors.mediumGreen, color: 'white' }}
              >
                {node.children.length}
              </span>
            )}
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.wbs_code} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const treeData = buildTree(wbsNodes);
  const filteredNodes = searchTerm ? wbsNodes.filter(node => 
    node.wbs_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.wbs_code.toString().includes(searchTerm)
  ) : [];

  const newNodesCount = wbsNodes.filter(node => node.isNew).length;
  const existingNodesCount = wbsNodes.filter(node => node.isExisting).length;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold" style={{ color: rjeColors.darkBlue }}>
            Complete WBS Structure Visualization
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {existingNodesCount} existing • {newNodesCount} new • {wbsNodes.length} total nodes
          </p>
        </div>
        <button
          onClick={() => setShowVisualization(!showVisualization)}
          className="flex items-center px-4 py-2 text-white rounded-lg font-medium"
          style={{ backgroundColor: rjeColors.teal }}
        >
          {showVisualization ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showVisualization ? 'Hide' : 'Show'} Tree
        </button>
      </div>

      {showVisualization && (
        <>
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={expandAll}
              className="px-4 py-2 text-white rounded-lg font-medium"
              style={{ backgroundColor: rjeColors.mediumGreen }}
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-4 py-2 text-white rounded-lg font-medium"
              style={{ backgroundColor: rjeColors.darkGreen }}
            >
              Collapse All
            </button>
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search WBS nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none"
                style={{ borderColor: rjeColors.lightGreen }}
              />
            </div>
          </div>

          {searchTerm && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '20' }}>
              <p className="text-sm font-medium">
                Found {filteredNodes.length} nodes matching "{searchTerm}"
              </p>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
            {treeData.map(root => (
              <TreeNode key={root.wbs_code} node={root} level={0} />
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '10' }}>
            <h4 className="font-semibold mb-3" style={{ color: rjeColors.darkBlue }}>
              Legend & Category Guide
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-sm mb-4">
              <div className="flex items-center">01 | Preparations</div>
              <div className="flex items-center">02 | Protection</div>
              <div className="flex items-center">03 | HV Switchboards</div>
              <div className="flex items-center">04 | LV Switchboards</div>
              <div className="flex items-center">05 | Transformers</div>
              <div className="flex items-center">06 | Battery Systems</div>
              <div className="flex items-center">07 | Earthing</div>
              <div className="flex items-center">08 | Building Services</div>
              <div className="flex items-center">09 | Interface Testing</div>
              <div className="flex items-center">10 | Ancillary Systems</div>
              <div className="flex items-center">99 | Unrecognised</div>
              <div className="flex items-center">M | Milestones</div>
              <div className="flex items-center">P | Pre-requisites</div>
              <div className="flex items-center">S | Subsystems</div>
              <div className="flex items-center">TBC | To Be Confirmed</div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-600 rounded mr-2"></div>
                <span>New Items (for export)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                <span>Existing Items (already in project)</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WBSGeneratorApp;
