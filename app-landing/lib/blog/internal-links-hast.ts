export interface HastNodeBase {
  type: string;
}

export interface HastText extends HastNodeBase {
  type: "text";
  value: string;
}

export interface HastElement extends HastNodeBase {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children: HastNode[];
}

export interface HastRoot extends HastNodeBase {
  type: "root";
  children: HastNode[];
}

interface HastUnknownNode extends HastNodeBase {
  [key: string]: unknown;
}

export type HastNode = HastText | HastElement | HastRoot | HastUnknownNode;
