import { render, screen } from "@testing-library/react";
import { PagePlaceholder } from "./PagePlaceholder";

describe("PagePlaceholder", () => {
  it("renders the given title and description", () => {
    render(<PagePlaceholder title="Test title" description="Test description" />);

    expect(screen.getByText("Test title")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });
});
