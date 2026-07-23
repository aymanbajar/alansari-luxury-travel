import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("uses the raw status as a fallback for unknown statuses", () => {
    render(<StatusBadge status="CUSTOM_STATUS" />);

    expect(screen.getByText("CUSTOM_STATUS")).toBeTruthy();
  });
});
