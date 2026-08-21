import { describe, expect, it } from "vitest";
import { withoutServerStack } from "./_core/trpc";

describe("tRPC error privacy", () => {
  it("preserves the permitted error contract while excluding the server stack trace", () => {
    const result = withoutServerStack({
      message: "Please login",
      code: -32001,
      data: {
        code: "UNAUTHORIZED",
        httpStatus: 401,
        stack: "TRPCError: internal filesystem path",
      },
    });

    expect(result).toMatchObject({
      message: "Please login",
      code: -32001,
      data: { code: "UNAUTHORIZED", httpStatus: 401 },
    });
    expect(result.data.stack).toBeUndefined();
  });
});
