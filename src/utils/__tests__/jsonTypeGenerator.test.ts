/**
 * Tests for JSON Type Generator utilities
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeJSONStructure,
  generateTypeScriptInterface,
  generateJSDocTypes,
  generatePythonTypedDict,
  generatePythonDataclass,
  generatePydanticModel,
  parseJSONSafely
} from '../jsonTypeGenerator';

describe('analyzeJSONStructure', () => {
  it('should analyze simple object structure', () => {
    const data = { name: 'John', age: 30, active: true };
    const schema = analyzeJSONStructure(data);
    
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
    expect(schema.properties!.name.type).toBe('string');
    expect(schema.properties!.age.type).toBe('number');
    expect(schema.properties!.active.type).toBe('boolean');
    expect(schema.required).toEqual(['name', 'age', 'active']);
  });

  it('should handle null values', () => {
    const data = { name: 'John', email: null };
    const schema = analyzeJSONStructure(data);
    
    expect(schema.properties!.name.type).toBe('string');
    expect(schema.properties!.email.type).toBe('null');
    expect(schema.required).toEqual(['name']);
  });

  it('should analyze array structures', () => {
    const data = [1, 2, 3];
    const schema = analyzeJSONStructure(data);
    
    expect(schema.type).toBe('array');
    expect(schema.items!.type).toBe('number');
  });

  it('should handle nested objects', () => {
    const data = {
      user: {
        name: 'John',
        profile: { bio: 'Developer' }
      }
    };
    const schema = analyzeJSONStructure(data);
    
    expect(schema.type).toBe('object');
    expect(schema.properties!.user.type).toBe('object');
    expect(schema.properties!.user.properties!.name.type).toBe('string');
    expect(schema.properties!.user.properties!.profile.type).toBe('object');
  });

  it('should handle empty arrays', () => {
    const data = { items: [] };
    const schema = analyzeJSONStructure(data);
    
    expect(schema.properties!.items.type).toBe('array');
    expect(schema.properties!.items.items!.type).toBe('null');
  });

  it('should handle mixed null and non-null values in arrays', () => {
    const data = ['hello', null, 'world'];
    const schema = analyzeJSONStructure(data);
    
    expect(schema.type).toBe('array');
    expect(schema.items!.type).toBe('string');
    expect(schema.items!.nullable).toBe(true);
  });
});

describe('generateTypeScriptInterface', () => {
  it('should generate TypeScript interface for simple object', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'number' as const }
      },
      required: ['name', 'age']
    };

    const result = generateTypeScriptInterface(schema, {
      format: 'typescript',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('interface User');
    expect(result.content).toContain('name: string;');
    expect(result.content).toContain('age: number;');
  });

  it('should handle optional fields', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const }
      },
      required: ['name']
    };

    const result = generateTypeScriptInterface(schema, {
      format: 'typescript',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: string;');
    expect(result.content).toContain('email?: string;');
  });

  it('should handle arrays', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const }
        }
      }
    };

    const result = generateTypeScriptInterface(schema, {
      format: 'typescript',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('tags?: string[];');
  });

  it('should generate union types for nullable fields', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const, nullable: true }
      },
      required: ['name']
    };

    const result = generateTypeScriptInterface(schema, {
      format: 'typescript',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: string;');
    expect(result.content).toContain('email?: string | null;');
  });

  it('should handle nested interfaces with unique naming', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        user: {
          type: 'object' as const,
          properties: {
            profile: {
              type: 'object' as const,
              properties: {
                name: { type: 'string' as const }
              }
            }
          }
        },
        settings: {
          type: 'object' as const,
          properties: {
            theme: { type: 'string' as const }
          }
        }
      }
    };

    const result = generateTypeScriptInterface(schema, {
      format: 'typescript',
      rootTypeName: 'App',
      useOptionalFields: true
    });

    // Should have unique nested interface names
    expect(result.content).toContain('AppNested0');
    expect(result.content).toContain('AppNested1');
    expect(result.content).toContain('AppNested2');
    // Should have proper interface definitions (not duplicate interface declarations)
    expect(result.content.match(/interface AppNested0/g)?.length).toBe(1);
    expect(result.content.match(/interface AppNested1/g)?.length).toBe(1);
    expect(result.content.match(/interface AppNested2/g)?.length).toBe(1);
  });

  it('should handle arrays with union types properly', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        mixed: {
          type: 'array' as const,
          items: { type: 'string' as const, nullable: true }
        }
      }
    };

    const result = generateTypeScriptInterface(schema, {
      format: 'typescript',
      rootTypeName: 'Test',
      useOptionalFields: true
    });

    expect(result.content).toContain('mixed?: (string | null)[];');
  });

  it('should handle pure null fields correctly', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        nullField: { type: 'null' as const }
      },
      required: ['name', 'nullField']
    };

    const result = generateTypeScriptInterface(schema, {
      format: 'typescript',
      rootTypeName: 'Test',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: string;');
    expect(result.content).toContain('nullField: null;');
  });
});

describe('generateJSDocTypes', () => {
  it('should generate JSDoc typedef for simple object', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'number' as const }
      },
      required: ['name', 'age']
    };

    const result = generateJSDocTypes(schema, {
      format: 'jsdoc',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('@typedef {Object} User');
    expect(result.content).toContain('@property {string} name');
    expect(result.content).toContain('@property {number} age');
  });

  it('should handle optional fields with brackets', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const }
      },
      required: ['name']
    };

    const result = generateJSDocTypes(schema, {
      format: 'jsdoc',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('@property {string} name');
    expect(result.content).toContain('@property {string} [email]');
  });

  it('should handle arrays with proper JSDoc syntax', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const }
        },
        scores: {
          type: 'array' as const,
          items: { type: 'number' as const }
        }
      },
      required: ['tags']
    };

    const result = generateJSDocTypes(schema, {
      format: 'jsdoc',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('@property {Array<string>} tags');
    expect(result.content).toContain('@property {Array<number>} [scores]');
  });

  it('should handle union types with proper JSDoc syntax', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const, nullable: true },
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const, nullable: true }
        }
      },
      required: ['name', 'email']
    };

    const result = generateJSDocTypes(schema, {
      format: 'jsdoc',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('@property {string} name');
    expect(result.content).toContain('@property {(string|null)} email');
    expect(result.content).toContain('@property {Array<(string|null)>} [tags]');
  });

  it('should handle nested objects with proper typedef generation', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        profile: {
          type: 'object' as const,
          properties: {
            bio: { type: 'string' as const },
            avatar: { type: 'string' as const, nullable: true }
          },
          required: ['bio']
        },
        settings: {
          type: 'object' as const,
          properties: {
            theme: { type: 'string' as const },
            notifications: { type: 'boolean' as const }
          },
          required: ['theme', 'notifications']
        }
      },
      required: ['name', 'profile']
    };

    const result = generateJSDocTypes(schema, {
      format: 'jsdoc',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    // Should generate nested typedefs
    expect(result.content).toContain('@typedef {Object} UserNested0');
    expect(result.content).toContain('@typedef {Object} UserNested1');
    expect(result.content).toContain('@typedef {Object} User');
    
    // Should reference nested types in main typedef
    expect(result.content).toContain('@property {UserNested0} profile');
    expect(result.content).toContain('@property {UserNested1} [settings]');
    
    // Should handle nested properties correctly
    expect(result.content).toContain('@property {string} bio');
    expect(result.content).toContain('@property {(string|null)} [avatar]');
    expect(result.content).toContain('@property {string} theme');
    expect(result.content).toContain('@property {boolean} notifications');
  });

  it('should handle complex nested arrays', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        users: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              roles: {
                type: 'array' as const,
                items: { type: 'string' as const }
              }
            },
            required: ['name']
          }
        }
      }
    };

    const result = generateJSDocTypes(schema, {
      format: 'jsdoc',
      rootTypeName: 'Company',
      useOptionalFields: true
    });

    // Should generate nested typedef for array items
    expect(result.content).toContain('@typedef {Object} CompanyNested0');
    expect(result.content).toContain('@property {string} name');
    expect(result.content).toContain('@property {Array<string>} [roles]');
    
    // Should reference nested type in array
    expect(result.content).toContain('@property {Array<CompanyNested0>} [users]');
  });

  it('should handle pure null fields correctly', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        nullField: { type: 'null' as const }
      },
      required: ['name', 'nullField']
    };

    const result = generateJSDocTypes(schema, {
      format: 'jsdoc',
      rootTypeName: 'Test',
      useOptionalFields: true
    });

    expect(result.content).toContain('@property {string} name');
    expect(result.content).toContain('@property {null} nullField');
  });

  it('should handle empty objects', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        metadata: {
          type: 'object' as const,
          properties: {}
        }
      }
    };

    const result = generateJSDocTypes(schema, {
      format: 'jsdoc',
      rootTypeName: 'Document',
      useOptionalFields: true
    });

    expect(result.content).toContain('@property {Object} [metadata]');
  });

  it('should generate unique names for nested types', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        first: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const }
          }
        },
        second: {
          type: 'object' as const,
          properties: {
            value: { type: 'number' as const }
          }
        }
      }
    };

    const result = generateJSDocTypes(schema, {
      format: 'jsdoc',
      rootTypeName: 'Test',
      useOptionalFields: true
    });

    // Should have unique nested type names
    expect(result.content).toContain('TestNested0');
    expect(result.content).toContain('TestNested1');
    // Should not have duplicate typedef declarations
    expect(result.content.match(/@typedef {Object} TestNested0/g)?.length).toBe(1);
    expect(result.content.match(/@typedef {Object} TestNested1/g)?.length).toBe(1);
  });
});

describe('generatePythonTypedDict', () => {
  it('should generate Python TypedDict', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'number' as const }
      }
    };

    const result = generatePythonTypedDict(schema, {
      format: 'python-typeddict',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('from typing import TypedDict');
    expect(result.content).toContain('class User(TypedDict):');
    expect(result.content).toContain('name: str');
    expect(result.content).toContain('age: float');
  });

  it('should use modern type hints', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const }
        }
      }
    };

    const result = generatePythonTypedDict(schema, {
      format: 'python-typeddict',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('tags: list[str]');
  });

  it('should generate union types with None for nullable fields', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const, nullable: true }
      }
    };

    const result = generatePythonTypedDict(schema, {
      format: 'python-typeddict',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: str');
    expect(result.content).toContain('email: str | None');
  });

  it('should handle nested TypedDict definitions', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        user: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            profile: {
              type: 'object' as const,
              properties: {
                bio: { type: 'string' as const },
                avatar_url: { type: 'string' as const, nullable: true }
              }
            }
          }
        },
        metadata: {
          type: 'object' as const,
          properties: {
            created_at: { type: 'string' as const },
            updated_at: { type: 'string' as const, nullable: true }
          }
        }
      }
    };

    const result = generatePythonTypedDict(schema, {
      format: 'python-typeddict',
      rootTypeName: 'ApiResponse',
      useOptionalFields: true
    });

    // Should generate nested TypedDict classes
    expect(result.content).toContain('from typing import TypedDict');
    expect(result.content).toContain('class ApiResponseNested0(TypedDict):');
    expect(result.content).toContain('class ApiResponseNested1(TypedDict):');
    expect(result.content).toContain('class ApiResponseNested2(TypedDict):');
    expect(result.content).toContain('class ApiResponse(TypedDict):');
    
    // Should use modern type hints with | for unions
    expect(result.content).toContain('avatar_url: str | None');
    expect(result.content).toContain('updated_at: str | None');
    
    // Should reference nested types
    expect(result.content).toContain('user: ApiResponseNested0');
    expect(result.content).toContain('metadata: ApiResponseNested2');
    expect(result.content).toContain('profile: ApiResponseNested1');
  });

  it('should handle complex arrays with modern type hints', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        users: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              tags: {
                type: 'array' as const,
                items: { type: 'string' as const, nullable: true }
              }
            }
          }
        },
        scores: {
          type: 'array' as const,
          items: { type: 'number' as const }
        }
      }
    };

    const result = generatePythonTypedDict(schema, {
      format: 'python-typeddict',
      rootTypeName: 'Data',
      useOptionalFields: true
    });

    // Should use modern list[T] syntax
    expect(result.content).toContain('users: list[DataNested0]');
    expect(result.content).toContain('scores: list[float]');
    expect(result.content).toContain('tags: list[str | None]');
    
    // Should generate nested TypedDict for array items
    expect(result.content).toContain('class DataNested0(TypedDict):');
    expect(result.content).toContain('name: str');
  });

  it('should not use legacy typing imports', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, nullable: true },
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const }
        }
      }
    };

    const result = generatePythonTypedDict(schema, {
      format: 'python-typeddict',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    // Should use modern syntax, not legacy imports
    expect(result.content).not.toContain('Optional');
    expect(result.content).not.toContain('List');
    expect(result.content).not.toContain('Union');
    expect(result.content).toContain('str | None');
    expect(result.content).toContain('list[str]');
  });
});

describe('generatePythonDataclass', () => {
  it('should generate Python dataclass', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'number' as const }
      },
      required: ['name', 'age']
    };

    const result = generatePythonDataclass(schema, {
      format: 'python-dataclass',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('from dataclasses import dataclass');
    expect(result.content).toContain('@dataclass');
    expect(result.content).toContain('class User:');
    expect(result.content).toContain('name: str');
    expect(result.content).toContain('age: float');
  });

  it('should handle optional fields with defaults', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const }
        }
      },
      required: ['name']
    };

    const result = generatePythonDataclass(schema, {
      format: 'python-dataclass',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: str');
    expect(result.content).toContain('tags: list[str] = field(default_factory=list)');
  });
});

describe('generatePydanticModel', () => {
  it('should generate Pydantic v2 model with proper imports', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'number' as const }
      },
      required: ['name', 'age']
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('from pydantic import BaseModel, Field');
    expect(result.content).toContain('class User(BaseModel):');
    expect(result.content).toContain('name: str');
    expect(result.content).toContain('age: float');
    expect(result.dependencies).toContain('pydantic');
  });

  it('should handle required and optional fields correctly', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const },
        age: { type: 'number' as const }
      },
      required: ['name']
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: str');
    expect(result.content).toContain('email: str | None = None');
    expect(result.content).toContain('age: float | None = None');
  });

  it('should handle Field defaults for arrays', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const }
        }
      },
      required: ['name']
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: str');
    expect(result.content).toContain('tags: list[str] = Field(default_factory=list)');
  });

  it('should handle nullable required fields', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const, nullable: true }
      },
      required: ['name', 'email']
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: str');
    expect(result.content).toContain('email: str | None');
    expect(result.content).not.toContain('email: str | None = None');
  });

  it('should handle pure null fields', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        nullField: { type: 'null' as const }
      },
      required: ['name', 'nullField']
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'Test',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: str');
    expect(result.content).toContain('nullField: None');
  });

  it('should generate nested models with unique names', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        user: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            profile: {
              type: 'object' as const,
              properties: {
                bio: { type: 'string' as const },
                avatar_url: { type: 'string' as const, nullable: true }
              },
              required: ['bio']
            }
          },
          required: ['name']
        },
        metadata: {
          type: 'object' as const,
          properties: {
            created_at: { type: 'string' as const },
            updated_at: { type: 'string' as const }
          },
          required: ['created_at', 'updated_at']
        }
      },
      required: ['user']
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'ApiResponse',
      useOptionalFields: true
    });

    // Should generate nested model classes with unique names
    expect(result.content).toContain('class ApiResponseNested(BaseModel):');
    expect(result.content).toContain('class ApiResponseNested1(BaseModel):');
    expect(result.content).toContain('class ApiResponseNested2(BaseModel):');
    expect(result.content).toContain('class ApiResponse(BaseModel):');
    
    // Should reference nested types correctly
    expect(result.content).toContain('user: ApiResponseNested');
    expect(result.content).toContain('metadata: ApiResponseNested2 | None = None');
    expect(result.content).toContain('profile: ApiResponseNested1');
    
    // Should handle nested field requirements
    expect(result.content).toContain('bio: str');
    expect(result.content).toContain('avatar_url: str | None = None');
    expect(result.content).toContain('created_at: str');
    expect(result.content).toContain('updated_at: str');
  });

  it('should handle complex arrays with nested objects', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        users: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              roles: {
                type: 'array' as const,
                items: { type: 'string' as const }
              }
            },
            required: ['name']
          }
        },
        tags: {
          type: 'array' as const,
          items: { type: 'string' as const, nullable: true }
        }
      }
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'Company',
      useOptionalFields: true
    });

    // Should generate nested model for array items
    expect(result.content).toContain('class CompanyNested(BaseModel):');
    expect(result.content).toContain('name: str');
    expect(result.content).toContain('roles: list[str] = Field(default_factory=list)');
    
    // Should use modern type hints for arrays
    expect(result.content).toContain('users: list[CompanyNested] = Field(default_factory=list)');
    expect(result.content).toContain('tags: list[str | None] = Field(default_factory=list)');
  });

  it('should use modern Python 3.10+ type hints', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, nullable: true },
        scores: {
          type: 'array' as const,
          items: { type: 'number' as const }
        },
        metadata: {
          type: 'object' as const,
          properties: {
            key: { type: 'string' as const }
          }
        }
      },
      required: ['name']
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'Document',
      useOptionalFields: true
    });

    // Should use modern union syntax with |
    expect(result.content).toContain('name: str | None');
    expect(result.content).toContain('list[float]');
    expect(result.content).toContain('DocumentNested | None = None');
    
    // Should not use legacy typing imports
    expect(result.content).not.toContain('Optional');
    expect(result.content).not.toContain('List');
    expect(result.content).not.toContain('Union');
  });

  it('should handle optional nested objects correctly', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        profile: {
          type: 'object' as const,
          properties: {
            bio: { type: 'string' as const }
          },
          required: ['bio']
        }
      },
      required: ['name']
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'User',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: str');
    expect(result.content).toContain('profile: UserNested | None = None');
    expect(result.content).toContain('class UserNested(BaseModel):');
    expect(result.content).toContain('bio: str');
  });

  it('should handle empty objects', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        metadata: {
          type: 'object' as const,
          properties: {}
        }
      },
      required: ['name']
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'Document',
      useOptionalFields: true
    });

    expect(result.content).toContain('name: str');
    expect(result.content).toContain('metadata: dict | None = None');
  });
});

describe('parseJSONSafely', () => {
  it('should parse valid JSON', () => {
    const result = parseJSONSafely('{"name": "John", "age": 30}');
    
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: 'John', age: 30 });
  });

  it('should handle invalid JSON', () => {
    const result = parseJSONSafely('{"name": "John", "age":}');
    
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
    expect(result.error).toContain('JSON');
  });

  it('should handle empty input', () => {
    const result = parseJSONSafely('');
    
    expect(result.error).toBe('Input is empty');
    expect(result.data).toBeNull();
  });

  it('should handle whitespace-only input', () => {
    const result = parseJSONSafely('   \n\t  ');
    
    expect(result.error).toBe('Input is empty');
    expect(result.data).toBeNull();
  });

  it('should parse complex nested JSON', () => {
    const complexJSON = JSON.stringify({
      users: [
        { name: 'John', profile: { bio: 'Developer', tags: ['js', 'react'] } },
        { name: 'Jane', profile: null }
      ],
      metadata: { version: 1.0, active: true }
    });
    
    const result = parseJSONSafely(complexJSON);
    
    expect(result.error).toBeNull();
    expect(result.data.users).toHaveLength(2);
    expect(result.data.users[0].profile.tags).toEqual(['js', 'react']);
  });

  it('should handle JSON with special characters', () => {
    const result = parseJSONSafely('{"message": "Hello\\nWorld\\t!"}');
    
    expect(result.error).toBeNull();
    expect(result.data.message).toBe('Hello\nWorld\t!');
  });

  it('should handle JSON with unicode characters', () => {
    const result = parseJSONSafely('{"emoji": "🚀", "chinese": "你好"}');
    
    expect(result.error).toBeNull();
    expect(result.data.emoji).toBe('🚀');
    expect(result.data.chinese).toBe('你好');
  });

  it('should handle very large numbers', () => {
    const result = parseJSONSafely('{"bigNumber": 9007199254740991, "decimal": 3.141592653589793}');
    
    expect(result.error).toBeNull();
    expect(result.data.bigNumber).toBe(9007199254740991);
    expect(result.data.decimal).toBe(3.141592653589793);
  });

  it('should handle arrays with mixed types', () => {
    const result = parseJSONSafely('{"mixed": [1, "string", true, null, {"nested": "object"}]}');
    
    expect(result.error).toBeNull();
    expect(result.data.mixed).toHaveLength(5);
    expect(result.data.mixed[4].nested).toBe('object');
  });
});

// Additional edge case tests for analyzeJSONStructure
describe('analyzeJSONStructure - Edge Cases', () => {
  it('should handle deeply nested objects', () => {
    const deepObject = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: 'deep'
            }
          }
        }
      }
    };
    
    const schema = analyzeJSONStructure(deepObject);
    
    expect(schema.type).toBe('object');
    expect(schema.properties!.level1.type).toBe('object');
    expect(schema.properties!.level1.properties!.level2.type).toBe('object');
    expect(schema.properties!.level1.properties!.level2.properties!.level3.type).toBe('object');
    expect(schema.properties!.level1.properties!.level2.properties!.level3.properties!.level4.type).toBe('object');
    expect(schema.properties!.level1.properties!.level2.properties!.level3.properties!.level4.properties!.value.type).toBe('string');
  });

  it('should handle arrays with complex mixed types', () => {
    const data = [
      { type: 'user', name: 'John' },
      { type: 'admin', name: 'Jane', permissions: ['read', 'write'] },
      null,
      'string item'
    ];
    
    const schema = analyzeJSONStructure(data);
    
    expect(schema.type).toBe('array');
    // Should default to string | null for mixed arrays
    expect(schema.items!.type).toBe('string');
    expect(schema.items!.nullable).toBe(true);
  });

  it('should handle objects with numeric keys', () => {
    const data = {
      '0': 'first',
      '1': 'second',
      '10': 'tenth',
      'normal_key': 'value'
    };
    
    const schema = analyzeJSONStructure(data);
    
    expect(schema.type).toBe('object');
    expect(schema.properties!['0'].type).toBe('string');
    expect(schema.properties!['1'].type).toBe('string');
    expect(schema.properties!['10'].type).toBe('string');
    expect(schema.properties!.normal_key.type).toBe('string');
  });

  it('should handle objects with special character keys', () => {
    const data = {
      'key-with-dashes': 'value1',
      'key_with_underscores': 'value2',
      'key with spaces': 'value3',
      'key.with.dots': 'value4',
      '@special': 'value5',
      '$dollar': 'value6'
    };
    
    const schema = analyzeJSONStructure(data);
    
    expect(schema.type).toBe('object');
    expect(schema.properties!['key-with-dashes'].type).toBe('string');
    expect(schema.properties!['key_with_underscores'].type).toBe('string');
    expect(schema.properties!['key with spaces'].type).toBe('string');
    expect(schema.properties!['key.with.dots'].type).toBe('string');
    expect(schema.properties!['@special'].type).toBe('string');
    expect(schema.properties!['$dollar'].type).toBe('string');
  });

  it('should handle very large arrays', () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }));
    
    const schema = analyzeJSONStructure(largeArray);
    
    expect(schema.type).toBe('array');
    expect(schema.items!.type).toBe('object');
    expect(schema.items!.properties!.id.type).toBe('number');
    expect(schema.items!.properties!.value.type).toBe('string');
  });

  it('should handle objects with undefined-like values', () => {
    const data = {
      nullValue: null,
      emptyString: '',
      zeroNumber: 0,
      falseBoolean: false,
      emptyArray: [],
      emptyObject: {}
    };
    
    const schema = analyzeJSONStructure(data);
    
    expect(schema.properties!.nullValue.type).toBe('null');
    expect(schema.properties!.emptyString.type).toBe('string');
    expect(schema.properties!.zeroNumber.type).toBe('number');
    expect(schema.properties!.falseBoolean.type).toBe('boolean');
    expect(schema.properties!.emptyArray.type).toBe('array');
    expect(schema.properties!.emptyObject.type).toBe('object');
    
    // Only null should not be in required
    expect(schema.required).toEqual(['emptyString', 'zeroNumber', 'falseBoolean', 'emptyArray', 'emptyObject']);
  });

  it('should handle arrays with inconsistent object structures', () => {
    const data = [
      { name: 'John', age: 30 },
      { name: 'Jane', email: 'jane@example.com' },
      { name: 'Bob', age: 25, email: 'bob@example.com', active: true }
    ];
    
    const schema = analyzeJSONStructure(data);
    
    expect(schema.type).toBe('array');
    expect(schema.items!.type).toBe('object');
    
    // Should merge all properties from all objects
    const itemProperties = schema.items!.properties!;
    expect(itemProperties.name.type).toBe('string');
    expect(itemProperties.age.type).toBe('number');
    expect(itemProperties.email.type).toBe('string');
    expect(itemProperties.active.type).toBe('boolean');
    
    // Only name appears in all objects, so it should be the only required field
    expect(schema.items!.required).toEqual(['name']);
  });
});

// Additional edge case tests for TypeScript generation
describe('generateTypeScriptInterface - Edge Cases', () => {
  it('should handle interfaces with reserved TypeScript keywords', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        class: { type: 'string' as const },
        interface: { type: 'string' as const },
        type: { type: 'string' as const },
        function: { type: 'string' as const }
      },
      required: ['class', 'interface']
    };

    const result = generateTypeScriptInterface(schema, {
      format: 'typescript',
      rootTypeName: 'ReservedWords',
      useOptionalFields: true
    });

    // Should handle reserved words as property names
    expect(result.content).toContain('class: string;');
    expect(result.content).toContain('interface: string;');
    expect(result.content).toContain('type?: string;');
    expect(result.content).toContain('function?: string;');
  });

  it('should handle very deep nesting without stack overflow', () => {
    // Create a deeply nested schema
    let currentSchema: any = { type: 'string' };
    for (let i = 0; i < 20; i++) {
      currentSchema = {
        type: 'object',
        properties: {
          [`level${i}`]: currentSchema
        },
        required: [`level${i}`]
      };
    }

    const result = generateTypeScriptInterface(currentSchema, {
      format: 'typescript',
      rootTypeName: 'DeepNesting',
      useOptionalFields: true
    });

    expect(result.content).toContain('interface DeepNesting');
    expect(result.content).toContain('level0: string');
    // Should generate multiple nested interfaces
    expect(result.content.split('interface').length).toBeGreaterThan(10);
  });

  it('should handle empty objects and arrays correctly', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        emptyObject: {
          type: 'object' as const,
          properties: {}
        },
        emptyArray: {
          type: 'array' as const,
          items: { type: 'null' as const }
        }
      }
    };

    const result = generateTypeScriptInterface(schema, {
      format: 'typescript',
      rootTypeName: 'EmptyStructures',
      useOptionalFields: true
    });

    expect(result.content).toContain('emptyObject?: Record<string, unknown>;');
    expect(result.content).toContain('emptyArray?: null[];');
  });
});

// Additional edge case tests for Python generators
describe('Python Generators - Edge Cases', () => {
  it('should handle Python reserved keywords in TypedDict', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        class: { type: 'string' as const },
        def: { type: 'string' as const },
        import: { type: 'string' as const },
        from: { type: 'string' as const }
      }
    };

    const result = generatePythonTypedDict(schema, {
      format: 'python-typeddict',
      rootTypeName: 'ReservedWords',
      useOptionalFields: true
    });

    // Should handle reserved words as field names (they're valid in TypedDict)
    expect(result.content).toContain('class: str');
    expect(result.content).toContain('def: str');
    expect(result.content).toContain('import: str');
    expect(result.content).toContain('from: str');
  });

  it('should handle very large numbers in Python types', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        bigInt: { type: 'number' as const },
        decimal: { type: 'number' as const },
        scientific: { type: 'number' as const }
      }
    };

    const result = generatePythonDataclass(schema, {
      format: 'python-dataclass',
      rootTypeName: 'Numbers',
      useOptionalFields: true
    });

    // All numbers should be float in Python
    expect(result.content).toContain('bigInt: float');
    expect(result.content).toContain('decimal: float');
    expect(result.content).toContain('scientific: float');
  });

  it('should handle complex nested structures in Pydantic', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        users: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              profile: {
                type: 'object' as const,
                properties: {
                  settings: {
                    type: 'object' as const,
                    properties: {
                      theme: { type: 'string' as const },
                      notifications: {
                        type: 'array' as const,
                        items: {
                          type: 'object' as const,
                          properties: {
                            type: { type: 'string' as const },
                            enabled: { type: 'boolean' as const }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const result = generatePydanticModel(schema, {
      format: 'pydantic-v2',
      rootTypeName: 'ComplexApp',
      useOptionalFields: true
    });

    expect(result.content).toContain('class ComplexApp(BaseModel):');
    expect(result.content).toContain('users: list[ComplexAppNested] = Field(default_factory=list)');
    expect(result.content).toContain('from pydantic import BaseModel, Field');
    
    // Should generate multiple nested models
    expect(result.content.split('class ComplexAppNested').length).toBeGreaterThan(1);
  });
});

describe('parseJSONSafely', () => {
  it('should parse valid JSON', () => {
    const result = parseJSONSafely('{"name": "John", "age": 30}');
    
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: 'John', age: 30 });
  });

  it('should handle invalid JSON', () => {
    const result = parseJSONSafely('{"name": "John", age: 30}'); // Missing quotes
    
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it('should handle empty input', () => {
    const result = parseJSONSafely('');
    
    expect(result.error).toBe('Input is empty');
    expect(result.data).toBeNull();
  });

  it('should handle whitespace-only input', () => {
    const result = parseJSONSafely('   ');
    
    expect(result.error).toBe('Input is empty');
    expect(result.data).toBeNull();
  });
});