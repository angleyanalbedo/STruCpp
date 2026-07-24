// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Autonomy / OpenPLC Project
/**
 * Wrapper around xml2st.exe subprocess for PLCopen XML ↔ ST conversion.
 */

import * as vscode from "vscode";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

export interface Xml2StResult {
  success: boolean;
  stContent: string;
  errors: string[];
}

export class Xml2StWrapper {
  private xml2stPath: string | null = null;
  private outputChannel: vscode.OutputChannel;

  constructor(private context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel("STruC++ xml2st");
    this.xml2stPath = this.resolveXml2stPath();
  }

  /**
   * Resolve the path to xml2st.exe.
   * Priority: user config → known OpenPLC install locations → PATH
   */
  private resolveXml2stPath(): string | null {
    // 1. Check user configuration
    const config = vscode.workspace.getConfiguration("strucpp");
    const configuredPath = config.get<string>("xml2stPath", "");
    if (configuredPath && fs.existsSync(configuredPath)) {
      return configuredPath;
    }

    // 2. Check known OpenPLC Editor install locations
    const isWindows = process.platform === "win32";

    const knownPaths: string[] = isWindows
      ? [
          "C:\\Program Files\\OpenPLC Editor\\resources\\bin\\xml2st.exe",
          "C:\\Program Files (x86)\\OpenPLC Editor\\resources\\bin\\xml2st.exe",
          `${process.env.LOCALAPPDATA ?? ""}\\Programs\\open-plc-editor\\resources\\bin\\xml2st.exe`,
        ]
      : [
          "/usr/local/bin/xml2st",
          "/usr/bin/xml2st",
          `${process.env.HOME ?? ""}/.local/bin/xml2st`,
        ];

    for (const p of knownPaths) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }

    // 3. Fall back to binary name (let execFile find it in PATH)
    const binaryName = isWindows ? "xml2st.exe" : "xml2st";
    return binaryName;
  }

  /**
   * Convert PLCopen XML content to Structured Text.
   * xml2st expects a file path, so we write to a temp file first.
   */
  async convertXmlToSt(
    xmlContent: string,
    keepStructs = true,
  ): Promise<Xml2StResult> {
    if (!this.xml2stPath) {
      return {
        success: false,
        stContent: "",
        errors: [
          "xml2st not found. Set strucpp.xml2stPath in settings or install OpenPLC Editor.",
        ],
      };
    }

    // Write XML to a temp file (xml2st requires a file path)
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "strucpp-xml2st-"));
    const tmpXmlPath = path.join(tmpDir, "input.plcopen");
    const tmpStPath = path.join(tmpDir, "output.st");

    try {
      fs.writeFileSync(tmpXmlPath, xmlContent, "utf-8");

      const args = ["--generate-st"];
      if (keepStructs) {
        args.push("--keep-structs");
      }
      args.push(tmpXmlPath);

      this.outputChannel.appendLine(`Running: ${this.xml2stPath} ${args.join(" ")}`);

      const { stdout, stderr } = await execFile(this.xml2stPath, args, {
        timeout: 30_000,
        encoding: "utf-8",
      });

      if (stderr) {
        this.outputChannel.appendLine(`xml2st warnings: ${stderr}`);
      }

      // xml2st writes the ST output to the same directory as input
      // Check for generated .st file
      let stContent = stdout;
      if (fs.existsSync(tmpStPath)) {
        stContent = fs.readFileSync(tmpStPath, "utf-8");
      } else {
        // xml2st may output to stdout instead
        // If stdout is empty, the conversion may have failed
        if (!stContent.trim()) {
          return {
            success: false,
            stContent: "",
            errors: ["xml2st produced no output. Check the XML format."],
          };
        }
      }

      return {
        success: true,
        stContent,
        errors: [],
      };
    } catch (err: unknown) {
      const execErr = err as { stderr?: string; stdout?: string; message?: string };
      const errorMsg = execErr.stderr ?? execErr.message ?? "xml2st execution failed";
      this.outputChannel.appendLine(`xml2st error: ${errorMsg}`);

      return {
        success: false,
        stContent: execErr.stdout ?? "",
        errors: [errorMsg],
      };
    } finally {
      // Cleanup temp directory
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Convert Structured Text content back to PLCopen XML (if supported).
   * Note: xml2st does not currently support reverse conversion.
   */
  async convertStToXml(_stContent: string): Promise<Xml2StResult> {
    return {
      success: false,
      stContent: "",
      errors: ["ST → XML conversion is not yet supported by xml2st."],
    };
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
