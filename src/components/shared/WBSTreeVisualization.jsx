// src/components/shared/WBSTreeVisualization.jsx - ENHANCED BADGE SYSTEM
// Shows both EXISTING (from P6) and NEW (integrated) badges clearly

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, FileText, Building2, Settings, FolderOpen, Folder } from 'lucide-react';

const WBSTreeVisualization = ({ wbsNodes = [] }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyExisting, setShowOnlyExisting] = useState(false);

  const colors = {
    darkBlue: '#1e3a8a',
    darkGreen: '#059669',
    lightGreen: '#10b981',
    teal: '#2e8b7a'
  };

  // CRITICAL: Safe string conversion to prevent React Error #130
  const safeString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // ENHANCED: Build tree structure with object safety
  const buildTreeStructure = (nodes) => {
    console.log('🌲 Building tree structure from', nodes.length, 'nodes');
    
    if (!Array.isArray(nodes) || nodes.length === 0) {
      console.warn('⚠️ No nodes provided for tree building');
      return [];
    }
    
    const nodeMap = new Map();
    const parentMap = new Map();
    
    // FIXED: Normalize with object safety
    const normalizedNodes = nodes.map(node => {
      const normalizedNode = {
        id: safeString(node.wbs_id || node.id || `temp_${Math.random()}`),
        parentId: safeString(node.parent_wbs_id || node.parent_id || node.parentId || ''),
        name: safeString(node.wbs_name || node.name || node.wbs_short_name || 'Unnamed'),
        shortName: safeString(node.wbs_short_name || node.short_name || node.wbs_code || ''),
        // ENHANCED: Better detection of new vs existing items
        isNew: Boolean(node.isNew || node.is_new),
        isExisting: Boolean(node.isExisting || (!node.isNew && !node.is_new)),
        elementType: safeString(node.element_type || node.elementType || 'unknown'),
        equipmentNumber: safeString(node.equipment_number || ''),
        commissioning: safeString(node.commissioning || ''),
        originalNode: node // Keep reference for other properties
      };
      
      nodeMap.set(normalizedNode.id, normalizedNode);
      
      if (normalizedNode.parentId && normalizedNode.parentId !== '') {
        if (!parentMap.has(normalizedNode.parentId)) {
          parentMap.set(normalizedNode.parentId, []);
        }
        parentMap.get(normalizedNode.parentId).push(normalizedNode);
      }
      
      return normalizedNode;
    });
    
    // Find root nodes and orphaned nodes
    const rootNodes = [];
    const orphanedNodes = [];
    
    normalizedNodes.forEach(node => {
      if (!node.parentId || node.parentId === '') {
        rootNodes.push(node);
      } else if (!nodeMap.has(node.parentId)) {
        console.warn(`⚠️ Parent not found for node: ${node.name} parent: ${node.parentId}`);
        
        // Try alternative parent matching
        const potentialParent = findParentByAlternativeMatch(node, normalizedNodes);
        if (potentialParent) {
          console.log(`✅ Found alternative parent for ${node.name}: ${potentialParent.name}`);
          node.parentId = potentialParent.id;
          if (!parentMap.has(potentialParent.id)) {
            parentMap.set(potentialParent.id, []);
          }
          parentMap.get(potentialParent.id).push(node);
        } else {
          orphanedNodes.push(node);
        }
      }
    });
    
    // Build tree recursively
    const buildNodeTree = (nodeId) => {
      const node = nodeMap.get(nodeId);
      if (!node) return null;
      
      const children = parentMap.get(nodeId) || [];
      const sortedChildren = children.sort((a, b) => {
        const aSort = a.shortName || a.name;
        const bSort = b.shortName || b.name;
        return aSort.localeCompare(bSort, undefined, { numeric: true });
      });
      
      return {
        ...node,
        children: sortedChildren.map(child => buildNodeTree(child.id)).filter(Boolean),
        hasChildren: sortedChildren.length > 0
      };
    };
    
    // Build trees from root nodes
    const trees = rootNodes.map(root => buildNodeTree(root.id)).filter(Boolean);
    
    // Handle orphaned nodes
    if (orphanedNodes.length > 0) {
      console.log(`📋 Creating orphaned section for ${orphanedNodes.length} nodes`);
      const orphanedTree = {
        id: 'orphaned_section',
        name: '🔗 Orphaned Elements',
        shortName: 'ORPHANED',
        isNew: false,
        isExisting: true,
        elementType: 'section',
        children: orphanedNodes.map(node => ({
          ...node,
          children: [],
          hasChildren: false
        })),
        hasChildren: orphanedNodes.length > 0
      };
      trees.push(orphanedTree);
    }
    
    console.log(`✅ Tree structure built: ${trees.length} root(s), ${orphanedNodes.length} orphaned`);
    return trees;
  };

  // Alternative parent matching
  const findParentByAlternativeMatch = (orphanedNode, allNodes) => {
    const parentId = orphanedNode.parentId;
    
    const strategies = [
      (nodes) => nodes.find(n => n.id.includes(parentId.substring(0, 4))),
      (nodes) => {
        if (orphanedNode.elementType === 'subsystem') {
          return nodes.find(n => n.name && n.name.includes('Summerfield'));
        }
        return null;
      },
      (nodes) => {
        const orphanName = orphanedNode.name.toLowerCase();
        if (orphanName.includes('pre-requisite') || orphanName.includes('prerequisite')) {
          return nodes.find(n => n.name && n.name.toLowerCase().includes('pre'));
        }
        if (orphanName.includes('milestone')) {
          return nodes.find(n => n.name && n.name.toLowerCase().includes('milestone'));
        }
        if (orphanName.includes('energisation')) {
          return nodes.find(n => n.name && n.name.toLowerCase().includes('energisation'));
        }
        return null;
      }
    ];
    
    for (const strategy of strategies) {
      const match = strategy(allNodes);
      if (match && match.id !== orphanedNode.id) {
        return match;
      }
    }
    
    return allNodes.find(n => !n.parentId);
  };

  // Build tree structure
  const treeData = useMemo(() => {
    return buildTreeStructure(wbsNodes);
  }, [wbsNodes]);

  // ENHANCED: Filter for different view modes
  const filteredTreeData = useMemo(() => {
    if (!showOnlyNew && !showOnlyExisting) return treeData;
    
    const filterNodes = (nodes) => {
      return nodes.reduce((acc, node) => {
        const shouldShow = showOnlyNew ? node.isNew : showOnlyExisting ? node.isExisting : true;
        const filteredChildren = filterNodes(node.children || []);
        
        if (shouldShow || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren
          });
        }
        
        return acc;
      }, []);
    };
    
    return filterNodes(treeData);
  }, [treeData, showOnlyNew, showOnlyExisting]);

  const toggleExpanded = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set();
    const collectIds = (nodes) => {
      nodes.forEach(node => {
        if (node.hasChildren) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(filteredTreeData);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Get node type for styling
  const getNodeType = (node) => {
    const name = node.name.toLowerCase();
    const elementType = node.elementType.toLowerCase();
    
    if (elementType === 'equipment' || node.equipmentNumber) return 'equipment';
    if (name.includes('prerequisite') || name.includes('pre-requisite')) return 'prerequisite';
    if (name.includes('milestone')) return 'milestone';
    if (name.includes('energisation')) return 'energisation';
    if (name.match(/^\d{2}\s*\|/)) return 'category';
    if (name.match(/^S\d+\s*\|/)) return 'subsystem';
    if (name.includes('tbc') || name.includes('to be confirmed')) return 'tbc';
    if (elementType === 'section') return 'section';
    return 'structure';
  };

  // Get node icon
  const getNodeIcon = (node, nodeType, isExpanded) => {
    const iconProps = { className: "w-4 h-4 mr-2" };
    
    if (node.hasChildren) {
      if (isExpanded) {
        return <ChevronDown {...iconProps} style={{ color: colors.teal }} />;
      } else {
        return <ChevronRight {...iconProps} style={{ color: colors.teal }} />;
      }
    }
    
    switch (nodeType) {
      case 'equipment':
        return <Settings {...iconProps} style={{ color: colors.darkGreen }} />;
      case 'subsystem':
        return <Building2 {...iconProps} style={{ color: colors.darkBlue }} />;
      case 'section':
        return <FolderOpen {...iconProps} style={{ color: colors.teal }} />;
      default:
        return <FileText {...iconProps} style={{ color: colors.darkGreen }} />;
    }
  };

  // ENHANCED: Get node styling classes with better new/existing differentiation
  const getNodeClasses = (node, nodeType) => {
    let classes = 'flex items-center p-2 rounded border transition-colors ';
    
    // ENHANCED: Better background colors for new vs existing
    if (node.isNew) {
      classes += 'bg-green-50 border-green-300 ';
    } else {
      classes += 'bg-blue-50 border-blue-200 ';
    }
    
    if (nodeType === 'subsystem') {
      if (node.isNew) {
        classes += 'bg-green-100 border-green-400 text-green-900 ';
      } else {
        classes += 'bg-blue-100 border-blue-400 text-blue-900 ';
      }
    } else if (nodeType === 'category') {
      if (node.isNew) {
        classes += 'bg-purple-50 border-purple-300 ';
      } else {
        classes += 'bg-purple-25 border-purple-200 ';
      }
    } else if (nodeType === 'section') {
      classes += 'bg-yellow-50 border-yellow-300 ';
    }
    
    if (node.hasChildren) {
      classes += 'cursor-pointer hover:bg-gray-50 ';
    }
    
    return classes;
  };

  // ENHANCED: Badge rendering with both EXISTING and NEW
  const renderStatusBadges = (node) => {
    const badges = [];
    
    if (node.isNew) {
      badges.push(
        <span key="new" className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded font-medium">
          NEW
        </span>
      );
    } else {
      badges.push(
        <span key="existing" className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded font-medium">
          EXISTING
        </span>
      );
    }
    
    if (node.commissioning) {
      badges.push(
        <span key="commissioning" className={`px-2 py-1 text-xs rounded font-medium ${
          node.commissioning === 'Y' 
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {safeString(node.commissioning)}
        </span>
      );
    }
    
    return badges;
  };

  // SAFE: Tree node component with enhanced badge system
  const TreeNode = ({ node, level = 0 }) => {
    const nodeType = getNodeType(node);
    const isExpanded = expandedNodes.has(node.id);
    const nodeClasses = getNodeClasses(node, nodeType);

    return (
      <div key={node.id} className="mb-1">
        <div
          className={nodeClasses}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={node.hasChildren ? () => toggleExpanded(node.id) : undefined}
        >
          {getNodeIcon(node, nodeType, isExpanded)}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* SAFE: Always convert to string */}
              <span className="font-medium text-sm font-mono">
                {safeString(node.shortName || node.id)}
              </span>
              
              {/* ENHANCED: Show both EXISTING and NEW badges */}
              {renderStatusBadges(node)}
            </div>
            
            {/* SAFE: Always convert to string */}
            <div className="text-sm mt-1 text-gray-700">
              {safeString(node.name)}
            </div>
          </div>
        </div>

        {/* SAFE: Render children */}
        {node.hasChildren && isExpanded && node.children && (
          <div className="ml-2">
            {node.children.map(child => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Calculate statistics
  const stats = useMemo(() => {
    let total = 0;
    let newNodes = 0;
    let existingNodes = 0;
    let equipment = 0;
    let categories = 0;
    
    const countNodes = (nodes) => {
      nodes.forEach(node => {
        total++;
        if (node.isNew) newNodes++;
        if (node.isExisting || !node.isNew) existingNodes++;
        
        const nodeType = getNodeType(node);
        if (nodeType === 'equipment') equipment++;
        if (nodeType === 'category') categories++;
        
        if (node.children) countNodes(node.children);
      });
    };
    
    countNodes(treeData);
    
    return { total, newNodes, existingNodes, equipment, categories };
  }, [treeData]);

  if (!Array.isArray(wbsNodes) || wbsNodes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: colors.darkBlue }}>
          WBS Structure Visualization
        </h3>
        <div className="text-center py-8 text-gray-500">
          No WBS structure to display
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold" style={{ color: colors.darkBlue }}>
          📊 Combined WBS Structure ({stats.total} nodes)
        </h3>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowOnlyNew(!showOnlyNew);
              setShowOnlyExisting(false);
            }}
            className={`flex items-center px-3 py-2 rounded text-sm transition-colors ${
              showOnlyNew 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showOnlyNew ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            {showOnlyNew ? 'Show All' : 'New Only'}
          </button>

          <button
            onClick={() => {
              setShowOnlyExisting(!showOnlyExisting);
              setShowOnlyNew(false);
            }}
            className={`flex items-center px-3 py-2 rounded text-sm transition-colors ${
              showOnlyExisting 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showOnlyExisting ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            {showOnlyExisting ? 'Show All' : 'Existing Only'}
          </button>
          
          <button
            onClick={expandAll}
            className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            Expand All
          </button>
          
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ENHANCED: Statistics with existing vs new breakdown */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Nodes</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-800">{stats.existingNodes}</div>
          <div className="text-sm text-blue-600">Existing (P6)</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-800">{stats.newNodes}</div>
          <div className="text-sm text-green-600">New Items</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded">
          <div className="text-2xl font-bold text-purple-800">{stats.equipment}</div>
          <div className="text-sm text-purple-600">Equipment</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded">
          <div className="text-2xl font-bold text-orange-800">{stats.categories}</div>
          <div className="text-sm text-orange-600">Categories</div>
        </div>
      </div>

      {/* Tree rendering */}
      <div className="max-h-96 overflow-y-auto border rounded p-4">
        {filteredTreeData.length > 0 ? (
          filteredTreeData.map(node => (
            <TreeNode key={node.id} node={node} level={0} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            {showOnlyNew ? 'No new nodes to display' : showOnlyExisting ? 'No existing nodes to display' : 'No nodes to display'}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <strong>Legend:</strong> 🔵 EXISTING = From P6 • 🟢 NEW = Just Integrated • Blue Background = P6 Items • Green Background = New Items
      </div>
    </div>
  );
};

export default WBSTreeVisualization;
