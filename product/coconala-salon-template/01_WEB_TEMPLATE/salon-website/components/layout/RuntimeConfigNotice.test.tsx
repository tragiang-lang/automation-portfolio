import { render, screen } from "@testing-library/react";
import { RuntimeConfigNotice } from "./RuntimeConfigNotice";

describe("RuntimeConfigNotice", () => {
  it("renders nothing when show is false", () => {
    const { container } = render(<RuntimeConfigNotice show={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a calm Japanese notice when show is true", () => {
    render(<RuntimeConfigNotice show={true} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "現在、最新の店舗情報を取得できませんでした。表示中の内容が実際と異なる場合がございます。",
    );
  });
});
