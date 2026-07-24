import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { parseGraphicalPouFromString } from "../client/src/plcopen/vendor/openplc-editor/src/frontend/utils/PLC/pou-text-parser";
import { serializeGraphicalPouToString } from "../client/src/plcopen/vendor/openplc-editor/src/frontend/utils/PLC/pou-text-serializer";

const programsDirectory =
  "D:\\source\\Project\\openplc-learn\\trafficlight\\pous\\programs";

const cases = [
  { fileName: "main.ld", language: "ld" },
  { fileName: "Test.ld", language: "ld" },
  { fileName: "fbd1.fbd", language: "fbd" },
] as const;

describe.skipIf(!existsSync(programsDirectory))(
  "vendored OpenPLC graphical POU parser",
  () => {
  it.each(cases)(
    "parses and serializes $fileName with the original OpenPLC implementation",
    ({ fileName, language }) => {
      const source = readFileSync(`${programsDirectory}\\${fileName}`, "utf8");
      const pou = parseGraphicalPouFromString(source, language, "program");

      expect(pou.body.language).toBe(language);
      expect(pou.name).toBe(fileName.replace(/\.(ld|fbd)$/i, ""));
      expect(pou.body.value).toBeTruthy();

      const serialized = serializeGraphicalPouToString(pou);
      const reparsed = parseGraphicalPouFromString(
        serialized,
        language,
        "program",
      );

      expect(reparsed.name).toBe(pou.name);
      expect(reparsed.body.language).toBe(language);
      expect(reparsed.body.value).toEqual(pou.body.value);
      expect(reparsed.interface?.variables).toEqual(pou.interface?.variables);
    },
  );
  },
);
