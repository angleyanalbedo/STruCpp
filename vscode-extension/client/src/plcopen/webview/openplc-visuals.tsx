// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from Autonomy-Logic/openplc-editor graphical-editor visuals.

import React, { type ReactNode } from "react";

type VisualProps = {
  width: number;
  height: number;
  children?: ReactNode;
};

const contactLines = (
  <>
    <line x1="26.75" x2="26.75" y2="28" stroke="currentColor" strokeWidth="1.5" />
    <line x1="0.75" x2="0.75" y2="28" stroke="currentColor" strokeWidth="1.5" />
  </>
);

export function ContactVisual({
  variant,
  width,
  height,
}: VisualProps & { variant: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {contactLines}
      {variant === "negated" && (
        <line
          y1="-0.75"
          x2="26"
          y2="-0.75"
          transform="matrix(0.707107 -0.707107 0.763407 0.645917 5 23.3848)"
          stroke="#0464FB"
          strokeWidth="1.5"
        />
      )}
      {variant === "risingEdge" && (
        <text x="14" y="18" textAnchor="middle" fill="#0464FB" fontSize="12">P</text>
      )}
      {variant === "fallingEdge" && (
        <text x="14" y="18" textAnchor="middle" fill="#0464FB" fontSize="12">N</text>
      )}
    </svg>
  );
}

const coilParentheses = (
  <>
    <path d="M27 0C27.5915 1.20462 28.0845 2.35047 28.5117 3.40818C28.9718 4.4659 29.3333 5.55299 29.6291 6.64008C29.9249 7.75656 30.1549 8.90241 30.2864 10.0777C30.4507 11.2823 30.5164 12.6044 30.5164 14.0147C30.5164 15.4544 30.4507 16.7765 30.2864 17.9517C30.1549 19.1563 29.9249 20.3022 29.6291 21.3893C29.3333 22.4764 28.9718 23.5635 28.5117 24.6212C28.0845 25.6789 27.5915 26.8248 27 28H29.5305C30.9108 25.8258 32.0282 23.5341 32.8169 21.1542C33.6056 18.8038 34 16.4239 34 14.0147C34 11.6348 33.6056 9.25498 32.8169 6.87513C32.0282 4.49528 30.9108 2.20357 29.5305 0H27Z" fill="currentColor" />
    <path d="M7 0C6.40845 1.20462 5.91549 2.35047 5.48826 3.40818C5.02817 4.4659 4.66667 5.55299 4.37089 6.64008C4.07512 7.75656 3.84507 8.90241 3.71361 10.0777C3.5493 11.2823 3.48357 12.6044 3.48357 14.0147C3.48357 15.4544 3.5493 16.7765 3.71361 17.9517C3.84507 19.1563 4.07512 20.3022 4.37089 21.3893C4.66667 22.4764 5.02817 23.5635 5.48826 24.6212C5.91549 25.6789 6.40845 26.8248 7 28H4.46948C3.0892 25.8258 1.97183 23.5341 1.1831 21.1542C0.394366 18.8038 0 16.4239 0 14.0147C0 11.6348 0.394366 9.25498 1.1831 6.87513C1.97183 4.49528 3.0892 2.20357 4.46948 0H7Z" fill="currentColor" />
  </>
);

export function CoilVisual({
  variant,
  width,
  height,
}: VisualProps & { variant: string }) {
  const marker =
    variant === "set" ? "S" :
    variant === "reset" ? "R" :
    variant === "risingEdge" ? "P" :
    variant === "fallingEdge" ? "N" : "";
  return (
    <svg width={width} height={height} viewBox="0 0 34 28" fill="none" aria-hidden="true">
      {coilParentheses}
      {variant === "negated" && (
        <line
          y1="-1"
          x2="20"
          y2="-1"
          transform="matrix(0.707107 -0.707107 0.763407 0.645917 11 21.1426)"
          stroke="#0464FB"
          strokeWidth="2"
        />
      )}
      {marker && <text x="17" y="18" textAnchor="middle" fill="#0464FB" fontSize="12">{marker}</text>}
    </svg>
  );
}

export function BlockVisual({
  name,
  instance,
  inputs,
  outputs,
  width,
  height,
}: VisualProps & {
  name: string;
  instance: string;
  inputs: string[];
  outputs: string[];
}) {
  const rows = Math.max(inputs.length, outputs.length);
  return (
    <div className="openplc-block" style={{ width, height }}>
      {instance && <div className="openplc-instance">{instance}</div>}
      <div className="openplc-block-name">{name}</div>
      {Array.from({ length: rows }, (_, index) => (
        <div className="openplc-block-row" key={index} style={{ top: 26 + index * 40 }}>
          <span>{inputs[index] ?? ""}</span>
          <span>{outputs[index] ?? ""}</span>
        </div>
      ))}
    </div>
  );
}

export function VariableVisual({
  name,
  width,
  height,
}: VisualProps & { name: string }) {
  return (
    <div className="openplc-variable" style={{ width, height }}>
      <span>{name || "..."}</span>
    </div>
  );
}
