import { describe, expect, it } from "vitest";
import { toJsonLdScript } from "@shared/utils/json-ld";

describe("toJsonLdScript", () => {
  it("produces valid JSON that round-trips through JSON.parse", () => {
    const data = { "@type": "Product", name: "Кронштейн" };
    expect(JSON.parse(toJsonLdScript(data))).toEqual(data);
  });

  it("escapes a literal </script> so it can't prematurely close the containing script tag", () => {
    const data = { name: "Model</script><script>alert(1)</script>" };
    const serialized = toJsonLdScript(data);

    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c");
    // The escape must still round-trip back to the original string for
    // whatever parses the structured data (search engines, JSON.parse).
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
