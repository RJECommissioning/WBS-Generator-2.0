import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { rjeColors } from '../utils/constants';
import { processEquipmentFile } from '../utils/equipmentUtils';
import { generateMissingEquipmentWBS } from '../utils/wbsUtils';

const MissingEquipment = ({ 
  isProcessing, 
  setIsProcessing,
  projectName,
  setProjectName,
  setEquipmentData,
  setWbsOutput,
  setWbsVisualization,
  setProjectState,
  missingEquipmentConfig,
  setMissingEquipmentConfig,
  missingEquipmentAnalysis,
  setMissingEquipmentAnalysis
}) => {
  const wbsStructureInputRef = useRef(null);
  const equipmentListInputRef = useRef(null);
  const [showRemovedEquipment, setShowRemovedEquipment] = useState(false);
  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);

  const handleWBSStructureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      console.log('📁 Loading existing WBS structure:', file.name);
      
      let wbsData = [];
      let projectName = 'Missing Equipment Update';

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { cellDates: true });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
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

      const rootNode = wbsData.find(node => node.parent_wbs_code === null);
      if (rootNode) {
        projectName = rootNode.wbs_name;
      }

      setMissingEquipmentConfig(prev => ({
        ...prev,
        existingWbsNodes: wbsData,
        existingProjectName: projectName
      }));

      setProjectName(projectName);
      setStep1Complete(true);
      
      console.log(`✅ Loaded ${wbsData.length} WBS nodes from ${projectName}`);
      
    } catch (error) {
      console.error('❌ WBS structure loading error:', error);
      alert(`❌ Error loading WBS structure: ${error.message}\n\nPlease ensure the file has columns: wbs_code, parent_wbs_code, wbs_name`);
    } finally {
      setIsProcessing(false);
      if (wbsStructureInputRef.current) {
        wbsStructureInputRef.current.value = '';
      }
    }
  };

  const handleEquipmentListUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!missingEquipmentConfig.existingWbsNodes) {
      alert('Please load the existing WBS structure first (Step 1)');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('📦 Processing equipment list:', file.name);
      
      const equipmentList = await processEquipmentFile(file);
      console.log(`✅ Loaded ${equipmentList.length} equipment items`);
      
      if (equipmentList.length === 0) {
        alert('No valid equipment found. Please ensure your file contains the required columns.');
        return;
      }

      console.log('🔍 Analyzing missing equipment...');
      const result = await generateMissingEquipmentWBS(
        equipmentList, 
        missingEquipmentConfig.existingWbsNodes,
        missingEquipmentConfig.existingProjectName
      );
      
      console.log(`✅ Analysis complete: ${result.analysis.newEquipment.length} missing equipment items found`);
      
      setEquipmentData(equipmentList);
      setWbsOutput(result.newWbsNodes);
      setWbsVisualization(result.completeVisualization);
      setMissingEquipmentAnalysis(result.analysis);
      setStep2Complete(true);
      
      const newCommissioned = result.analysis.newEquipment.filter(item => item.commissioning === 'Y').length;
      const newTBC = result.analysis.newEquipment.filter(item => item.commissioning === 'TBC').length;
      const existing = result.analysis.existingEquipment.length;
      const removed = result.analysis.removedEquipment.length;
      
      let message = `✅ Missing Equipment Analysis Complete!\n\n📊 Results:\n• ${newCommissioned} new commissioned equipment (Y)\n• ${newTBC} new TBC equipment\n• ${existing} existing equipment (no change)\n• ${result.newWbsNodes.length} new WBS nodes created`;
      
      if (removed > 0) {
        message += `\n\n⚠️ Warning: ${removed} equipment items were removed from the list`;
      }
      
      message += `\n\nScroll down to see the updated WBS structure!`;
      
      alert(message);
      
    } catch (error) {
      console.error('❌ Equipment processing error:', error);
      alert(`❌ Error processing equipment: ${error.message}\n\nPlease ensure your file contains the required columns.`);
    } finally {
      setIsProcessing(false);
      if (equipmentListInputRef.current) {
        equipmentListInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6" style={{ color: rjeColors.darkBlue }}>
          🔧 Add Missing Equipment
        </h2>
        
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: rjeColors.teal + '15' }}>
          <h4 className="font-semibold mb-2" style={{ color: rjeColors.darkBlue }}>
            How this works:
          </h4>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>• <strong>Step 1:</strong> Load your existing WBS structure (CSV from previous export)</li>
            <li>• <strong>Step 2:</strong> Upload complete equipment list (original + new equipment)</li>
            <li>• System will identify new equipment by comparing Equipment Numbers</li>
            <li>• <strong>Only commissioned equipment (Y/TBC)</strong> will be processed</li>
            <li>• <strong>Invalid equipment numbers</strong> will be filtered out</li>
            <li>• Only genuinely new equipment will be exported with proper WBS codes</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
          Step 1: Load Existing WBS Structure
        </h3>
        
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
          <p className="text-sm text-gray-700">
            <strong>Expected file format:</strong> CSV or Excel with columns: <code>wbs_code</code>, <code>parent_wbs_code</code>, <code>wbs_name</code>
          </p>
          <p className="text-sm text-gray-700 mt-1">
            Use the WBS CSV file from your previous export or P6 export.
          </p>
        </div>

        <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: rjeColors.teal }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: rjeColors.teal }} />
          <p className="text-md font-medium mb-2">Load Existing WBS Structure</p>
          <p className="text-gray-600 mb-4">CSV or Excel (.xlsx) file with WBS structure</p>
          
          {isProcessing && !step1Complete && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.blue + '15' }}>
              <p className="text-sm font-medium text-blue-800">
                📁 Loading WBS structure...
              </p>
            </div>
          )}
          
          <input
            ref={wbsStructureInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleWBSStructureUpload}
            className="hidden"
            disabled={isProcessing}
          />
          <button
            onClick={() => wbsStructureInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
            style={{ backgroundColor: rjeColors.teal }}
          >
            {isProcessing && !step1Complete ? 'Loading...' : 'Load WBS Structure'}
          </button>
          
          {step1Complete && missingEquipmentConfig.existingWbsNodes && (
            <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: rjeColors.mediumGreen + '15' }}>
              <div className="flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  ✅ Loaded: {missingEquipmentConfig.existingProjectName}
                </span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                {missingEquipmentConfig.existingWbsNodes.length} WBS nodes loaded successfully
              </p>
            </div>
          )}
        </div>
      </div>

      {step1Complete && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
            Step 2: Upload Complete Equipment List
          </h3>
          
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
            <p className="text-sm text-gray-700">
              Upload your complete equipment list (original + new equipment). The system will automatically identify what's new.
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <strong>Required columns:</strong> Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)
            </p>
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: rjeColors.teal }}>
            <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: rjeColors.teal }} />
            <p className="text-lg font-medium mb-2">Upload Complete Equipment List</p>
            <p className="text-gray-600 mb-4">Excel (.xlsx, .xls) or CSV files supported</p>
            
            {isProcessing && step1Complete && (
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.blue + '15' }}>
                <p className="text-sm font-medium text-blue-800">
                  🔍 Analyzing equipment and identifying missing items...
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  This may take a few moments for large files
                </p>
              </div>
            )}
            
            <input
              ref={equipmentListInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleEquipmentListUpload}
              className="hidden"
              disabled={isProcessing}
            />
            <button
              onClick={() => equipmentListInputRef.current?.click()}
              disabled={isProcessing}
              className="px-6 py-3 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50"
              style={{ backgroundColor: rjeColors.teal }}
            >
              {isProcessing && step1Complete ? 'Analyzing Equipment...' : 'Choose Equipment File'}
            </button>
            
            <div className="mt-4 text-xs text-gray-500">
              <p>📋 <strong>Required columns:</strong> Subsystem, Parent Equipment Number, Equipment Number, Description, Commissioning (Y/N)</p>
              <p>💡 <strong>Optional columns:</strong> PLU, Supplier, Manufacturer, etc.</p>
            </div>
          </div>
        </div>
      )}

      {step2Complete && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
            📊 Missing Equipment Analysis
          </h3>
          
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: rjeColors.mediumGreen + '20' }}>
              <div className="text-3xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {missingEquipmentAnalysis.newEquipment.filter(item => item.commissioning === 'Y').length}
              </div>
              <div className="text-sm text-gray-600">New Equipment (Y)</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: rjeColors.teal + '20' }}>
              <div className="text-3xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {missingEquipmentAnalysis.newEquipment.filter(item => item.commissioning === 'TBC').length}
              </div>
              <div className="text-sm text-gray-600">New TBC Equipment</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: rjeColors.blue + '20' }}>
              <div className="text-3xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {missingEquipmentAnalysis.existingEquipment.length}
              </div>
              <div className="text-sm text-gray-600">Existing Equipment</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: rjeColors.darkBlue + '20' }}>
              <div className="text-3xl font-bold text-white">
                {missingEquipmentAnalysis.removedEquipment.length}
              </div>
              <div className="text-sm text-gray-600">Removed Equipment</div>
            </div>
          </div>

          {missingEquipmentAnalysis.removedEquipment.length > 0 && (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#FED7AA' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                  <h4 className="font-semibold text-orange-800">
                    ⚠️ {missingEquipmentAnalysis.removedEquipment.length} equipment items were removed from the list
                  </h4>
                </div>
                <button
                  onClick={() => setShowRemovedEquipment(!showRemovedEquipment)}
                  className="flex items-center text-sm text-orange-600 hover:text-orange-800"
                >
                  {showRemovedEquipment ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {showRemovedEquipment ? 'Hide' : 'Show'} Details
                </button>
              </div>
              <p className="text-sm text-orange-700 mb-2">
                These equipment items existed in your WBS but are not in the new equipment list. They need to be handled manually in P6.
              </p>
              {showRemovedEquipment && (
                <div className="mt-3 max-h-32 overflow-y-auto bg-white rounded p-3">
                  <ul className="text-sm space-y-1">
                    {missingEquipmentAnalysis.removedEquipment.map((equipmentNumber, index) => (
                      <li key={index} className="text-gray-700">
                        • {equipmentNumber}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {missingEquipmentAnalysis.newEquipment.length > 0 && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '15' }}>
              <h4 className="font-semibold mb-3" style={{ color: rjeColors.darkBlue }}>
                🆕 New Equipment Preview
              </h4>
              <div className="max-h-64 overflow-y-auto">
                <div className="grid gap-2">
                  {missingEquipmentAnalysis.newEquipment
                    .filter(item => item.commissioning === 'Y' || item.commissioning === 'TBC')
                    .slice(0, 10)
                    .map((equipment, index) => (
                    <div key={index} className="flex items-center p-2 bg-white rounded">
                      <span className="font-medium text-blue-600 mr-3 min-w-0">
                        {equipment.equipmentNumber}
                      </span>
                      <span className="text-gray-700 flex-1 truncate">
                        {equipment.description}
                      </span>
                      {equipment.commissioning === 'TBC' && (
                        <span className="text-xs px-2 py-1 ml-2 rounded" style={{ backgroundColor: rjeColors.blue, color: 'white' }}>
                          TBC
                        </span>
                      )}
                    </div>
                  ))}
                  {missingEquipmentAnalysis.newEquipment.filter(item => item.commissioning === 'Y' || item.commissioning === 'TBC').length > 10 && (
                    <div className="text-center text-gray-500 py-2">
                      ... and {missingEquipmentAnalysis.newEquipment.filter(item => item.commissioning === 'Y' || item.commissioning === 'TBC').length - 10} more equipment items
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {missingEquipmentAnalysis.newEquipment.length === 0 && (
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: rjeColors.mediumGreen + '15' }}>
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
              <h4 className="font-semibold mb-2 text-green-800">
                ✅ No Missing Equipment Found!
              </h4>
              <p className="text-sm text-green-700">
                All commissioned and TBC equipment from your list already exists in the current WBS structure.
              </p>
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mr-4"></div>
            <span className="text-lg font-medium text-gray-700">
              {!step1Complete ? 'Loading WBS structure...' : 'Analyzing equipment and identifying missing items...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissingEquipment;
