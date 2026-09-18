import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerInfoForm, validateCustomerFields } from "./CustomerInfoForm";

const values = { name: "", email: "", phone: "", notes: "" };

describe("CustomerInfoForm", () => {
  it("renders name/email/phone/notes fields with Japanese labels", () => {
    render(<CustomerInfoForm values={values} errors={{}} onChange={jest.fn()} onBlur={jest.fn()} />);
    expect(screen.getByLabelText(/お名前/)).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(screen.getByLabelText(/電話番号/)).toBeInTheDocument();
    expect(screen.getByLabelText(/備考/)).toBeInTheDocument();
  });

  it("calls onChange as the customer types", async () => {
    const onChange = jest.fn();
    render(<CustomerInfoForm values={values} errors={{}} onChange={onChange} onBlur={jest.fn()} />);
    await userEvent.type(screen.getByLabelText(/お名前/), "山");
    expect(onChange).toHaveBeenCalledWith("name", "山");
  });

  it("shows a field error when present", () => {
    render(
      <CustomerInfoForm
        values={values}
        errors={{ email: "メールアドレスの形式をご確認ください。" }}
        onChange={jest.fn()}
        onBlur={jest.fn()}
      />,
    );
    expect(screen.getByText("メールアドレスの形式をご確認ください。")).toBeInTheDocument();
  });
});

describe("validateCustomerFields", () => {
  it("requires name and email", () => {
    const errors = validateCustomerFields({ name: "", email: "", phone: "", notes: "" });
    expect(errors.name).toBe("お名前を入力してください。");
    expect(errors.email).toBe("メールアドレスを入力してください。");
  });

  it("rejects a malformed email", () => {
    const errors = validateCustomerFields({ name: "山田太郎", email: "not-an-email", phone: "", notes: "" });
    expect(errors.email).toBe("メールアドレスの形式をご確認ください。");
  });

  it("accepts a valid minimal submission (phone/notes optional)", () => {
    const errors = validateCustomerFields({ name: "山田太郎", email: "yamada@example.com", phone: "", notes: "" });
    expect(errors).toEqual({});
  });
});
