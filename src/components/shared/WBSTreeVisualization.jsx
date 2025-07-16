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
  Circle
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

  // Build tree structure from flat nodes
  const treeData = useMemo(() => {
    if (!wbsNodes || wbsNodes.length === 0) return [];
    
    const nodeMap = new Map();
    
    // Create node map with children arrays
    wbsNodes.forEach(node => {
      nodeMap.set(node.wbs_code, { ...node, children: [] });
    });
    
    // Build parent-child relationships
    const roots = [];
    wbsNodes.forEach(node => {
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

  // Get color based on hierarchical level
  const getNodeBackgroundColor = (level) => {
    const levelColors = [
      rjeColors.darkBlue + '30',    // Level 0 - Root
      rjeColors.blue + '20',        // Level 1 - Categories, Milestones, Pre-req, Subsystems
      rjeColors.lightGreen + '15',  // Level 2 - Equipment/Sub-categories
      rjeColors.teal + '10',        // Level 3 - Sub-equipment
      '#f8f9fa',                    // Level 4+ - Light gray
    ];
    
    return levelColors[Math.min(level, levelColors.length - 1)];
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

    return (
      <div className="select-none">
        <div 
          className={`flex items-center py-2 px-3 rounded-lg mb-1 cursor-pointer hover:shadow-sm transition-all ${
            level === 0 ? 'border-l-4 shadow-md' : ''
          }`}
          style={{ 
            marginLeft: `${level * 20}px`,
            backgroundColor: getNodeBackgroundColor(level),
            borderLeftColor: level === 0 ? rjeColors.darkBlue : 'transparent'
          }}
          onClick={() => hasChildren && toggleNode(node.wbs_code)}
        >
          <div className="flex items-center flex-1">
            {/* Expand/Collapse Icon */}
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-2 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2 text-gray-600" />
              )
            ) : (
              <div className="w-4 h-4 mr-2" />
            )}
            
            {/* WBS Code */}
            <span 
              className="text-xs font-mono font-medium mr-3 px-2 py-1 rounded"
              style={{ backgroundColor: rjeColors.darkBlue, color: 'white' }}
            >
              {node.wbs_code}
            </span>
            
            {/* Node Name */}
            <div className="flex-1 flex items-center">
              <span className="font-medium text-gray-800 mr-2">{node.wbs_name}</span>
              {getStatusIndicator(node)}
            </div>
            
            {/* Children Count */}
            {hasChildren && (
              <div className="flex items-center">
                <span 
                  className="text-xs px-2 py-1 rounded-full mr-2"
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
          <div>
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
        <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
          WBS Structure Visualization
        </h3>
        <p className="text-gray-500">No WBS structure to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold mb-2" style={{ color: rjeColors.darkBlue }}>
            WBS Structure Visualization
          </h3>
          <p className="text-sm text-gray-600">
            {wbsNodes.length} total nodes • Interactive tree view
          </p>
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
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:outline-none transition-all"
                  style={{ borderColor: rjeColors.lightGreen }}
                />
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchTerm && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '20' }}>
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
          <div className="max-h-96 overflow-y-auto border rounded-lg p-4 mb-6" style={{ backgroundColor: '#fafafa' }}>
            {treeData.map(root => (
              <TreeNode key={root.wbs_code} node={root} level={0} />
            ))}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: rjeColors.mediumGreen + '20' }}>
              <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {wbsNodes.length}
              </div>
              <div className="text-sm text-gray-600">Total Nodes</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: rjeColors.darkGreen + '20' }}>
              <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {wbsNodes.filter(n => n.wbs_name.includes('S') && n.wbs_name.includes('|')).length}
              </div>
              <div className="text-sm text-gray-600">Subsystems</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: rjeColors.teal + '20' }}>
              <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {wbsNodes.filter(n => n.wbs_name.includes('|') && !n.wbs_name.includes('S')).length}
              </div>
              <div className="text-sm text-gray-600">Equipment</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: rjeColors.blue + '20' }}>
              <div className="text-2xl font-bold" style={{ color: rjeColors.darkBlue }}>
                {expandedNodes.size}
              </div>
              <div className="text-sm text-gray-600">Expanded</div>
            </div>
          </div>

          {/* Status Legend - Only show if there are new/existing items */}
          {(wbsNodes.some(node => node.isNew) || wbsNodes.some(node => node.isExisting)) && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: rjeColors.lightGreen + '10' }}>
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
