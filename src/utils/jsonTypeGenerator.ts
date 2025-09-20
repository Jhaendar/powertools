/**
 * JSON Type Generation Utilities
 * Provides functions to analyze JSON structure and generate type definitions
 */

import { JSONSchema, GeneratedType, TypeGenerationOptions } from '@/types';

/**
 * Analyze JSON data and infer schema structure
 * @param data - Parsed JSON data
 * @returns JSONSchema representing the structure
 */
export function analyzeJSONStructure(data: any): JSONSchema {
  if (data === null) {
    return { type: 'null' };
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { type: 'array', items: { type: 'null' } };
    }

    // Analyze all items to find common structure
    const itemSchemas = data.map(item => analyzeJSONStructure(item));
    const mergedSchema = mergeSchemas(itemSchemas);
    
    // If we have mixed types in array, use unknown for safety
    const uniqueTypes = [...new Set(itemSchemas.map(s => s.type))];
    if (uniqueTypes.length > 2 || (uniqueTypes.length === 2 && !uniqueTypes.includes('null'))) {
      return { type: 'array', items: { type: 'string', nullable: true } }; // Default to string | null for mixed arrays
    }
    
    return { type: 'array', items: mergedSchema };
  }

  if (typeof data === 'object') {
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      properties[key] = analyzeJSONStructure(value);
      if (value !== null && value !== undefined) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }

  // Primitive types
  if (typeof data === 'string') return { type: 'string' };
  if (typeof data === 'number') return { type: 'number' };
  if (typeof data === 'boolean') return { type: 'boolean' };

  return { type: 'null' };
}

/**
 * Merge multiple schemas to find common structure
 * @param schemas - Array of schemas to merge
 * @returns Merged schema
 */
function mergeSchemas(schemas: JSONSchema[]): JSONSchema {
  if (schemas.length === 0) return { type: 'null' };
  if (schemas.length === 1) return schemas[0];

  // Find the most common type
  const types = schemas.map(s => s.type);
  const typeCount = types.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Check if null is present - if so, the result should be nullable
  const hasNull = types.includes('null');
  const nonNullTypes = types.filter(t => t !== 'null');
  
  if (nonNullTypes.length === 0) {
    return { type: 'null' };
  }
  
  // If all non-null types are the same, use that type with nullable flag
  const uniqueNonNullTypes = [...new Set(nonNullTypes)];
  if (uniqueNonNullTypes.length === 1) {
    const baseType = uniqueNonNullTypes[0];
    
    if (baseType === 'object') {
      // Merge object properties
      const allProperties: Record<string, JSONSchema[]> = {};
      const allRequired: Set<string> = new Set();
      
      schemas.filter(s => s.type === 'object').forEach(schema => {
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, propSchema]) => {
            if (!allProperties[key]) allProperties[key] = [];
            allProperties[key].push(propSchema);
          });
        }
        // Track required fields across all objects
        if (schema.required) {
          schema.required.forEach(field => allRequired.add(field));
        }
      });

      const mergedProperties: Record<string, JSONSchema> = {};
      const finalRequired: string[] = [];
      
      Object.entries(allProperties).forEach(([key, propSchemas]) => {
        mergedProperties[key] = mergeSchemas(propSchemas);
        // A field is required only if it appears in all objects and is required in all
        const appearsInAllObjects = propSchemas.length === schemas.filter(s => s.type === 'object').length;
        if (appearsInAllObjects && allRequired.has(key)) {
          finalRequired.push(key);
        }
      });

      return {
        type: 'object',
        properties: mergedProperties,
        required: finalRequired.length > 0 ? finalRequired : undefined,
        nullable: hasNull
      };
    }
    
    return { 
      type: baseType,
      nullable: hasNull
    };
  }

  // If multiple different non-null types, create a union by using the most common type
  // but mark as nullable to indicate mixed types
  const mostCommonType = Object.entries(typeCount)
    .filter(([type]) => type !== 'null')
    .sort(([,a], [,b]) => b - a)[0]?.[0] as JSONSchema['type'];

  return { 
    type: mostCommonType || 'null',
    nullable: true // Mark as nullable to indicate mixed/uncertain types
  };
}

/**
 * Generate TypeScript interface from JSON schema
 * @param schema - JSON schema
 * @param options - Generation options
 * @returns Generated TypeScript code
 */
export function generateTypeScriptInterface(
  schema: JSONSchema, 
  options: TypeGenerationOptions
): GeneratedType {
  const interfaces: string[] = [];
  const dependencies: string[] = [];
  const usedNames = new Set<string>();

  function generateInterface(schema: JSONSchema, name: string): string {
    if (schema.type !== 'object' || !schema.properties) {
      return `type ${name} = ${getTypeScriptType(schema)};`;
    }

    const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
      const isRequired = schema.required?.includes(key);
      const propType = getTypeScriptType(propSchema);
      
      // Handle nullable and optional fields properly
      if (propSchema.type === 'null') {
        // Pure null type - make it required null (not optional)
        return `  ${key}: null;`;
      } else if (propSchema.nullable && isRequired) {
        // Required but nullable field
        return `  ${key}: ${propType};`;
      } else if (!isRequired) {
        // Optional field
        return `  ${key}?: ${propType};`;
      } else {
        // Required non-nullable field
        return `  ${key}: ${propType};`;
      }
    });

    return `interface ${name} {\n${properties.join('\n')}\n}`;
  }

  function getTypeScriptType(schema: JSONSchema): string {
    let baseType: string;
    
    switch (schema.type) {
      case 'string': baseType = 'string'; break;
      case 'number': baseType = 'number'; break;
      case 'boolean': baseType = 'boolean'; break;
      case 'null': return 'null';
      case 'array':
        if (schema.items) {
          const itemType = getTypeScriptType(schema.items);
          // Handle union types in arrays properly with parentheses
          if (itemType.includes(' | ')) {
            baseType = `(${itemType})[]`;
          } else {
            baseType = `${itemType}[]`;
          }
        } else {
          baseType = 'unknown[]';
        }
        break;
      case 'object':
        if (schema.properties && Object.keys(schema.properties).length > 0) {
          // Generate unique nested interface name
          let nestedName = `${options.rootTypeName}Nested`;
          let counter = 0;
          while (usedNames.has(`${nestedName}${counter}`)) {
            counter++;
          }
          nestedName = `${nestedName}${counter}`;
          usedNames.add(nestedName);
          
          interfaces.push(generateInterface(schema, nestedName));
          baseType = nestedName;
        } else {
          baseType = 'Record<string, unknown>';
        }
        break;
      default:
        baseType = 'unknown';
    }
    
    // Add null union type if nullable
    return schema.nullable ? `${baseType} | null` : baseType;
  }

  // Add root type name to used names
  usedNames.add(options.rootTypeName);

  const mainInterface = generateInterface(schema, options.rootTypeName);
  interfaces.push(mainInterface);

  return {
    name: options.rootTypeName,
    content: interfaces.reverse().join('\n\n'),
    dependencies
  };
}

/**
 * Generate JSDoc type definitions from JSON schema
 * @param schema - JSON schema
 * @param options - Generation options
 * @returns Generated JSDoc code
 */
export function generateJSDocTypes(
  schema: JSONSchema,
  options: TypeGenerationOptions
): GeneratedType {
  const typedefs: string[] = [];
  const dependencies: string[] = [];
  const usedNames = new Set<string>();

  function generateTypedef(schema: JSONSchema, name: string): string {
    if (schema.type !== 'object' || !schema.properties) {
      return `/**\n * @typedef {${getJSDocType(schema)}} ${name}\n */`;
    }

    const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
      const isRequired = schema.required?.includes(key);
      const propType = getJSDocType(propSchema);
      
      // Handle nullable and optional fields properly in JSDoc
      if (propSchema.type === 'null') {
        // Pure null type - make it required null
        return ` * @property {null} ${key}`;
      } else if (propSchema.nullable && isRequired) {
        // Required but nullable field
        return ` * @property {${propType}} ${key}`;
      } else if (!isRequired) {
        // Optional field - use JSDoc optional syntax
        return ` * @property {${propType}} [${key}]`;
      } else {
        // Required non-nullable field
        return ` * @property {${propType}} ${key}`;
      }
    });

    return `/**\n * @typedef {Object} ${name}\n${properties.join('\n')}\n */`;
  }

  function getJSDocType(schema: JSONSchema): string {
    let baseType: string;
    
    switch (schema.type) {
      case 'string': baseType = 'string'; break;
      case 'number': baseType = 'number'; break;
      case 'boolean': baseType = 'boolean'; break;
      case 'null': return 'null';
      case 'array':
        if (schema.items) {
          const itemType = getJSDocType(schema.items);
          // Handle complex array types properly in JSDoc
          if (itemType.includes('|')) {
            baseType = `Array<${itemType}>`;
          } else {
            baseType = `Array<${itemType}>`;
          }
        } else {
          baseType = 'Array';
        }
        break;
      case 'object':
        if (schema.properties && Object.keys(schema.properties).length > 0) {
          // Generate unique nested type name
          let nestedName = `${options.rootTypeName}Nested`;
          let counter = 0;
          while (usedNames.has(`${nestedName}${counter}`)) {
            counter++;
          }
          nestedName = `${nestedName}${counter}`;
          usedNames.add(nestedName);
          
          typedefs.push(generateTypedef(schema, nestedName));
          baseType = nestedName;
        } else {
          baseType = 'Object';
        }
        break;
      default:
        baseType = '*';
    }
    
    // Add null union type if nullable using JSDoc union syntax
    return schema.nullable ? `(${baseType}|null)` : baseType;
  }

  // Add root type name to used names
  usedNames.add(options.rootTypeName);

  const mainTypedef = generateTypedef(schema, options.rootTypeName);
  typedefs.push(mainTypedef);

  return {
    name: options.rootTypeName,
    content: typedefs.reverse().join('\n\n'),
    dependencies
  };
}

/**
 * Generate Python TypedDict from JSON schema
 * @param schema - JSON schema
 * @param options - Generation options
 * @returns Generated Python TypedDict code
 */
export function generatePythonTypedDict(
  schema: JSONSchema,
  options: TypeGenerationOptions
): GeneratedType {
  const classes: string[] = [];
  const dependencies = ['from typing import TypedDict'];
  const usedNames = new Set<string>();
  let nestedCounter = 0;

  function generateTypedDict(schema: JSONSchema, name: string): string {
    if (schema.type !== 'object' || !schema.properties) {
      return `${name} = ${getPythonType(schema)}`;
    }

    const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
      const propType = getPythonType(propSchema);
      return `    ${key}: ${propType}`;
    });

    return `class ${name}(TypedDict):\n${properties.join('\n')}`;
  }

  function getPythonType(schema: JSONSchema): string {
    let baseType: string;
    
    switch (schema.type) {
      case 'string': baseType = 'str'; break;
      case 'number': baseType = 'float'; break;
      case 'boolean': baseType = 'bool'; break;
      case 'null': return 'None';
      case 'array':
        if (schema.items) {
          baseType = `list[${getPythonType(schema.items)}]`;
        } else {
          baseType = 'list';
        }
        break;
      case 'object':
        if (schema.properties && Object.keys(schema.properties).length > 0) {
          // Generate unique nested class name
          let nestedName = `${options.rootTypeName}Nested${nestedCounter}`;
          while (usedNames.has(nestedName)) {
            nestedCounter++;
            nestedName = `${options.rootTypeName}Nested${nestedCounter}`;
          }
          usedNames.add(nestedName);
          nestedCounter++;
          
          classes.push(generateTypedDict(schema, nestedName));
          baseType = nestedName;
        } else {
          baseType = 'dict';
        }
        break;
      default:
        baseType = 'object';
    }
    
    // Add None union type if nullable
    return schema.nullable ? `${baseType} | None` : baseType;
  }

  // Add root type name to used names
  usedNames.add(options.rootTypeName);

  const mainClass = generateTypedDict(schema, options.rootTypeName);
  classes.push(mainClass);

  return {
    name: options.rootTypeName,
    content: `${dependencies.join('\n')}\n\n${classes.reverse().join('\n\n')}`,
    dependencies: ['typing']
  };
}

/**
 * Generate Python dataclass from JSON schema
 * @param schema - JSON schema
 * @param options - Generation options
 * @returns Generated Python dataclass code
 */
export function generatePythonDataclass(
  schema: JSONSchema,
  options: TypeGenerationOptions
): GeneratedType {
  const classes: string[] = [];
  const dependencies: string[] = ['from dataclasses import dataclass'];
  const usedNames = new Set<string>();
  let nestedCounter = 0;
  let needsFieldImport = false;

  function generateDataclass(schema: JSONSchema, name: string): string {
    if (schema.type !== 'object' || !schema.properties) {
      return `${name} = ${getPythonType(schema)}`;
    }

    const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
      const isRequired = schema.required?.includes(key);
      const propType = getPythonType(propSchema);
      
      // Handle different field types and defaults
      if (propSchema.type === 'null') {
        // Pure null type - make it required null
        return `    ${key}: None`;
      } else if (!isRequired) {
        // Optional field - provide appropriate defaults
        if (propSchema.type === 'array') {
          needsFieldImport = true;
          return `    ${key}: ${propType} = field(default_factory=list)`;
        } else if (propSchema.type === 'object' && propSchema.properties) {
          // Optional nested object defaults to None
          return `    ${key}: ${propType} = None`;
        } else {
          // Optional field defaults to None
          return `    ${key}: ${propType} = None`;
        }
      } else if (propSchema.nullable) {
        // Required but nullable field - no default needed
        return `    ${key}: ${propType}`;
      } else {
        // Required non-nullable field
        return `    ${key}: ${propType}`;
      }
    });

    return `@dataclass\nclass ${name}:\n${properties.join('\n')}`;
  }

  function getPythonType(schema: JSONSchema): string {
    let baseType: string;
    
    switch (schema.type) {
      case 'string': baseType = 'str'; break;
      case 'number': baseType = 'float'; break;
      case 'boolean': baseType = 'bool'; break;
      case 'null': return 'None';
      case 'array':
        if (schema.items) {
          const itemType = getPythonType(schema.items);
          baseType = `list[${itemType}]`;
        } else {
          baseType = 'list';
        }
        break;
      case 'object':
        if (schema.properties && Object.keys(schema.properties).length > 0) {
          // Generate unique nested class name
          let nestedName = `${options.rootTypeName}Nested`;
          if (nestedCounter > 0) {
            nestedName += nestedCounter;
          }
          while (usedNames.has(nestedName)) {
            nestedCounter++;
            nestedName = `${options.rootTypeName}Nested${nestedCounter}`;
          }
          usedNames.add(nestedName);
          nestedCounter++;
          
          classes.push(generateDataclass(schema, nestedName));
          baseType = nestedName;
        } else {
          baseType = 'dict';
        }
        break;
      default:
        baseType = 'object';
    }
    
    // Add None union type if nullable using modern Python 3.10+ syntax
    return schema.nullable ? `${baseType} | None` : baseType;
  }

  // Add root type name to used names
  usedNames.add(options.rootTypeName);

  const mainClass = generateDataclass(schema, options.rootTypeName);
  classes.push(mainClass);

  // Add field import if needed
  if (needsFieldImport) {
    dependencies[0] = 'from dataclasses import dataclass, field';
  }

  return {
    name: options.rootTypeName,
    content: `${dependencies.join('\n')}\n\n${classes.reverse().join('\n\n')}`,
    dependencies: ['dataclasses']
  };
}

/**
 * Generate Pydantic v2 model from JSON schema
 * @param schema - JSON schema
 * @param options - Generation options
 * @returns Generated Pydantic model code
 */
export function generatePydanticModel(
  schema: JSONSchema,
  options: TypeGenerationOptions
): GeneratedType {
  const classes: string[] = [];
  const dependencies = ['from pydantic import BaseModel, Field'];
  const usedNames = new Set<string>();
  let nestedCounter = 0;

  function generateModel(schema: JSONSchema, name: string): string {
    if (schema.type !== 'object' || !schema.properties) {
      return `${name} = ${getPythonType(schema)}`;
    }

    const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
      const isRequired = schema.required?.includes(key);
      const propType = getPythonType(propSchema);
      
      // Handle different field types with proper Field definitions
      if (propSchema.type === 'null') {
        // Pure null type - make it required null
        return `    ${key}: None`;
      } else if (propSchema.nullable && isRequired) {
        // Required but nullable field - no default needed
        return `    ${key}: ${propType}`;
      } else if (!isRequired) {
        // Optional field - provide appropriate defaults with Field
        if (propSchema.type === 'array') {
          return `    ${key}: ${propType} = Field(default_factory=list)`;
        } else if (propSchema.type === 'object' && propSchema.properties) {
          // Optional nested object - check if already nullable
          const finalType = propType.includes(' | None') ? propType : `${propType} | None`;
          return `    ${key}: ${finalType} = None`;
        } else {
          // Optional field - check if already nullable
          const finalType = propType.includes(' | None') ? propType : `${propType} | None`;
          return `    ${key}: ${finalType} = None`;
        }
      } else {
        // Required non-nullable field
        return `    ${key}: ${propType}`;
      }
    });

    return `class ${name}(BaseModel):\n${properties.join('\n')}`;
  }

  function getPythonType(schema: JSONSchema): string {
    let baseType: string;
    
    switch (schema.type) {
      case 'string': baseType = 'str'; break;
      case 'number': 
        // Use int for whole numbers, float for decimals
        baseType = 'float'; 
        break;
      case 'boolean': baseType = 'bool'; break;
      case 'null': return 'None';
      case 'array':
        if (schema.items) {
          const itemType = getPythonType(schema.items);
          baseType = `list[${itemType}]`;
        } else {
          baseType = 'list';
        }
        break;
      case 'object':
        if (schema.properties && Object.keys(schema.properties).length > 0) {
          // Generate unique nested class name
          let nestedName = `${options.rootTypeName}Nested`;
          if (nestedCounter > 0) {
            nestedName += nestedCounter;
          }
          while (usedNames.has(nestedName)) {
            nestedCounter++;
            nestedName = `${options.rootTypeName}Nested${nestedCounter}`;
          }
          usedNames.add(nestedName);
          nestedCounter++;
          
          classes.push(generateModel(schema, nestedName));
          baseType = nestedName;
        } else {
          baseType = 'dict';
        }
        break;
      default:
        baseType = 'object';
    }
    
    // Add None union type if nullable using modern Python 3.10+ syntax
    return schema.nullable ? `${baseType} | None` : baseType;
  }

  // Add root type name to used names
  usedNames.add(options.rootTypeName);

  const mainClass = generateModel(schema, options.rootTypeName);
  classes.push(mainClass);

  return {
    name: options.rootTypeName,
    content: `${dependencies.join('\n')}\n\n${classes.reverse().join('\n\n')}`,
    dependencies: ['pydantic']
  };
}

/**
 * Parse and validate JSON input
 * @param input - JSON string input
 * @returns Parsed data or null if invalid
 */
export function parseJSONSafely(input: string): { data: any; error: string | null } {
  try {
    if (!input.trim()) {
      return { data: null, error: 'Input is empty' };
    }

    const data = JSON.parse(input);
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON format';
    return { data: null, error: message };
  }
}