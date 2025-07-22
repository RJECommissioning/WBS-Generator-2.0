// src/components/shared/WBSTreeVisualization.jsx - FIXED to Use XER Hierarchy
// Instead of rebuilding hierarchy, use parent_wbs_id relationships from XER parser

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, FileText, Building2, Settings, FolderOpen } from 'lucide-react';

const WBSTreeVisualization = ({ wbsNodes = [] }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyExisting, setShowOnlyExisting] = useState(false);

  const colors = {
    darkBlue: '#1e3a8a',
    darkGreen: '#059669',
    lightGreen: '#10b981',
    teal: '#2e8b7a'
  };

  // Safe string conversion
  const safeString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // FIXED: Use parent_wbs_id relationships instead of rebuilding hierarchy
  const buildHierarchyFromParentIds = (nodes) => {
    console.log('🏗️ FIXED: Building hierarchy using parent_wbs_id relationships from', nodes.length, 'nodes');
    
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return [];
    }
    
    // FIXED: Better flag detection using explicit flags
    const normalizedNodes = nodes.map(node => {
      let isNew = false;
      let isExisting = false;
      
      if (node.isNew === true || node.is_new === true) {
        isNew = true;
        isExisting = false;
      } else if (node.isExisting === true) {
        isExisting = true;
        isNew = false;
      } else {
        // Fallback: treat as existing (likely from XER)
        isExisting = true;
        isNew = false;
      }
      
      // FIXED: Use wbs_short_name for display (has decimal codes), wbs_id for relationships
      const wbsCode = safeString(node.wbs_short_name || node.wbs_code || node.wbs_id || `temp_${Math.random()}`);
      
      const normalizedNode = {
        id: safeString(node.wbs_id || node.id || `temp_${Math.random()}`),
        wbsCode: wbsCode,
        wbsId: safeString(node.wbs_id || ''),
        parentWbsId: safeString(node.parent_wbs_id || ''),
        name: safeString(node.wbs_name || node.name || 'Unnamed'),
        isNew: isNew,
        isExisting: isExisting,
        elementType: safeString(node.element_type || node.elementType || 'unknown'),
        equipmentNumber: safeString(node.equipment_number || ''),
        commissioning: safeString(node.commissioning || ''),
        originalNode: node
      };
      
      // Calculate level from decimal WBS code
      if (wbsCode.includes('.')) {
        normalizedNode.level = wbsCode.split('.').length - 1;
      } else {
        normalizedNode.level = 0; // Root level
      }
      
      return normalizedNode;
    });

    console.log('📊 FIXED: Flag Analysis:', {
      total: normalizedNodes.length,
      new: normalizedNodes.filter(n => n.isNew).length,
      existing: normalizedNodes.filter(n => n.isExisting).length
    });
    
    // FIXED: Build hierarchy using parent_wbs_id relationships (like XER parser did)
    const nodeMap = new Map();
    const childrenByParentId = new Map();
    
    // Create lookup maps
    normalizedNodes.forEach(node => {
      nodeMap.set(node.wbsId, node);
    });
    
    // Build parent-child relationships using parent_wbs_id
    normalizedNodes.forEach(node => {
      const parentId = node.parentWbsId;
      
      if (!parentId || parentId === '' || parentId === node.wbsId) {
        // Root node
        if (!childrenByParentId.has('ROOT')) {
          childrenByParentId.set('ROOT', []);
        }
        childrenByParentId.get('ROOT').push(node);
      } else {
        // Child node
        if (!childrenByParentId.has(parentId)) {
          childrenByParentId.set(parentId, []);
        }
        childrenByParentId.get(parentId).push(node);
      }
    });
    
    console.log(`📊 Parent-child groups: ${childrenByParentId.size}`);
    console.log(`📊 Root nodes: ${(childrenByParentId.get('ROOT') || []).length}`);
    
    // Recursively build tree structure
    const buildNodeTree = (nodeId) => {
      const node = nodeMap.get(nodeId);
      if (!node) {
        return null;
      }
      
      const children = childrenByParentId.get(nodeId) || [];
      
      // Sort children by WBS code
      const sortedChildren = children.sort((a, b) => {
        return a.wbsCode.localeCompare(b.wbsCode, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        });
      });
      
      return {
        ...node,
        children: sortedChildren.map(child => buildNodeTree(child.wbsId)).filter(Boolean),
        hasChildren: sortedChildren.length > 0
      };
    };
    
    // Start from root nodes
    const rootNodes = childrenByParentId.get('ROOT') || [];
    console.log(`🌲 FIXED: Building tree from ${rootNodes.length} actual root nodes`);
    
    const trees = rootNodes.map(root => buildNodeTree(root.wbsId)).filter(Boolean);
    
    console.log(`✅ FIXED: Hierarchy complete - ${trees.length} root trees built using parent_wbs_id`);
    
    return trees;
  };

  // Build tree structure
  const treeData = useMemo(() => {
    return buildHierarchyFromParentIds(wbsNodes);
  }, [wbsNodes]);

  // Filtering logic
  const filteredTreeData = useMemo(() => {
    if (!showOnlyNew && !showOnlyExisting) {
      return treeData;
    }
    
    const filterNodes = (nodes) => {
      return nodes.reduce((acc, node) => {
        const shouldShowByFlag = showOnlyNew ? node.isNew : showOnlyExisting ? node.isExisting : true;
        const filteredChildren = filterNodes(node.children || []);
        
        if (shouldShowByFlag || filteredChildren.length > 0) {
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
    const allIds = new Set(['root']);
    const collectIds = (nodes) => {
      nodes.forEach(node => {
        if (node.hasChildren) {
          allIds.add(node.wbsId);
          collectIds(node.children);
        }
      });
    };
    collectIds(filteredTreeData);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  // Enhanced node type detection
  const getNodeType = (node) => {
    const name = node.name.toLowerCase();
    const level = node.level || 0;
    
    if (level === 0) return 'project';
    
    if (name.includes('pre-requisite') || name.includes('prerequisite')) return 'prerequisite';
    if (name.includes('milestone')) return 'milestone';
    if (name.includes('energisation')) return 'energisation';
    if (name.match(/^S\d+\s*\|/) || name.includes('subsystem')) return 'subsystem';
    if (name.includes('tbc') || name.includes('to be confirmed')) return 'tbc';
    
    if (name.match(/^\d{2}\s*\|/)) return 'category'; // 01 |, 02 |, etc.
    
    if (name.includes('|')) {
      const beforePipe = name.split('|')[0].trim();
      
      // Equipment patterns
      if (beforePipe.match(/^[+-]?UH\d+$/i)) return 'panel';
      if (beforePipe.match(/^-F\d+/i)) return 'relay';
      if (beforePipe.match(/^-KF\d+$/i)) return 'relay';
      if (beforePipe.match(/^-Y\d+$/i)) return 'relay';
      if (beforePipe.match(/^-P\d+$/i)) return 'relay';
      if (beforePipe.match(/^[+-]?WA\d+$/i)) return 'hv_switchboard';
      if (beforePipe.match(/^[+-]?WC\d+$/i)) return 'lv_switchboard';
      if (beforePipe.match(/^T\d+$/i)) return 'transformer';
      if (beforePipe.match(/^[+-]?GB\d+$/i)) return 'battery';
      
      return 'equipment';
    }
    
    return 'structure';
  };

  // Get node icon
  const getNodeIcon = (node, nodeType, isExpanded) => {
    const iconProps = { className: "w-4 h-4 mr-2" };
    
    if (node.hasChildren) {
      return isExpanded ? 
        <ChevronDown {...iconProps} style={{ color: colors.teal }} /> :
        <ChevronRight {...iconProps} style={{ color: colors.teal }} />;
    }
    
    switch (nodeType) {
      case 'project':
        return <Building2 {...iconProps} style={{ color: colors.darkBlue }} />;
      case 'subsystem':
        return <Building2 {...iconProps} style={{ color: colors.darkGreen }} />;
      case 'panel':
      case 'relay':
      case 'equipment':
        return <Settings {...iconProps} style={{ color: colors.darkGreen }} />;
      case 'category':
        return <FolderOpen {...iconProps} style={{ color: colors.teal }} />;
      default:
        return <FileText {...iconProps} style={{ color: colors.darkGreen }} />;
    }
  };

  // Node styling
  const getNodeClasses = (node, nodeType) => {
    let classes = 'flex items-center p-2 rounded border transition-colors ';
    
    if (node.isNew) {
      classes += 'bg-green-50 border-green-300 ';
    } else if (node.isExisting) {
      classes += 'bg-blue-50 border-blue-200 ';
    } else {
      classes += 'bg-gray-50 border-gray-200 ';
    }
    
    // Type-specific styling
    if (nodeType === 'project') {
      classes += 'bg-gray-100 border-gray-400 text-gray-900 font-bold text-lg ';
    } else if (nodeType === 'subsystem') {
      if (node.isNew) {
        classes += 'bg-green-100 border-green-400 text-green-900 font-semibold ';
      } else {
        classes += 'bg-blue-100 border-blue-400 text-blue-900 font-semibold ';
      }
    } else if (nodeType === 'category') {
      classes += 'bg-purple-50 border-purple-300 font-medium ';
    } else if (nodeType === 'panel') {
      classes += 'bg-yellow-50 border-yellow-300 font-medium ';
    } else if (nodeType === 'relay') {
      classes += 'bg-orange-50 border-orange-300 ';
    }
    
    if (node.hasChildren) {
      classes += 'cursor-pointer hover:bg-gray-100 ';
    }
    
    return classes;
  };

  // Status badges
  const renderStatusBadges = (node, nodeType) => {
    const badges = [];
    
    if (node.isNew) {
      badges.push(
        <span key="new" className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded font-medium">
          NEW
        </span>
      );
    } else if (node.isExisting) {
      badges.push(
        <span key="existing" className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded font-medium">
          EXISTING
        </span>
      );
    }
    
    if (nodeType === 'panel') {
      badges.push(
        <span key="panel" className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">
          PANEL
        </span>
      );
    } else if (nodeType === 'relay') {
      badges.push(
        <span key="relay" className="px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded">
          RELAY
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

  // Tree node component
  const TreeNode = ({ node, level = 0 }) => {
    const nodeType = getNodeType(node);
    const isExpanded = expandedNodes.has(node.wbsId);
    const nodeClasses = getNodeClasses(node, nodeType);

    return (
      <div key={node.wbsId} className="mb-1">
        <div
          className={nodeClasses}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={node.hasChildren ? () => toggleExpanded(node.wbsId) : undefined}
        >
          {getNodeIcon(node, nodeType, isExpanded)}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                {safeString(node.wbsCode)}
              </span>
              
              {renderStatusBadges(node, nodeType)}
            </div>
            
            <div className="text-sm mt-2 text-gray-700 font-medium">
              {safeString(node.name)}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              Level {node.level} • Type: {nodeType} • Children: {node.hasChildren ? (node.children?.length || 0) : 0} • {node.isNew ? 'NEW' : 'EXISTING'}
            </div>
          </div>
        </div>

        {node.hasChildren && isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.wbsId} node={child} level={level + 1} />
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
    let panels = 0;
    let relays = 0;
    
    const countNodes = (nodes) => {
      nodes.forEach(node => {
        total++;
        if (node.isNew) newNodes++;
        else if (node.isExisting) existingNodes++;
        
        const nodeType = getNodeType(node);
        if (nodeType === 'equipment') equipment++;
        if (nodeType === 'panel') panels++;
        if (nodeType === 'relay') relays++;
        
        if (node.children) countNodes(node.children);
      });
    };
    
    countNodes(treeData);
    
    return { total, newNodes, existingNodes, equipment, panels, relays };
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
          🏗️ FIXED WBS Hierarchy ({stats.total} nodes)
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

      {/* Statistics display */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-800">{stats.existingNodes}</div>
          <div className="text-sm text-blue-600">Existing</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded">
          <div className="text-2xl font-bold text-green-800">{stats.newNodes}</div>
          <div className="text-sm text-green-600">New</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded">
          <div className="text-2xl font-bold text-yellow-800">{stats.panels}</div>
          <div className="text-sm text-yellow-600">Panels</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded">
          <div className="text-2xl font-bold text-orange-800">{stats.relays}</div>
          <div className="text-sm text-orange-600">Relays</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded">
          <div className="text-2xl font-bold text-purple-800">{stats.equipment}</div>
          <div className="text-sm text-purple-600">Equipment</div>
        </div>
      </div>

      {/* Tree rendering */}
      <div className="max-h-96 overflow-y-auto border rounded p-4 bg-gray-50">
        {filteredTreeData.length > 0 ? (
          filteredTreeData.map(node => (
            <TreeNode key={node.wbsId} node={node} level={0} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No nodes to display with current filters
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <strong>FIXED:</strong> Using parent_wbs_id hierarchy from XER parser • Shows proper nested structure • TBC & Category 99 should now show children
      </div>
    </div>
  );
};

export default WBSTreeVisualization;
