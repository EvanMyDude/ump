export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  parent?: HTMLElement,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  parent?.appendChild(node);
  return node;
}

export const formatInches = (inches: number): string => `${Math.abs(inches).toFixed(1)} in`;

export const formatHeight = (feet: number): string => {
  const totalIn = Math.round(feet * 12);
  return `${Math.floor(totalIn / 12)}'${totalIn % 12}"`;
};
