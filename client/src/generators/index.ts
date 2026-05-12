import { typescriptGenerator } from './typescript';
import { javascriptGenerator } from './javascript';
import { pythonGenerator } from './python';
import { phpGenerator } from './php';
import { goGenerator } from './go';
import { rubyGenerator } from './ruby';
import { javaGenerator } from './java';
import { csharpGenerator } from './csharp';
import { kotlinGenerator } from './kotlin';
import { swiftGenerator } from './swift';
import { shellGenerator } from './shell';
import { httpGenerator } from './http';
import { powershellGenerator } from './powershell';
import { rGenerator } from './r';
import { jsonConfigGenerator } from './json-config';
import { cGenerator } from './c';
import { cppGenerator } from './cpp';
import { objcGenerator } from './objc';
import { ocamlGenerator } from './ocaml';
import { clojureGenerator } from './clojure';

export type { LanguageGenerator, ExportConfig, ExportApp, ExportTemplate, GeneratedFile } from './types';

export const generators = [
  typescriptGenerator,
  javascriptGenerator,
  pythonGenerator,
  phpGenerator,
  goGenerator,
  rubyGenerator,
  javaGenerator,
  csharpGenerator,
  kotlinGenerator,
  swiftGenerator,
  shellGenerator,
  httpGenerator,
  powershellGenerator,
  rGenerator,
  jsonConfigGenerator,
  cGenerator,
  cppGenerator,
  objcGenerator,
  ocamlGenerator,
  clojureGenerator,
];

export const generatorMap = Object.fromEntries(generators.map((g) => [g.id, g]));
