import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

import { AnalyticsGate } from "../analytics-gate";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("AnalyticsGate", () => {
  it("nas páginas normais mostra o analytics", () => {
    usePathname.mockReturnValue("/loja");
    render(
      <AnalyticsGate>
        <p>analytics</p>
      </AnalyticsGate>
    );
    expect(screen.getByText("analytics")).toBeTruthy();
  });

  it("na página do pedido (a URL leva a chave de acesso) não carrega o analytics", () => {
    usePathname.mockReturnValue("/pedido/11111111-2222-4333-8444-555555555555");
    render(
      <AnalyticsGate>
        <p>analytics</p>
      </AnalyticsGate>
    );
    expect(screen.queryByText("analytics")).toBeNull();
  });
});
