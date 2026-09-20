/**
 * @jest-environment node
 *
 * Route handlers rely on the Web Fetch API (Request/Response), which
 * jsdom does not provide but Node's own runtime does.
 */
import { GET } from "./route";

describe("GET /api/health", () => {
  it("responds with an ok status", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("site-report-web");
  });
});
