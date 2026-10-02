import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("renders the Clauble shell and status link", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Clauble" })).toBeInTheDocument();
    expect(screen.getByText("Public Discovery")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});
