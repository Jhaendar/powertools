# Requirements Document

## Introduction

This feature adds two new developer tools to the existing dev tools website: a JSON Structure/Type Generator and a Text Diff Checker. The JSON Structure/Type Generator will analyze JSON data and generate corresponding TypeScript interfaces or Python dataclasses/TypedDict structures. The Text Diff Checker will compare two text inputs and display differences in a GitHub-style diff format with line-by-line comparison, additions, deletions, and modifications highlighted.

## Requirements

### Requirement 1: JSON Structure/Type Generator Tool

**User Story:** As a developer, I want to paste JSON data and generate type definitions in multiple languages and formats, so that I can quickly create type-safe code structures without manually writing them.

#### Acceptance Criteria

1. WHEN a user navigates to the JSON Structure/Type Generator tool THEN the system SHALL display a clean interface with JSON input area, language/format selector, and generated output area
2. WHEN a user pastes valid JSON data into the input area THEN the system SHALL automatically parse and generate type definitions in real-time
3. WHEN a user selects TypeScript mode THEN the system SHALL generate TypeScript interfaces with proper typing for all JSON properties
4. WHEN a user selects JSDoc mode THEN the system SHALL generate JavaScript with JSDoc type annotations using @typedef and @type comments
5. WHEN a user selects Python TypedDict mode THEN the system SHALL generate TypedDict structures with modern type hints (using `|` for unions, `list[T]` for arrays)
6. WHEN a user selects Python Dataclass mode THEN the system SHALL generate dataclass structures with modern type hints and proper field definitions
7. WHEN a user selects Python Pydantic v2 mode THEN the system SHALL generate Pydantic BaseModel classes with modern type hints and field validation
8. WHEN the JSON contains nested objects THEN the system SHALL generate nested type definitions with proper relationships
9. WHEN the JSON contains arrays THEN the system SHALL infer array types and generate appropriate `Array<T>` (TypeScript), `list[T]` (Python), or `T[]` (JSDoc) annotations
10. WHEN the JSON contains null values THEN the system SHALL generate union types using modern syntax (`string | null` in TypeScript, `str | None` in Python)
11. WHEN invalid JSON is entered THEN the system SHALL display clear error messages without breaking the interface
12. WHEN the generated output is displayed THEN the system SHALL provide a copy-to-clipboard button for easy use
13. WHEN the user switches between different language/format modes THEN the system SHALL regenerate the output in the selected format
14. WHEN generating Python code THEN the system SHALL use modern type hints compatible with Python 3.10+ (no `Optional`, `List`, or `Union` imports needed)

### Requirement 2: Text Diff Checker Tool

**User Story:** As a developer, I want to compare two text blocks and see differences highlighted in a GitHub-style diff format, so that I can quickly identify changes between versions of code, configuration files, or documentation.

#### Acceptance Criteria

1. WHEN a user navigates to the Text Diff Checker tool THEN the system SHALL display two side-by-side text input areas labeled "Original" and "Modified"
2. WHEN a user enters text in both input areas THEN the system SHALL automatically generate and display a diff comparison below the inputs
3. WHEN there are line additions THEN the system SHALL highlight them in green with a "+" prefix similar to GitHub diffs
4. WHEN there are line deletions THEN the system SHALL highlight them in red with a "-" prefix similar to GitHub diffs
5. WHEN there are line modifications THEN the system SHALL show both the old (red) and new (green) versions
6. WHEN there are no differences THEN the system SHALL display a message indicating the texts are identical
7. WHEN the diff is generated THEN the system SHALL include line numbers for easy reference
8. WHEN the diff output is displayed THEN the system SHALL provide a copy-to-clipboard button for the diff result
9. WHEN large text blocks are compared THEN the system SHALL handle the comparison efficiently without UI freezing
10. WHEN the user clears one or both input areas THEN the system SHALL clear the diff output accordingly

### Requirement 3: Tool Integration and Navigation

**User Story:** As a user of the dev tools website, I want the new tools to be seamlessly integrated into the existing navigation and tool registry system, so that I can access them consistently with other tools.

#### Acceptance Criteria

1. WHEN the tools are implemented THEN they SHALL be automatically registered in the tool registry system
2. WHEN a user views the sidebar navigation THEN both new tools SHALL appear in the tools list with appropriate icons
3. WHEN a user clicks on either tool in the navigation THEN the system SHALL route to the tool with proper URL handling
4. WHEN a user uses browser back/forward buttons THEN the navigation SHALL work correctly between tools
5. WHEN the tools are loaded THEN they SHALL use lazy loading consistent with existing tools for optimal performance
6. WHEN errors occur in either tool THEN they SHALL be wrapped in the existing error boundary system
7. WHEN the tools are used THEN they SHALL persist user input using the existing state persistence utilities
8. WHEN the page is refreshed THEN user inputs SHALL be restored from persistent storage
9. WHEN the tools are accessed on mobile devices THEN they SHALL be responsive and touch-friendly
10. WHEN the tools are tested THEN they SHALL have comprehensive unit tests following the existing testing patterns