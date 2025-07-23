// src/components/shared/StartNewProjectVisualization.jsx - Focused StartNewProject visualization

import React, { useState, useMemo } from 'react';
import { 
  rjeColors, 
  safeString, 
  getNodeType, 
  getNodeIcon, 
  getNodeClasses, 
  renderStatusBadges,
  ControlButtons,
  StatsDisplay,
  buildStandardHierarchy
} from './WBSVisualizationUtils.jsx';

const StartNewProjectVisualization = ({ wbsNodes = [] }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));

  // Build tree structure using standard hierarchy builder
  const treeData = useMemo(() => {
    console.log('🚀 StartNewProject: Processing', wbsNodes.length, 'WBS nodes');
    return buildStandardHierarchy(wbsNodes);
  }, [wbsNodes]);

  // Expand/collapse handlers
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
          allIds.add(node.wbsCode);
          collectIds(node.children);
        }
      });
    };
    collectIds(treeData);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  // Tree node component
  const TreeNode = ({ node, level = 0 }) => {
    const nodeType = getNodeType(node);
    const isExpanded = expandedNodes.has(node.wbsCode);
    const nodeClasses = getNodeClasses(node, nodeType);

    return (
      <div key={node.wbsCode} className="mb-1">
        <div
          className={nodeClasses}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={node.hasChildren ? () => toggleExpanded(node.wbsCode) : undefined}
        >
          {getNodeIcon(node, nodeType, isExpanded)}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-medium text-white bg-gray-800 px-2 py-1 rounded">
                {safeString(node.wbsCode)}
              </span>
              
              {renderStatusBadges(node, nodeType)}
            </div>
            
            <div className="text-sm mt-2 text-gray-700 font-medium">
              {safeString(node.name)}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              Level {level} • Type: {nodeType} • Children: {node.hasChildren ? (node.children?.length || 0) : 0}
            </div>
          </div>
        </div>

        {node.hasChildren && isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.wbsCode} node={child} level={level + 1} />
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

  // Auto-expand to show level 2 by default (as per requirements)
  React.useEffect(() => {
    if (treeData.length > 0) {
      const level2Ids = new Set(['root']);
      
      // Collect level 1 and level 2 node IDs for auto-expansion
      treeData.forEach(rootNode => {
        level2Ids.add(rootNode.wbsCode);
        if (rootNode.children) {
          rootNode.children.forEach(level1Node => {
            level2Ids.add(level1Node.wbsCode);
          });
        }
      });
      
      setExpandedNodes(level2Ids);
    }
  }, [treeData]);

  if (!Array.isArray(wbsNodes) || wbsNodes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: rjeColors.darkBlue }}>
          WBS Structure Preview
        </h3>
        <div className="text-center py-8 text-gray-500">
          No WBS structure to display. Upload an equipment list to generate the WBS.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold" style={{ color: rjeColors.darkBlue }}>
          🚀 New Project WBS Structure ({stats.total} nodes)
        </h3>
        
        <ControlButtons
          showOnlyNew={false}
          setShowOnlyNew={() => {}}
          showOnlyExisting={false}
          setShowOnlyExisting={() => {}}
          expandAll={expandAll}
          collapseAll={collapseAll}
          showNewToggle={false}
          showExistingToggle={false}
        />
      </div>

      <StatsDisplay stats={stats} />

      {/* Project Structure Info */}
      <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
        <h4 className="font-medium text-blue-800 mb-2">
          📋 Generated Project Structure
        </h4>
        <p className="text-sm text-blue-700">
          WBS codes follow hierarchical numbering (1.2.3 format). 
          Level 2 elements are expanded by default. Click any parent node to expand/collapse children.
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Equipment categorized using 100+ pattern recognition rules into categories 01-10, 99
        </p>
      </div>

      {/* Tree rendering */}
      <div className="max-h-96 overflow-y-auto border rounded p-4 bg-gray-50">
        {treeData.length > 0 ? (
          treeData.map(node => (
            <TreeNode key={node.wbsCode} node={node} level={0} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            Unable to build hierarchy from provided data
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <strong>🚀 Start New Project:</strong> Fresh WBS structure generated from equipment list with proper hierarchical numbering
      </div>
    </div>
  );
};

export default StartNewProjectVisualization;
