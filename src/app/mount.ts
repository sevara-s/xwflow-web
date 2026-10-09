export interface Disposable {
  destroy(): void;
}

 
export class MountScope {
  private items: Disposable[] = [];

  track<T extends Disposable>(item: T): T {
    this.items.push(item);
    return item;
  }

  host(className?: string): HTMLDivElement {
    const node = document.createElement("div");
    if (className) node.className = className;
    return node;
  }

  destroy(): void {
    const items = this.items.splice(0);
    for (const item of items) {
      item.destroy();
    }
  }
}
