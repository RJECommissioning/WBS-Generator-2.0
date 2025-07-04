import React, { useState, useRef, createContext, useContext } from 'react';
import { Upload, Download, Settings, Plus, FileText, Zap, ChevronRight, ChevronDown, Eye, EyeOff } from 'lucide-react';

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
  const [wbsOutput, setWbsOutput] = useState([]);
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
      let lastWbsCode = 1000;
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
          wbs_code: parseInt(row[0]) || 0,
          parent_wbs_code: row[1] ? parseInt(row[1]) : null,
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
            wbs_code: parseInt(values[0]) || 0,
            parent_wbs_code: values[1] ? parseInt(values[1]) : null,
            wbs_name: values[2] || ''
          };
        }).filter(item => item.wbs_code && item.wbs_name);
      } else {
        throw new Error('Unsupported file format. Please use .xlsx, .xls, or .csv files.');
      }

      const rootNode = wbsData.find(node => node.parent_wbs_code === null);
      if (rootNode) {
        projectName = rootNode.wbs_name;
      }

      lastWbsCode = Math.max(...wbsData.map(node => node.wbs_code));

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
      setWbsOutput(loadedState.wbsNodes);
      
    } catch (error) {
      console.error('Project state loading error:', error);
      alert('Error loading project state file. Please ensure the file has columns: wbs_code, parent_wbs_code, wbs_name');
    }
  };

  const generateWBS = (data) => {
    const nodes = [];
    let wbsCounter = projectState?.lastWbsCode ? projectState.lastWbsCode + 1 : 1000;

    // Project root
    nodes.push({
      wbs_code: wbsCounter++,
      parent_wbs_code: null,
      wbs_name: projectName
    });

    const projectId = wbsCounter - 1;

    // M | Milestones
    const milestonesId = wbsCounter++;
    nodes.push({
      wbs_code: milestonesId,
      parent_wbs_code: projectId,
      wbs_name: "M | Milestones"
    });

    // P | Pre-requisites
    const prerequisitesId = wbsCounter++;
    nodes.push({
      wbs_code: prerequisitesId,
      parent_wbs_code: projectId,
      wbs_name: "P | Pre-requisites"
    });

    // Process subsystems
    const subsystems = [...new Set(data.filter(item => item.commissioning === 'Y').map(item => item.subsystem))];
    
    subsystems.forEach((subsystem, index) => {
      const subsystemId = wbsCounter++;
      const subsystemLabel = `S${index + 1} | ${subsystem}`;
      
      nodes.push({
        wbs_code: subsystemId,
        parent_wbs_code: projectId,
        wbs_name: subsystemLabel
      });

      nodes.push({
        wbs_code: wbsCounter++,
        parent_wbs_code: prerequisitesId,
        wbs_name: subsystem
      });

      wbsCounter = generateModernStructure(nodes, subsystemId, subsystem, data, wbsCounter);
    });

    // Handle TBC equipment
    const tbcEquipment = data.filter(item => item.commissioning === 'TBC');
    if (tbcEquipment.length > 0) {
      const tbcId = wbsCounter++;
      nodes.push({
        wbs_code: tbcId,
        parent_wbs_code: projectId,
        wbs_name: "TBC - Equipment To Be Confirmed"
      });

      tbcEquipment.forEach(item => {
        nodes.push({
          wbs_code: wbsCounter++,
          parent_wbs_code: tbcId,
          wbs_name: `${item.equipmentNumber} - ${item.description}`
        });
      });
    }

    const isValidP6Structure = validateP6Structure(nodes);
    if (!isValidP6Structure) {
      console.warn('WBS structure may have P6 import issues');
    }

    setWbsOutput(nodes);
    
    const newProjectState = {
      projectName,
      lastWbsCode: wbsCounter - 1,
      subsystems,
      wbsNodes: nodes,
      timestamp: new Date().toISOString()
    };
    
    setProjectState(newProjectState);
  };

  const validateP6Structure = (nodes) => {
    const codes = nodes.map(n => n.wbs_code).sort((a, b) => a - b);
    const startCode = codes[0];
    
    for (let i = 0; i < codes.length; i++) {
      if (codes[i] !== startCode + i) {
        console.warn(`P6 Warning: Non-sequential WBS code found: ${codes[i]}, expected: ${startCode + i}`);
        return false;
      }
    }

    const rootNodes = nodes.filter(n => n.parent_wbs_code === null);
    if (rootNodes.length !== 1) {
      console.warn(`P6 Warning: Expected 1 root node, found: ${rootNodes.length}`);
      return false;
    }

    const codeSet = new Set(nodes.map(n => n.wbs_code));
    for (const node of nodes) {
      if (node.parent_wbs_code !== null && !codeSet.has(node.parent_wbs_code)) {
        console.warn(`P6 Warning: Parent WBS code ${node.parent_wbs_code} not found for node ${node.wbs_code}`);
        return false;
      }
    }

    return true;
  };

  const generateModernStructure = (nodes, subsystemId, subsystem, data, startCounter) => {
    let wbsCounter = startCounter;

    Object.entries(categoryMapping).forEach(([number, name]) => {
      const categoryId = wbsCounter++;
      nodes.push({
        wbs_code: categoryId,
        parent_wbs_code: subsystemId,
        wbs_name: `${number} | ${name}`
      });

      let equipmentPatterns = [];
      switch (number) {
        case '01': equipmentPatterns = ['Test', 'Panel Shop', 'Pad']; break;
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

        subsystemEquipment.forEach(item => {
          const equipmentId = wbsCounter++;
          nodes.push({
            wbs_code: equipmentId,
            parent_wbs_code: categoryId,
            wbs_name: `${item.equipmentNumber} - ${item.description}`
          });

          const childEquipment = data.filter(child => 
            child.parentEquipmentNumber === item.equipmentNumber && 
            child.commissioning === 'Y'
          );
          childEquipment.forEach(child => {
            nodes.push({
              wbs_code: wbsCounter++,
              parent_wbs_code: equipmentId,
              wbs_name: `${child.equipmentNumber} - ${child.description}`
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
      'wbs_code\tparent_wbs_code\twbs_name',
      ...wbsOutput.map(node => 
        `${node.wbs_code}\t${node.parent_wbs_code || ''}\t${node.wbs_name}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}_WBS_P6_Import.csv`;
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

      {wbsOutput.length > 0 && (
        <div className="space-y-6">
          <WBSTreeVisualization wbsNodes={wbsOutput} />
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
              Export WBS Structure ({wbsOutput.length} nodes) - Modern Architecture (v4.0) - WBS Generator v2.0
            </h3>
            
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={exportWBSCSV}
                className="flex items-center px-4 py-2 text-white rounded-lg font-medium"
                style={{ backgroundColor: rjeColors.teal }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export WBS CSV (for P6 & Continue Project)
              </button>
              <button
                onClick={exportProjectState}
                className="flex items-center px-4 py-2 text-white rounded-lg font-medium"
                style={{ backgroundColor: rjeColors.darkGreen }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export Project State (JSON)
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
              <p className="text-sm text-gray-700">
                <strong>💡 P6 Import Ready:</strong> Use the <strong>WBS CSV export</strong> for Primavera P6 import or to continue this project later. 
                The CSV file uses tab-separated format optimized for P6 compatibility with sequential numbering.
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.mediumGreen}20` }}>
                <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                  {wbsOutput.length}
                </div>
                <div className="text-sm text-gray-600">Total WBS Nodes</div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${rjeColors.darkGreen}20` }}>
                <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                  {projectState?.subsystems.length || 0}
                </div>
                <div className="text-sm text-gray-600">Subsystems</div>
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
                  WBS Structure Preview (P6 Format)
                </h4>
                <span className="text-xs text-gray-500">
                  Sequential: {wbsOutput[0]?.wbs_code} - {wbsOutput[wbsOutput.length - 1]?.wbs_code}
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
                  <div className="text-gray-500 py-2">... and {wbsOutput.length - 20} more nodes</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// WBS Tree Visualization Component
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
      if (node.parent_wbs_code === null) {
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

  const getNodeBackgroundColor = (wbsName) => {
    if (wbsName.includes('01 |')) return rjeColors.lightGreen + '20';
    if (wbsName.includes('02 |')) return rjeColors.mediumGreen + '20';
    if (wbsName.includes('03 |')) return rjeColors.darkGreen + '20';
    if (wbsName.includes('04 |')) return rjeColors.teal + '20';
    if (wbsName.includes('05 |')) return rjeColors.blue + '20';
    if (wbsName.includes('06 |')) return rjeColors.darkBlue + '20';
    if (wbsName.includes('M |')) return rjeColors.mediumGreen + '30';
    if (wbsName.includes('P |')) return rjeColors.teal + '30';
    if (wbsName.includes('S') && wbsName.includes('|')) return rjeColors.darkBlue + '30';
    return 'transparent';
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
          }`}
          style={{ 
            marginLeft: `${level * 20}px`,
            backgroundColor: getNodeBackgroundColor(node.wbs_name),
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
                  className="text-sm font-medium mr-3 px-2 py-1 rounded"
                  style={{ backgroundColor: rjeColors.darkBlue, color: 'white' }}
                >
                  {node.wbs_code}
                </span>
                <span className="font-medium text-gray-800">{node.wbs_name}</span>
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

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold" style={{ color: rjeColors.darkBlue }}>
          WBS Structure Visualization
        </h3>
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
              Category Legend
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
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
          </div>
        </>
      )}
    </div>
  );
};

function App() {
  return <WBSGeneratorApp />;
}

export default App;
