// SPDX-License-Identifier: GPL-3.0-or-later

export const generateNumericUUID = (): string => {
  const bytes = crypto.getRandomValues(new Uint32Array(2));
  return `${bytes[0]}${bytes[1]}`;
};
