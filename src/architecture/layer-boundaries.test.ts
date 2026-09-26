import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({
  overrideConfigFile: 'eslint.config.ts',
  overrideConfig: {
    files: ['src/*/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['src/*/*.ts'] },
      },
    },
  },
});

const restrictedImportMessages = async (
  filePath: string,
  source: string,
): Promise<readonly string[]> => {
  const [result] = await eslint.lintText(source, { filePath });

  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.message);
};

describe('layer import boundaries', () => {
  // Lints four fixtures with the type-aware ESLint config: several seconds, more under a loaded run.
  it('allows dependencies within a layer, approved lower layers, and npm packages', async () => {
    const [domain, application, simulation, infrastructure] = await Promise.all([
      restrictedImportMessages(
        'src/domain/fixture.ts',
        "import './level-document'; import { z } from 'zod'; import '@scope/app/ui'; void z;",
      ),
      restrictedImportMessages(
        'src/application/fixture.ts',
        "import '../domain/level-document'; import './history';",
      ),
      restrictedImportMessages(
        'src/simulation/fixture.ts',
        "import '../domain/level-document'; import './fixed-step';",
      ),
      restrictedImportMessages(
        'src/infrastructure/fixture.ts',
        "import '../domain/level-document'; import '../application/ports';",
      ),
    ]);

    expect(domain).toEqual([]);
    expect(application).toEqual([]);
    expect(simulation).toEqual([]);
    expect(infrastructure).toEqual([]);
  }, 30_000);

  it('rejects forbidden relative imports from every guarded layer', async () => {
    const cases = [
      ['src/domain/fixture.ts', "import '../application/use-case'; import '../../ui/view';"],
      ['src/application/fixture.ts', "import '../app/App'; import '../presentation/scene';"],
      [
        'src/simulation/fixture.ts',
        "import '../application/use-case'; import '../infrastructure/store';",
      ],
      ['src/infrastructure/fixture.ts', "import '../app/App'; import '../presentation/scene';"],
    ] as const;

    const messages = await Promise.all(
      cases.map(([filePath, source]) => restrictedImportMessages(filePath, source)),
    );

    expect(messages.flat()).toHaveLength(8);
  });

  it('rejects the same forbidden layers through supported project aliases', async () => {
    const cases = [
      ['src/domain/fixture.ts', "import '@/application/use-case'; import '@ui/view';"],
      ['src/application/fixture.ts', "import '~/app/App'; import '#presentation/scene';"],
      [
        'src/simulation/fixture.ts',
        "import '@/application/use-case'; import '@infrastructure/store';",
      ],
      ['src/infrastructure/fixture.ts', "import '~/app/App'; import '@presentation/scene';"],
    ] as const;

    const messages = await Promise.all(
      cases.map(([filePath, source]) => restrictedImportMessages(filePath, source)),
    );

    expect(messages.flat()).toHaveLength(8);
  });
});
