import { describe, expect, it } from "vitest";

import { mouseToNdc } from "../src/interaction";

describe("mouseToNdc", () => {
  it("maps the viewport centre to the origin", () => {
    expect(mouseToNdc(400, 300, 800, 600)).toEqual({ x: 0, y: 0 });
  });

  it("maps the corners to the NDC unit square, with Y inverted", () => {
    expect(mouseToNdc(0, 0, 800, 600)).toEqual({ x: -1, y: 1 }); // top-left
    expect(mouseToNdc(800, 600, 800, 600)).toEqual({ x: 1, y: -1 }); // bottom-right
  });
});
