import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Search, 
  Expand,
  Minimize2,
  CheckCircle,
  Circle,
  TreePine,
  Layers
} from 'lucide-react';

const rjeColors = {
  lightGreen: '#B8D582',
  mediumGreen: '#7DB544',
  darkGreen: '#4A9B4B',
  teal: '#2E8B7A',
  blue: '#1E7FC2',
  darkBlue: '#0F5A8F'
};

const WBSTreeVisualization = ({ wbsNodes = [] }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [showVisualization, setShowVisualization] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Build tree structure from flat nodes with better error handling
  const treeData = useMemo(() => {
    if (!wbsNodes || wbsNodes.length === 0) return [];
    
    console.log('🌲 Building tree structure from', wbsNodes.length, 'nodes');
    
    const nodeMap = new Map();
    
    // Create node map with children arrays
    wbsNodes.forEach(node => {
      if (!node.wbs_code) {
        console.warn('⚠️ Node missing wbs_code:', node);
        return;
      }
      nodeMap.set(node.wbs_code, { ...node, children: [] });
    });
    
    // Build parent-child relationships
    const roots = [];
    wbsNodes.forEach(node => {
      if (!node.wbs_code) return;
      
      const nodeWithChildren = nodeMap.get(node.wbs_code);
      if (!nodeWithChildren) return;
      
      if (!node.parent_wbs_code || node.parent_wbs_code === '' || node.parent_wbs_code === null) {
        roots.push(nodeWithChildren);
      } else {
        const parent = nodeMap.get(node.parent_wbs_code);
        if (parent) {
          parent.children.push(nodeWithChildren);
        } else {
          console.warn('⚠️ Parent not found for node:', node.wbs_code, 'parent:', node.parent_wbs_code);
          // Add orphan as root
          roots.push(nodeWithChildren);
        }
      }
    });
    
    // Sort roots and children for consistent display
    const sortNodes = (nodes) => {
      return nodes.sort((a, b) => {
        // Sort by WBS code
        const aCode = a.wbs_code.toString();
        const bCode = b.wbs_code.toString();
        
        // Handle numeric sorting properly
        const aNum = parseFloat(aCode);
        const bNum = parseFloat(bCode);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        
        return aCode.localeCompare(bCode);
      });
    };
    
    const sortTreeRecursively = (nodes) => {
      const sorted = sortNodes(nodes);
      sorted.forEach(node => {
        if (node.children && node.children.length > 0) {
          node.children = sortTreeRecursively(node.children);
        }
      });
      return sorted;
    };
    
    const sortedRoots = sortTreeRecursively(roots);
    console.log('🎯 Tree structure built:', sortedRoots.length, 'root nodes');
    
    return sortedRoots;
  }, [wbsNodes]);

  // Initialize expanded state to show first few levels
  useState(() => {
    if (wbsNodes.length > 0) {
      const initialExpanded = new Set();
      
      // Auto-expand first 3 levels for better UX
      wbsNodes.forEach(node => {
        const depth = (node.wbs_code.toString().match(/\./g) || []).length;
        if (depth <= 2) {
          initialExpanded.add(node.wbs_code);
        }
      });
      
      setExpandedNodes(initialExpanded);
    }
  }, [wbsNodes]);

  // Filter nodes based on search term
  const filteredNodes = useMemo(() => {
    if (!searchTerm) return [];
    
    return wbsNodes.filter(node => 
      node.wbs_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.wbs_code.toString().includes(searchTerm)
    );
  }, [wbsNodes, searchTerm]);

  // Toggle node expansion
  const toggleNode = (wbsCode) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(wbsCode)) {
      newExpanded.delete(wbsCode);
    } else {
      newExpanded.add(wbsCode);
    }
    setExpandedNodes(newExpanded);
  };

  // Expand all nodes
  const expandAll = () => {
    setExpandedNodes(new Set(wbsNodes.map(node => node.wbs_code)));
  };

  // Collapse all nodes
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Get solid color based on hierarchical level (no gradients)
  const getNodeBackgroundColor = (level) => {
    const levelColors = [
      rjeColors.darkBlue + '40',      // Level 0 - Project Root (1)
      rjeColors.blue + '35',          // Level 1 - M|Milestones, P|Pre-req, S1|Subsystem (1.1, 1.2, 1.3)
      rjeColors.mediumGreen + '30',   // Level 2 - Categories (1.3.1, 1.3.2, etc.)
      rjeColors.lightGreen + '25',    // Level 3 - Equipment Groups (1.3.5.1, 1.3.5.2)
      rjeColors.teal + '20',          // Level 4 - Individual Equipment (1.3.5.1.1)
      '#f1f5f9',                      // Level 5+ - Light gray
    ];
    
    return levelColors[Math.min(level, levelColors.length - 1)];
  };

  // Get border color for level distinction
  const getNodeBorderColor = (level) => {
    const borderColors = [
      rjeColors.darkBlue,      // Level 0 - Project Root
      rjeColors.blue,          // Level 1 - Main sections
      rjeColors.mediumGreen,   // Level 2 - Categories
      rjeColors.lightGreen,    // Level 3 - Equipment Groups
      rjeColors.teal,          // Level 4 - Individual Equipment
      '#cbd5e1',               // Level 5+ - Gray
    ];
    
    return borderColors[Math.min(level, borderColors.length - 1)];
  };

  // Get status indicator
  const getStatusIndicator = (node) => {
    if (node.isNew) {
      return <CheckCircle className="w-4 h-4 text-green-600" title="New item" />;
    }
    if (node.isExisting) {
      return <Circle className="w-4 h-4 text-blue-600" title="Existing item" />;
    }
    return null;
  };

  // Get level from WBS code
  const getLevel = (wbsCode) => {
    return (wbsCode.toString().match(/\./g) || []).length;
  };

  // Individual tree node component
  const TreeNode = ({ node, level = 0 }) => {
    const isExpanded = expandedNodes.has(node.wbs_code);
    const hasChildren = node.children && node.children.length > 0;
    
    // Filter node based on search
    const nodeMatchesSearch = searchTerm === '' || 
      node.wbs_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.wbs_code.toString().includes(searchTerm);

    if (!nodeMatchesSearch && searchTerm !== '') {
      const hasMatchingChildren = node.children && node.children.some(child => 
        child.wbs_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.wbs_code.toString().includes(searchTerm)
      );
      if (!hasMatchingChildren) return null;
    }

    const actualLevel = getLevel(node.wbs_code);

    return (
      <div className="select-none">
        <div 
          className={`flex items-center py-2 px-3 rounded-lg mb-1 cursor-pointer hover:shadow-md transition-all border-l-4 ${
            hasChildren ? 'hover:bg-opacity-80' : ''
          }`}
          style={{ 
            marginLeft: `${level * 24}px`,
            backgroundColor: getNodeBackgroundColor(actualLevel),
            borderLeftColor: getNodeBorderColor(actualLevel)
          }}
          onClick={() => hasChildren && toggleNode(node.wbs_code)}
        >
          <div className="flex items-center flex-1">
            {/* Expand/Collapse Icon */}
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-2 text-gray-700" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2 text-gray-700" />
              )
            ) : (
              <div className="w-4 h-4 mr-2 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              </div>
            )}
            
            {/* WBS Code */}
            <span 
              className="text-xs font-mono font-bold mr-3 px-2 py-1 rounded shadow-sm"
              style={{ backgroundColor: rjeColors.darkBlue, color: 'white' }}
            >
              {node.wbs_code}
            </span>
            
            {/* Level Indicator */}
            <span className="text-xs text-gray-500 mr-2">
              L{actualLevel}
            </span>
            
            {/* Node Name */}
            <div className="flex-1 flex items-center">
              <span className="font-medium text-gray-800 mr-2">{node.wbs_name}</span>
              {getStatusIndicator(node)}
            </div>
            
            {/* Children Count */}
            {hasChildren && (
              <div className="flex items-center ml-2">
                <span 
                  className="text-xs px-2 py-1 rounded-full mr-2 font-medium"
                  style={{ backgroundColor: rjeColors.mediumGreen, color: 'white' }}
                >
                  {node.children.length}
                </span>
                <span className="text-xs text-gray-500">
                  {isExpanded ? 'expanded' : 'collapsed'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="ml-2 border-l-2 border-gray-200 pl-2">
            {node.children.map(child => (
              <TreeNode key={child.wbs_code} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!wbsNodes || wbsNodes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-4">
          <TreePine className="w-6 h-6 mr-2" style={{ color: rjeColors.darkBlue }} />
          <h3 className="text-xl font-bold" style={{ color: rjeColors.darkBlue }}>
            WBS Structure Visualization
          </h3>
        </div>
        <div className="text-center py-8">
          <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">No WBS structure to display</p>
          <p className="text-gray-400 text-sm mt-2">Upload an equipment list to generate WBS structure</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <TreePine className="w-6 h-6 mr-2" style={{ color: rjeColors.darkBlue }} />
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: rjeColors.darkBlue }}>
              WBS Structure Visualization
            </h3>
            <p className="text-sm text-gray-600">
              {wbsNodes.length} total nodes • {treeData.length} root nodes • Interactive tree view
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowVisualization(!showVisualization)}
          className="flex items-center px-4 py-2 text-white rounded-lg font-medium transition-all hover:shadow-lg"
          style={{ backgroundColor: rjeColors.teal }}
        >
          {showVisualization ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showVisualization ? 'Hide' : 'Show'} Tree
        </button>
      </div>

      {showVisualization && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={expandAll}
              className="flex items-center px-4 py-2 text-white rounded-lg font-medium transition-all hover:shadow-lg"
              style={{ backgroundColor: rjeColors.mediumGreen }}
            >
              <Expand className="w-4 h-4 mr-2" />
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center px-4 py-2 text-white rounded-lg font-medium transition-all hover:shadow-lg"
              style={{ backgroundColor: rjeColors.darkGreen }}
            >
              <Minimize2 className="w-4 h-4 mr-2" />
              Collapse All
            </button>
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search WBS nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:outline-none transition-all focus:border-opacity-100"
                  style={{ borderColor: rjeColors.lightGreen }}
                />
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchTerm && (
            <div className="mb-4 p-3 rounded-lg border-l-4" style={{ 
              backgroundColor: rjeColors.lightGreen + '20',
              borderLeftColor: rjeColors.mediumGreen
            }}>
              <p className="text-sm font-medium">
                🔍 Found {filteredNodes.length} nodes matching "{searchTerm}"
              </p>
              {filteredNodes.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  First few matches: {filteredNodes.slice(0, 3).map(n => n.wbs_code).join(', ')}
                  {filteredNodes.length > 3 && '...'}
                </div>
              )}
            </div>
          )}

          {/* Tree Structure */}
          <div className="max-h-96 overflow-y-auto border-2 rounded-lg p-4 mb-6 bg-gray-50" style={{ borderColor: rjeColors.lightGreen }}>
            {treeData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No tree structure could be built from the WBS nodes</p>
                <p className="text-sm mt-2">Check console for debugging information</p>
              </div>
            ) : (
              treeData.map(root => (
                <TreeNode key={root.wbs_code} node={root} level={0} />
              ))
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg border-2" style={{ 
              backgroundColor: rjeColors.mediumGreen + '20',
              borderColor: rjeColors.mediumGreen
            }}>
              <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {wbsNodes.length}
              </div>
              <div className="text-sm text-gray-600">Total Nodes</div>
            </div>
            <div className="text-center p-4 rounded-lg border-2" style={{ 
              backgroundColor: rjeColors.darkGreen + '20',
              borderColor: rjeColors.darkGreen
            }}>
              <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {wbsNodes.filter(n => n.wbs_name.includes('S') && n.wbs_name.includes('|')).length}
              </div>
              <div className="text-sm text-gray-600">Subsystems</div>
            </div>
            <div className="text-center p-4 rounded-lg border-2" style={{ 
              backgroundColor: rjeColors.teal + '20',
              borderColor: rjeColors.teal
            }}>
              <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {wbsNodes.filter(n => n.wbs_name.includes('|') && !n.wbs_name.includes('S') && !n.wbs_name.includes('M') && !n.wbs_name.includes('P')).length}
              </div>
              <div className="text-sm text-gray-600">Equipment</div>
            </div>
            <div className="text-center p-4 rounded-lg border-2" style={{ 
              backgroundColor: rjeColors.blue + '20',
              borderColor: rjeColors.blue
            }}>
              <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {expandedNodes.size}
              </div>
              <div className="text-sm text-gray-600">Expanded</div>
            </div>
          </div>

          {/* Level Legend */}
          <div className="p-4 rounded-lg border-2 mb-4" style={{ 
            backgroundColor: rjeColors.lightGreen + '10',
            borderColor: rjeColors.lightGreen
          }}>
            <h4 className="font-semibold mb-3 flex items-center" style={{ color: rjeColors.darkBlue }}>
              <Layers className="w-4 h-4 mr-2" />
              Level Structure Legend
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 border-l-4 mr-2" style={{ 
                  backgroundColor: getNodeBackgroundColor(0),
                  borderLeftColor: getNodeBorderColor(0)
                }}></div>
                <span><strong>L0:</strong> Project Root (1)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border-l-4 mr-2" style={{ 
                  backgroundColor: getNodeBackgroundColor(1),
                  borderLeftColor: getNodeBorderColor(1)
                }}></div>
                <span><strong>L1:</strong> M|Milestones, P|Pre-req, S1|Subsystem</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border-l-4 mr-2" style={{ 
                  backgroundColor: getNodeBackgroundColor(2),
                  borderLeftColor: getNodeBorderColor(2)
                }}></div>
                <span><strong>L2:</strong> Categories (01-10, 99)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border-l-4 mr-2" style={{ 
                  backgroundColor: getNodeBackgroundColor(3),
                  borderLeftColor: getNodeBorderColor(3)
                }}></div>
                <span><strong>L3:</strong> Equipment Groups</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border-l-4 mr-2" style={{ 
                  backgroundColor: getNodeBackgroundColor(4),
                  borderLeftColor: getNodeBorderColor(4)
                }}></div>
                <span><strong>L4:</strong> Individual Equipment</span>
              </div>
            </div>
          </div>

          {/* Status Legend - Only show if there are new/existing items */}
          {(wbsNodes.some(node => node.isNew) || wbsNodes.some(node => node.isExisting)) && (
            <div className="p-4 rounded-lg border-2" style={{ 
              backgroundColor: rjeColors.lightGreen + '10',
              borderColor: rjeColors.lightGreen
            }}>
              <h4 className="font-semibold mb-3" style={{ color: rjeColors.darkBlue }}>
                📍 Status Legend
              </h4>
              <div className="flex flex-wrap gap-4 text-sm">
                {wbsNodes.some(node => node.isNew) && (
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <span>New items being added</span>
                  </div>
                )}
                {wbsNodes.some(node => node.isExisting) && (
                  <div className="flex items-center">
                    <Circle className="w-4 h-4 text-blue-600 mr-2" />
                    <span>Existing items in WBS</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WBSTreeVisualization;
