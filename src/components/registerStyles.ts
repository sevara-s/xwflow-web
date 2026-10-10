 
export function registerStyles(componentName: string, css: string): void {
  if (typeof document === "undefined") return;
  const id = `xwui-css-${componentName.toLowerCase()}`;
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}
