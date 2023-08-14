import { describe, test, expect, expectTypeOf  } from 'vitest';
import { object, string, number } from '../../schemas/index.ts';
import { minLength } from '../../validations/index.ts';
import { Issue, Issues, parse, safeParse } from '../../index.ts';
import { fallback } from './fallback.ts';

describe('fallback', () => {
  test('should parse normally', () => {
    const schema = fallback(string(), 'world');
    const output = parse(schema, 'hello');
    expect(output).toBe('hello');
    expectTypeOf(output).toEqualTypeOf<string>()
  });

  test('should succeed to parse but return fallback value', () => {
    const schema = fallback(string([minLength(6)]), 'hello world');
    const output = parse(schema, 'hello');
    expect(output).toEqual('hello world');
  });

  test('should succeed, return fallback and issues need to match non-fallback ones', () => {
    const objectSchema = object({
      text: string([minLength(6)]),
      data: number(),
    });

    let issues: any
    const fallbackValue = { text: 'hello world', data: 5 }
    const schema = fallback(objectSchema, fallbackValue, (dataIssues) => { issues = dataIssues });

    const data = { text: 'hello' }
    const output = parse(schema, data);
    expectTypeOf(output).toEqualTypeOf<{ text: string, data: number }>()
    expect(output).toEqual(fallbackValue);

    expect(issues).lengthOf.above(0);
    //expect(issues).toEqual([  ]);

    const result = safeParse(objectSchema, data)
    expect(result.success).toBeFalsy()
    expect((result as any).issues).toEqual(issues)
  });

  test('nested fallback', () => {
    let warnings: any
    const fallbackValue = { text: 'hello world', data: 5 }
    const schema = fallback(object({
      text: fallback(string([minLength(6)]), fallbackValue.text, (dataIssues) => { warnings = dataIssues }),
      data: number(),
    }), fallbackValue,(dataIssues) => { warnings = dataIssues });

    {
      const data = { data: 2 }
      const output = parse(schema, data);
      expect(output).toEqual({ ...data, text: fallbackValue.text });

      expect(warnings).lengthOf.above(0);
      expect(warnings).toHaveLength(1);
      //expect(issues).toEqual([  ]);
    }

    warnings = []
    {
      const output = parse(schema, {});
      expect(output).toEqual(fallbackValue);

      expect(warnings).lengthOf.above(0);
      expect(warnings).toHaveLength(1);
    }
  });

  test('collect warnings', () => {
    const warnings: Issue[] = []
    const collect = (issues: Issues) => issues.forEach(value => warnings.push(value)) 

    const fallbackValue = { text: 'hello world', data: 5 }
    const schema = fallback(object({
      text: fallback(string([minLength(6)]), fallbackValue.text, collect),
      data: number(),
    }), fallbackValue, collect);

    {
      const data = { data: 2 }
      const output = parse(schema, data);
      expect(output).toEqual({ ...data, text: fallbackValue.text });
      console.log(warnings)
      console.log(warnings[0].path)
    }

    {
      const output = parse(schema, {});
      expect(output).toEqual(fallbackValue);
      console.log(warnings)
    }

    expect(warnings).toHaveLength(3);
  });
});
