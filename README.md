# WBS Generator V2.0 - Project Documentation

## Overview

The WBS Generator is a React-based web application designed to automatically convert equipment lists into properly structured Work Breakdown Structures (WBS) for import into Primavera P6 Professional. The tool automates the categorization and hierarchical organization of electrical/power system equipment according to established project management standards.

## Project Structure

### Modern Architecture (v4.0)
The application implements a standardized WBS structure:

```
Project Name (1000)
├── M | Milestones (1001)
├── P | Pre-requisites (1002)
├── S1 | [Subsystem Name] (1003)
│   ├── 01 | Preparations and set-up (1004)
│   ├── 02 | Protection Panels (1005)
│   ├── 03 | HV Switchboards (1006)
│   ├── 04 | LV Switchboards (1007)
│   ├── 05 | Transformers (1008)
│   ├── 06 | Battery Systems (1009)
│   ├── 07 | Earthing (1010)
│   ├── 08 | Building Services (1011)
│   ├── 09 | Interface Testing (1012)
│   │   ├── Phase 1 (1013)
│   │   └── Phase 2 (1014)
│   ├── 10 | Ancillary Systems (1015)
│   └── 99 | Unrecognised Equipment (1016)
├── S2 | [Next Subsystem] (1017)
│   └── [Same category structure]
└── TBC - Equipment To Be Confirmed (1XXX)
```

## P6 Numbering Requirements

### Critical P6 Import Specifications
Based on successful P6 imports, the numbering system must follow these exact requirements:

1. **Sequential Numbering**: No gaps in WBS code sequence (1000, 1001, 1002, 1003...)
2. **Root Node**: Single root node with `parent_wbs_code: null` (empty in CSV)
3. **Parent-Child Relationships**: Each node has exactly one parent (except root)
4. **Consistent Hierarchy**: All major sections are direct children of project root

### Export Format for P6
```
wbs_code	parent_wbs_code	wbs_name
1000		Project Name
1001	1000	M | Milestones
1002	1000	P | Pre-requisites
1003	1000	S1 | Subsystem Name
1004	1003	01 | Preparations and set-up
```

**File Format**: Tab-separated CSV (.csv) for optimal P6 compatibility

## Equipment Code Understanding

### Comprehensive Equipment Key (100+ Codes)
The application uses an extensive equipment categorization system:

#### 01 | Preparations and set-up
- Test, Panel Shop, Pad

#### 02 | Protection Panels
- **+UH, UH**: Protection Panels
- **-F, F**: Protection Relays
- **MP**: Marshalling Panel
- **P**: Power Quality Meter
- **CT**: Current Transformer
- **VT**: Voltage Transformer
- **MR**: Revenue Meter
- **HMI**: Human Machine Interface
- **KF**: Programmable Controller
- **Y**: Computer Network (e.g. Switches, GPS Clocks)

#### 03 | HV Switchboards
- **+WA, WA**: HV Switchgear Assembly
- **H**: HV Switchboard Tier
- **D**: HV Disconnector
- **CB**: Circuit Breaker
- **GCB**: Generator Circuit Breaker
- **SA**: Surge Arrester
- **LSW**: Load Break Switch

#### 04 | LV Switchboards
- **+WC, WC**: Distribution Board
- **MCC**: Motor Control Centre
- **DOL**: Direct Online
- **VFD**: Variable Frequency Drive
- **ATS**: Automatic Transfer Switch
- **MTS**: Manual Transfer Switch
- **Q**: Miniature Circuit Breaker
- **K**: Contactor/Relay

#### 05 | Transformers
- **T**: Transformer
- **NET**: Neutral Earthing Transformer
- **TA**: AC/DC converter
- **NER**: Neutral Earth Resistor

#### 06 | Battery Systems
- **+GB, GB**: Battery Systems
- **BCR**: Battery Charger
- **BAN**: Battery Bank
- **UPS**: Uninterruptible Power Supply

#### 07 | Earthing
- **E**: HV Earth Switch
- **EB**: Earth Bar
- **EEP**: Earthing Pit
- **MEB**: Main Earth Bar

#### 08 | Building Services
- **+HN, HN**: Building Services Equipment
- **PC**: Control Panel
- **FM**: Fire services
- **FIP**: Fire Indication Panel
- **LT**: Pole Mounted Flood Light
- **LTP**: Lighting Panel
- **LCT**: Lighting Circuit
- **GPO**: Power Outlet
- **VDO**: Voice/Data Outlet
- **ACS**: Access Control System
- **ACR**: Access Card Reader
- **CTV**: CCTV Camera
- **HRN**: Horn/Hooter
- **EHT**: Electrical Heat Trace
- **HTP**: Heat Tracing Panel
- **MCP**: Manual Call Point
- **DET**: Detector
- **ASD**: Aspirating Smoke Detection
- **IND**: Indicator Light (LED)
- **BEA**: Beacon/Strobe

#### 09 | Interface Testing
- **Phase 1**
- **Phase 2**

*Note: Interface Testing always contains Phase 1 and Phase 2 as standard sub-items for each subsystem.*

#### 10 | Ancillary Systems
- **+CA, CA**: Capacitor
- **PSU**: Power Supply Unit
- **UPS**: Uninterruptible Power Supply
- **ATS**: Automatic Transfer Switch
- **G**: Generator Set
- **BSG**: Black Start Generator
- **GTG**: Gas Turbine Generator
- **GT**: Gas Turbine
- **GC**: Solar Cell
- **WTG**: Wind Turbine Generator
- **SVC**: Static VAR Compensator
- **HFT**: Harmonic Filter
- **RA**: Reactor
- **R**: Resistor
- **FC**: Fuse
- **CP**: Control Panel
- **LCS**: Local Control Station
- **IOP**: I/O Panel
- **ITP**: Instrumentation Panel
- **IJB**: Instrument Junction Box
- **CPU**: Computer
- **X**: Generic Device
- **XB**: Substation HV Junction Box
- **XD**: Substation LV Junction Box

#### 99 | Unrecognised Equipment
- Equipment that doesn't match any of the above patterns

## Commissioning Filtering

### Critical Business Rule
Only equipment with specific commissioning status is included in WBS output:

- **Commissioning = "Y"**: ✅ Included in WBS structure
- **Commissioning = "TBC"**: ⏳ Placed in separate TBC section
- **Commissioning = "N"**: ❌ Completely excluded from WBS

### Example Data Processing
From 1,625 total equipment items:
- **221 items** with "Y" commissioning → Included in WBS
- **383 items** with "TBC" commissioning → Separate TBC section
- **1,021 items** with "N" commissioning → Excluded

## File Formats and Workflows

### Equipment List Input
**Supported Formats**: Excel (.xlsx, .xls), CSV (.csv)

**Required Columns** (for WBS generation):
- **Subsystem** - Equipment subsystem/area
- **Parent Equipment Number** - Parent equipment reference
- **Equipment Number** - Unique equipment identifier
- **Description** - Equipment description
- **Commissioning (Y/N)** - Commissioning status (Y/N/TBC)

**Optional Columns** (may be present but not required for WBS output):
- Project
- Item No.
- PLU (Product Line Unit)
- Supplier
- Manufacturer
- Model Number
- Test Code
- Comments
- Drawings

*Note: Equipment lists may contain additional columns beyond these - only the 5 required columns are used for WBS generation.*

### Three Workflow Modes

#### 1. Start New Project
- Upload equipment list
- Generate fresh WBS structure
- Outputs complete hierarchical WBS

#### 2. Continue Project
- Load existing WBS structure (CSV/Excel)
- Upload additional equipment
- Extends existing WBS with new equipment
- Maintains sequential numbering

#### 3. Add Missing Equipment
- Specify insertion point in existing WBS
- Upload individual equipment items
- Inserts at specified WBS location

### Export Formats

#### WBS CSV Export (P6 Compatible)
- **Format**: Tab-separated values
- **Filename**: `ProjectName_WBS_P6_Import.csv`
- **Purpose**: Direct import into Primavera P6
- **Structure**: `wbs_code`, `parent_wbs_code`, `wbs_name`

#### Project State Export (JSON)
- **Format**: JSON
- **Filename**: `ProjectName_project_state.json`
- **Purpose**: Technical backup and debugging
- **Contains**: Complete project metadata

## Technical Implementation

### Technology Stack
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **File Processing**: SheetJS (xlsx library)
- **Icons**: Lucide React
- **Deployment**: Vercel-compatible

### Key Components

#### WBSGenerator
- Main application logic
- File upload processing
- WBS structure generation
- Export functionality

#### WBSTreeVisualization
- Interactive tree view
- Expand/collapse functionality
- Search capabilities
- Color-coded categories

#### Equipment Categorization Engine
- Pattern matching for 100+ equipment codes
- Automatic subsystem organization
- Hierarchical structure generation

### Data Validation
- **P6 Structure Validation**: Ensures sequential numbering
- **Parent-Child Relationship Validation**: Confirms proper hierarchy
- **Equipment Code Validation**: Verifies categorization accuracy

## Usage Instructions

### Setup
1. Clone repository
2. Install dependencies: `npm install xlsx lucide-react`
3. Start development server: `npm run dev`
4. Deploy to Vercel or preferred platform

### Basic Workflow
1. **Choose Workflow**: Select Start New, Continue, or Add Missing
2. **Upload Equipment**: Excel or CSV file with equipment list
3. **Review Structure**: Use tree visualization to verify WBS
4. **Export for P6**: Download tab-separated CSV file
5. **Import to P6**: Use exported CSV in Primavera P6

### Advanced Features
- **Search WBS Nodes**: Find specific equipment or categories
- **Expand/Collapse Tree**: Navigate large WBS structures
- **Multiple Uploads**: Build WBS incrementally
- **State Management**: Save and resume projects

## Business Requirements Met

### Project Management Standards
- ✅ Modern Architecture (v4.0) implementation
- ✅ Numbered category system (01-10, 99)
- ✅ Single equipment instances (no duplication)
- ✅ Comprehensive equipment categorization

### P6 Integration
- ✅ Sequential WBS numbering
- ✅ Tab-separated CSV export
- ✅ Proper parent-child relationships
- ✅ Import-ready file format

### Equipment Management
- ✅ Commissioning status filtering
- ✅ 100+ equipment code recognition
- ✅ Automatic categorization
- ✅ Hierarchical organization

### User Experience
- ✅ Three distinct workflow modes
- ✅ Interactive tree visualization
- ✅ Multiple file format support
- ✅ Clear user guidance

## Version History

### V2.0 (Current)
- Modern Architecture (v4.0) as permanent default
- Comprehensive equipment key implementation
- P6-compatible numbering system
- Three-workflow UI design
- CSV/Excel state management
- Interactive tree visualization

### Future Enhancements
- Equipment filtering by category
- Bulk WBS code editing
- Export as PDF/image
- Integration with other project management tools
- Advanced search and filtering
- Custom category creation

---

**Deployment Ready**: This application V2.0 is production-ready and can be deployed immediately to Git/Vercel for use in electrical/power system projects requiring WBS generation for Primavera P6 import.
