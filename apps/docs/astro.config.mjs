import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import siteConfig from "./scripts/site.config.mjs";

const repositoryFullName =
  process.env.SITE_REPOSITORY ??
  process.env.GITHUB_REPOSITORY ??
  siteConfig.defaultRepository;
const [repositoryOwner, repositoryName] = repositoryFullName.split("/");
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true";
const site = process.env.SITE_URL ?? `https://${repositoryOwner}.github.io`;
const base =
  process.env.SITE_BASE_PATH ??
  (isGitHubPagesBuild && repositoryName ? `/${repositoryName}` : undefined);

export default defineConfig({
  site,
  base,
  integrations: [
    starlight({
      title: siteConfig.title,
      description: siteConfig.description,
      disable404Route: true,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: `https://github.com/${repositoryFullName}`,
        },
      ],
      sidebar: [
        { label: "Home", slug: "index" },
        {
          label: "Getting started",
          items: siteConfig.sidebar.guides,
        },
        {
          label: "Reference",
          items: [
            {
              label: "Packages",
              autogenerate: { directory: "packages" },
            },
            {
              label: "Runtimes",
              autogenerate: { directory: "runtimes" },
            },
            {
              label: "Examples",
              autogenerate: { directory: "examples" },
            },
          ],
        },
        {
          label: "Project",
          items: [
            { label: "About", slug: "project/about" },
            { label: "Docs map", slug: "project/docs-map" },
            { label: "License", slug: "project/license" },
          ],
        },
      ],
    }),
  ],
});
