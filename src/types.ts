declare global {
  namespace JSX {
    interface PropertyNameMap {
      className: "class";
      htmlFor: "for";
    }

    type PropertyName<K> = K extends keyof PropertyNameMap
      ? PropertyNameMap[K]
      : K extends `on${infer E}`
        ? `on${Capitalize<E>}`
        : K;

    interface PropertyTypeMap {
      style: string;
      children: JSX.Children;
    }

    type PropertyType<T, K extends keyof T> = K extends keyof PropertyTypeMap
      ? PropertyTypeMap[K]
      : T[K] extends SVGAnimatedString
        ? string
        : T[K] extends SVGAnimatedLength
          ? string | number
          : T[K] extends SVGAnimatedRect
            ? string
            : T[K];

    export type IntrinsicElements = {
      [Tag in keyof HTMLElementTagNameMap]: {
        [K in keyof HTMLElementTagNameMap[Tag] as PropertyName<K>]?: PropertyType<
          HTMLElementTagNameMap[Tag],
          K
        >;
      };
    } & {
      [Tag in keyof SVGElementTagNameMap]: {
        [K in keyof SVGElementTagNameMap[Tag] as PropertyName<K>]?: PropertyType<
          SVGElementTagNameMap[Tag],
          K
        >;
      };
    };

    export type ComponentProps = { children?: JSX.Children } & Record<
      string,
      unknown
    >;

    export interface Component<P extends ComponentProps = ComponentProps> {
      (props: P): Element;
    }

    export type Element = ChildNode | DocumentFragment;

    export type Node = Element | string | number | boolean | null | undefined;

    export type Children = Node | Children[];
  }
}

export {};
