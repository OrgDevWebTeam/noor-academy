import { matchRoutes, type RouteObject } from "react-router";
import { describe, expect, it } from "vitest";
import { routes } from "./router";

const leafRoute = (path: string) => matchRoutes(routes, path)?.at(-1)?.route;

function allPaths(list: RouteObject[]): string[] {
  return list.flatMap((route) => [route.path ?? "", ...allPaths(route.children ?? [])]);
}

describe("route table", () => {
  it.each([
    ["/ar/sign-in", "sign-in"],
    ["/en/profiles", "profiles"],
    ["/ar/today", "today"],
    ["/en/parent", "parent"],
    ["/ar/teacher/review", "teacher/review"],
    ["/en/admin/content", "admin/content"],
    ["/ar/maintenance", "maintenance"],
  ])("opens %s", (url, path) => {
    expect(leafRoute(url)?.path).toBe(path);
  });

  it("opens the landing page at the language root", () => {
    expect(leafRoute("/ar")?.index).toBe(true);
    expect(leafRoute("/en")?.index).toBe(true);
  });

  it("sends unknown paths under a language to the catch-all", () => {
    expect(leafRoute("/ar/does/not/exist")?.path).toBe("*");
  });

  it("keeps data out of URLs: the language is the only dynamic segment", () => {
    expect(allPaths(routes).filter((path) => path.includes(":"))).toEqual([":locale"]);
  });
});
