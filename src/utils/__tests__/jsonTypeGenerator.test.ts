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